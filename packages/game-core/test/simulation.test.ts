import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignCat,
  continueAfterFinale,
  createState,
  deserializeState,
  dispatchSquadToMission,
  drainEvents,
  equipItem,
  getAchievements,
  getEquipmentSelection,
  getRaidOptions,
  getSquadCleanupEstimate,
  GameCore,
  hasPendingEquipment,
  resolveNinthLife,
  resolveRaidDecision,
  resolveRaidFollowup,
  returnSquadToBase,
  selectResearch,
  serializeState,
  setSquadAutoDispatch,
  setSquadStyle,
  successfulCleanups,
  tick,
} from '../src/simulation.ts'

test('GameCore owns the live state and exposes isolated snapshots', () => {
  const core = new GameCore()
  const snapshot = core.snapshot()
  snapshot.fame = 999
  snapshot.cats[0].name = 'mutated outside core'

  const unchanged = core.snapshot()
  assert.notEqual(unchanged.fame, 999)
  assert.notEqual(unchanged.cats[0].name, 'mutated outside core')
  assert.equal(core.dispatch({ type: 'set_speed', speed: 5 }), true)
  assert.equal(core.snapshot().speed, 5)
})

test('GameCore accepts a fresh-game cat assignment command', () => {
  const core = new GameCore()
  assert.equal(core.dispatch({ type: 'assign_cat', catId: 'pixel', squadId: 'alpha' }), true)
  const snapshot = core.snapshot()
  assert.equal(snapshot.cats.find(cat => cat.id === 'pixel')?.assignedTo, 'alpha')
  assert.deepEqual(snapshot.squads.find(squad => squad.id === 'alpha')?.members, ['pixel'])
})

test('cleanup estimate combines cats, traits and equipment into work rate', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  equipItem(state, 'pixel', 'hands', 'toolkit')
  const estimate = getSquadCleanupEstimate(state, state.squads[0])

  assert.equal(estimate.members, 1)
  assert.equal(estimate.baseRate, 1)
  assert.equal(estimate.traitRate, 0.05)
  assert.equal(estimate.equipmentRate, 0.12)
  assert.ok(Math.abs(estimate.totalRate - 1.17) < 1e-9)
  assert.ok(Math.abs(estimate.seconds - 30 / 1.17) < 1e-9)
  assert.ok(Math.abs(estimate.energyPerCat - 20 / 1.17) < 1e-9)
})

test('five equally productive cats clean five times faster, split fatigue and continue', () => {
  const state = createState()
  const catIds = ['marlowe', 'pixel', 'rust', 'shorokh', 'bastion']
  for (const catId of catIds) {
    const cat = state.cats.find(candidate => candidate.id === catId)!
    cat.cleanupTrait = 0
    assignCat(state, catId, 'alpha')
  }
  const squad = state.squads[0]
  const completedMission = state.missions[0]
  const energyBefore = Object.fromEntries(state.cats.map(cat => [cat.id, cat.energy]))
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'mission.a', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadId = squad.id
  state.raidTriggered = true
  state.speed = 1

  assert.equal(getSquadCleanupEstimate(state, squad).seconds, 6)
  tick(state, 6)

  assert.equal(squad.completed, 1)
  assert.equal(squad.phase, 'outbound')
  assert.equal(completedMission.status, 'completed')
  assert.equal(state.missions.includes(completedMission), false)
  for (const catId of catIds) {
    const cat = state.cats.find(candidate => candidate.id === catId)!
    assert.ok(Math.abs(cat.energy - (energyBefore[catId] - 4)) < 1e-9)
  }
})

test('squad size changes cleanup time but not travel time', () => {
  const solo = createState()
  assignCat(solo, 'marlowe', 'alpha')
  solo.speed = 1
  tick(solo, 0.25)

  const group = createState()
  for (const catId of ['marlowe', 'pixel', 'rust', 'shorokh', 'bastion']) assignCat(group, catId, 'alpha')
  group.speed = 1
  tick(group, 0.25)

  assert.equal(solo.squads[0].target?.id, group.squads[0].target?.id)
  assert.equal(solo.squads[0].travelDuration, group.squads[0].travelDuration)
  assert.ok(getSquadCleanupEstimate(group, group.squads[0]).seconds < getSquadCleanupEstimate(solo, solo.squads[0]).seconds / 4)
})

test('an auto squad chains a priority mission nearest to its current position', () => {
  const state = createState()
  state.raidTriggered = true
  assignCat(state, 'pixel', 'alpha')
  const squad = state.squads[0]
  const current = { id: 'current', title: 'mission.a', x: 20, y: 20, priority: 1, status: 'assigned' as const, squadId: squad.id }
  const farther = { id: 'farther', title: 'mission.b', x: 80, y: 80, priority: 2, status: 'available' as const }
  const nearby = { id: 'nearby', title: 'mission.c', x: 24, y: 20, priority: 2, status: 'available' as const }
  state.missions = [current, farther, nearby]
  squad.phase = 'cleanup'
  squad.missionId = current.id
  squad.target = { id: current.id, title: current.title, x: current.x, y: current.y, priority: current.priority }
  squad.progress = 29
  state.speed = 1

  tick(state, 1)

  assert.equal(squad.completed, 1)
  assert.equal(squad.phase, 'outbound')
  assert.equal(squad.missionId, nearby.id)
  assert.deepEqual(squad.routeFrom, { x: current.x, y: current.y })
  assert.equal(squad.travelDuration, 2)
  assert.equal(state.missions.some(mission => mission.id === current.id), false)
  assert.equal(nearby.status, 'assigned')
})

test('a tired field squad preserves the trip home and sleeps after returning', () => {
  const state = createState()
  state.raidTriggered = true
  assignCat(state, 'pixel', 'alpha')
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  const squad = state.squads[0]
  const current = state.missions[0]
  current.status = 'assigned'
  current.squadId = squad.id
  squad.phase = 'cleanup'
  squad.missionId = current.id
  squad.target = { id: current.id, title: current.title, x: current.x, y: current.y, priority: current.priority }
  squad.progress = 29
  pixel.energy = 23
  state.speed = 1

  tick(state, 1)

  assert.equal(squad.phase, 'returning')
  assert.equal(squad.restAfterReturn, true)
  const energyBeforeReturn = pixel.energy
  tick(state, squad.travelDuration)

  assert.equal(squad.phase, 'base')
  assert.equal(squad.restAfterReturn, false)
  assert.equal(pixel.sleeping, true)
  assert.ok(pixel.energy < energyBeforeReturn)
})

test('a squad with auto-deploy disabled waits at base', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  assert.equal(setSquadAutoDispatch(state, 'alpha', false), true)
  state.speed = 1

  tick(state, 1)

  assert.equal(state.squads[0].phase, 'base')
  assert.equal(state.squads[0].missionId, undefined)
  assert.equal(state.missions.every(mission => mission.status === 'available'), true)
})

test('manual dispatch assigns the selected mission to a ready manual squad', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  setSquadAutoDispatch(state, 'alpha', false)
  const selectedMission = state.missions[1]

  assert.equal(dispatchSquadToMission(state, 'alpha', selectedMission.id), true)
  assert.equal(state.squads[0].phase, 'outbound')
  assert.equal(state.squads[0].missionId, selectedMission.id)
  assert.equal(selectedMission.status, 'assigned')
  assert.equal(dispatchSquadToMission(state, 'bravo', state.missions[0].id), false)
})

test('a manual squad waits in the field and accepts its next mission there', () => {
  const state = createState()
  state.raidTriggered = true
  assignCat(state, 'pixel', 'alpha')
  setSquadAutoDispatch(state, 'alpha', false)
  const squad = state.squads[0]
  const completedMission = state.missions[0]
  completedMission.status = 'assigned'
  completedMission.squadId = squad.id
  squad.phase = 'cleanup'
  squad.missionId = completedMission.id
  squad.target = { ...completedMission }
  squad.progress = 29
  state.speed = 1

  tick(state, 1)

  assert.equal(squad.phase, 'field')
  assert.equal(squad.missionId, undefined)
  assert.equal(squad.target, undefined)
  assert.deepEqual(squad.routeFrom, { x: completedMission.x, y: completedMission.y })
  assert.equal(state.missions.includes(completedMission), false)

  const nextMission = state.missions.find(mission => mission.status === 'available')!
  assert.equal(dispatchSquadToMission(state, squad.id, nextMission.id), true)
  assert.equal(squad.phase, 'outbound')
  assert.equal(squad.missionId, nextMission.id)
  assert.deepEqual(squad.routeFrom, { x: completedMission.x, y: completedMission.y })
})

test('the player can order an idle field squad back to base', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  setSquadAutoDispatch(state, 'alpha', false)
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  const squad = state.squads[0]
  squad.phase = 'field'
  squad.routeFrom = { x: 30, y: 30 }

  assert.equal(returnSquadToBase(state, squad.id), true)
  assert.equal(squad.phase, 'returning')
  assert.equal(squad.restAfterReturn, false)
  state.speed = 1
  tick(state, squad.travelDuration)

  assert.equal(squad.phase, 'base')
  assert.equal(pixel.sleeping, false)
  assert.equal(returnSquadToBase(state, squad.id), false)
})

test('a manual field squad returns automatically when no available mission is safe', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  setSquadAutoDispatch(state, 'alpha', false)
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  const squad = state.squads[0]
  squad.phase = 'field'
  squad.routeFrom = { x: 50, y: 51 }
  pixel.energy = 23
  state.speed = 1

  tick(state, 0.25)

  assert.equal(squad.phase, 'returning')
  assert.equal(squad.restAfterReturn, true)
  tick(state, squad.travelDuration)
  assert.equal(squad.phase, 'base')
  assert.equal(pixel.sleeping, true)
})

test('disabling auto-deploy in the field holds the squad after it returns', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  state.speed = 1
  tick(state, 0.25)
  const squad = state.squads[0]
  assert.equal(squad.phase, 'outbound')

  assert.equal(setSquadAutoDispatch(state, squad.id, false), true)
  assert.equal(state.speed, 1)
  squad.phase = 'returning'
  squad.travel = squad.travelDuration
  tick(state, 0.25)
  tick(state, 0.25)

  assert.equal(squad.phase, 'base')
  assert.equal(squad.missionId, undefined)
})

function openRaid() {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const squad = state.squads[0]
  squad.completed = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadId = squad.id
  squad.progress = 14
  state.speed = 1
  tick(state, 1)
  assert.ok(state.incident)
  return state
}

function finishThirdCleanup() {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  state.raidTriggered = true
  state.fame = 30
  const squad = state.squads[0]
  squad.completed = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadId = squad.id
  squad.progress = 29
  state.speed = 1
  tick(state, 1)
  return state
}

test('a cat can be removed from a squad while it is at base', () => {
  const state = createState()
  assert.equal(assignCat(state, 'pixel', 'alpha'), true)
  assert.equal(assignCat(state, 'pixel', ''), true)
  assert.equal(state.cats.find(cat => cat.id === 'pixel')?.assignedTo, undefined)
  assert.deepEqual(state.squads[0].members, [])
  assert.equal(state.speed, 0)
})

test('an exhausted cat ignores work orders until reaching fifty energy', () => {
  const state = createState()
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  pixel.energy = 20

  assert.equal(assignCat(state, pixel.id, 'alpha'), false)
  assert.equal(pixel.sleeping, true)
  assert.equal(pixel.assignedTo, undefined)

  pixel.energy = 49
  assert.equal(assignCat(state, pixel.id, 'alpha'), false)
  assert.equal(pixel.sleeping, true)

  pixel.energy = 50
  assert.equal(assignCat(state, pixel.id, 'alpha'), true)
  assert.equal(pixel.sleeping, false)
  assert.equal(pixel.assignedTo, 'alpha')
})

test('a sleeping cat without orders sleeps past fifty and wakes at one hundred', () => {
  const state = createState()
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  pixel.energy = 20
  pixel.sleeping = true
  state.speed = 1

  tick(state, 30)
  assert.equal(pixel.energy, 50)
  assert.equal(pixel.sleeping, true)

  tick(state, 50)
  assert.equal(pixel.energy, 100)
  assert.equal(pixel.sleeping, false)
})

test('an available squad mission wakes a sleeping member at fifty', () => {
  const state = createState()
  assert.equal(assignCat(state, 'pixel', 'alpha'), true)
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  pixel.energy = 20
  pixel.sleeping = true
  state.speed = 1

  tick(state, 29)
  assert.equal(pixel.energy, 49)
  assert.equal(pixel.sleeping, true)
  assert.equal(state.squads[0].phase, 'base')

  tick(state, 1)
  assert.equal(pixel.energy, 50)
  assert.equal(pixel.sleeping, false)
  assert.equal(state.squads[0].phase, 'outbound')
})

test('an awake cat keeps taking missions until exhausted and then sleeps', () => {
  const state = createState()
  state.raidTriggered = true
  assert.equal(assignCat(state, 'marlowe', 'alpha'), true)
  const marlowe = state.cats.find(cat => cat.id === 'marlowe')!
  marlowe.energy = 50
  state.speed = 1

  for (let step = 0; step < 2_000; step++) {
    tick(state, 0.25)
    if (state.squads[0].completed >= 2 && state.squads[0].phase === 'base' && marlowe.sleeping) break
  }

  assert.equal(state.squads[0].completed, 2)
  assert.ok(marlowe.energy <= 20)
  assert.equal(marlowe.sleeping, true)
})

test('an active research order wakes a sleeping specialist at fifty', () => {
  const state = createState()
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  pixel.energy = 20
  pixel.sleeping = true
  for (const cat of state.cats) {
    if (cat.id !== pixel.id) cat.energy = 40
  }
  state.scrap = 20
  assert.equal(selectResearch(state, 'field_scanners'), true)
  assert.equal(state.research.workerCatId, undefined)
  state.speed = 1

  tick(state, 30)
  assert.equal(pixel.energy, 50)
  assert.equal(pixel.sleeping, true)

  tick(state, 0.25)
  assert.equal(pixel.sleeping, false)
  assert.equal(state.research.workerCatId, pixel.id)
  assert.ok(state.research.nodes.field_scanners.progress > 0)
})

test('open achievements unlock once and stay completed', () => {
  const state = createState()
  assert.equal(getAchievements(state).filter(achievement => achievement.completed).length, 0)

  assignCat(state, 'pixel', 'alpha')
  assert.equal(getAchievements(state).find(achievement => achievement.id === 'first_squad')?.completed, true)
  assignCat(state, 'pixel', '')
  assert.equal(getAchievements(state).find(achievement => achievement.id === 'first_squad')?.completed, true)

  equipItem(state, 'pixel', 'hands', 'toolkit')
  equipItem(state, 'pixel', 'hands')
  assert.equal(getAchievements(state).find(achievement => achievement.id === 'field_kit')?.completed, true)

  selectResearch(state, 'field_scanners')
  selectResearch(state)
  assert.equal(getAchievements(state).find(achievement => achievement.id === 'research_started')?.completed, true)
  assert.equal(new Set(state.achievements.completedIds).size, state.achievements.completedIds.length)
})

test('field equipment is reserved and applied after the squad returns', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  const squad = state.squads[0]
  const mission = state.missions[0]
  mission.status = 'assigned'
  mission.squadId = squad.id
  squad.phase = 'cleanup'
  squad.missionId = mission.id
  squad.target = { ...mission }
  squad.progress = 29
  state.raidTriggered = true
  state.speed = 5

  assert.equal(equipItem(state, pixel.id, 'hands', 'toolkit'), true)
  assert.equal(state.speed, 5)
  assert.equal(pixel.equipment.hands, undefined)
  assert.equal(getEquipmentSelection(pixel, 'hands'), 'toolkit')
  assert.equal(hasPendingEquipment(pixel, 'hands'), true)
  assert.equal(state.inventory.toolkit, 0)
  assert.equal(getSquadCleanupEstimate(state, squad).equipmentRate, 0)

  tick(state, 1)
  assert.equal(squad.phase, 'returning')
  tick(state, squad.travelDuration)

  assert.equal(squad.phase, 'base')
  assert.equal(pixel.equipment.hands, 'toolkit')
  assert.equal(hasPendingEquipment(pixel), false)
  assert.equal(state.inventory.toolkit, 0)
  assert.ok(getSquadCleanupEstimate(state, squad).equipmentRate > 0)
})

test('equipment queued during outbound travel is shown immediately and waits for mission completion', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  const squad = state.squads[0]
  const mission = state.missions[0]
  mission.status = 'assigned'
  mission.squadId = squad.id
  squad.phase = 'outbound'
  squad.missionId = mission.id
  squad.target = { ...mission }
  squad.travelDuration = 10
  squad.travel = 0
  state.speed = 1

  assert.equal(equipItem(state, pixel.id, 'hands', 'toolkit'), true)
  assert.equal(getEquipmentSelection(pixel, 'hands'), 'toolkit')
  assert.equal(pixel.equipment.hands, undefined)
  assert.equal(squad.phase, 'outbound')

  tick(state, 10)
  assert.equal(squad.phase, 'cleanup')
  tick(state, 30)
  tick(state, squad.travelDuration)
  assert.equal(squad.phase, 'base')
  assert.equal(pixel.equipment.hands, 'toolkit')
  assert.equal(hasPendingEquipment(pixel), false)
})

test('roster and equipment changes never alter the selected game speed', () => {
  const state = createState()
  state.speed = 10

  assert.equal(assignCat(state, 'pixel', 'alpha'), true)
  assert.equal(setSquadStyle(state, 'alpha', 'risky'), true)
  assert.equal(setSquadAutoDispatch(state, 'alpha', false), true)
  assert.equal(equipItem(state, 'pixel', 'hands', 'toolkit'), true)

  assert.equal(state.speed, 10)
})

test('replacing and canceling deferred equipment releases its reservation', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  const squad = state.squads[0]
  squad.phase = 'field'
  squad.routeFrom = { x: 30, y: 30 }

  assert.equal(equipItem(state, pixel.id, 'belt', 'headset'), true)
  assert.equal(squad.phase, 'returning')
  assert.equal(state.inventory.headset, 0)
  const restoredQueuedState = deserializeState(serializeState(state))
  const restoredPixel = restoredQueuedState.cats.find(cat => cat.id === pixel.id)!
  assert.equal(getEquipmentSelection(restoredPixel, 'belt'), 'headset')
  assert.equal(restoredQueuedState.inventory.headset, 0)
  assert.equal(equipItem(state, pixel.id, 'belt', 'medkit'), true)
  assert.equal(state.inventory.headset, 1)
  assert.equal(state.inventory.medkit, 0)
  assert.equal(getEquipmentSelection(pixel, 'belt'), 'medkit')

  assert.equal(equipItem(state, pixel.id, 'belt'), true)
  assert.equal(state.inventory.medkit, 1)
  assert.equal(getEquipmentSelection(pixel, 'belt'), undefined)
  assert.equal(hasPendingEquipment(pixel), false)
})

test('an HMR-preserved pre-queue state can use and save deferred equipment', () => {
  const state = createState()
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  delete (pixel as unknown as Record<string, unknown>).pendingEquipment
  assert.equal(hasPendingEquipment(pixel), false)

  assignCat(state, pixel.id, 'alpha')
  state.squads[0].phase = 'field'
  assert.equal(equipItem(state, pixel.id, 'hands', 'toolkit'), true)
  assert.equal(getEquipmentSelection(pixel, 'hands'), 'toolkit')

  delete (state.cats[0] as unknown as Record<string, unknown>).pendingEquipment
  const restored = deserializeState(serializeState(state))
  assert.equal(getEquipmentSelection(restored.cats.find(cat => cat.id === pixel.id)!, 'hands'), 'toolkit')
  assert.equal(restored.cats.every(cat => Boolean(cat.pendingEquipment)), true)
})

test('a versioned save restores the complete simulation state', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  equipItem(state, 'pixel', 'hands', 'toolkit')
  selectResearch(state, 'field_scanners')
  state.speed = 5
  tick(state, 2)

  const restored = deserializeState(serializeState(state))
  assert.deepEqual(restored, state)
  assert.notEqual(restored, state)
})

test('save envelopes expose saveVersion and autosave can be compact', () => {
  const pretty = serializeState(createState())
  const compact = serializeState(createState(), false)
  const envelope = JSON.parse(compact)

  assert.equal(envelope.saveVersion, envelope.version)
  assert.equal(compact.includes('\n'), false)
  assert.ok(compact.length < pretty.length)
})

test('GameCore refuses to resume time while story or final overlays are blocking', () => {
  const storyState = createState()
  storyState.storyIncident = { kind: 'ninth_life', foundBySquadId: 'alpha', x: 50, y: 20 }
  const storyCore = new GameCore(storyState)
  assert.equal(storyCore.dispatch({ type: 'set_speed', speed: 1 }), false)
  assert.equal(storyCore.snapshot().speed, 0)

  const finalState = createState()
  finalState.finalSummaryVisible = true
  const finalCore = new GameCore(finalState)
  assert.equal(finalCore.dispatch({ type: 'set_speed', speed: 10 }), false)
  assert.equal(finalCore.snapshot().speed, 0)
})

test('mission flow never creates duplicate active coordinates', () => {
  const state = createState()
  state.speed = 10
  for (let step = 0; step < 2400; step++) {
    tick(state, 0.25)
    const coordinates = state.missions.map(mission => `${mission.x}:${mission.y}`)
    assert.equal(new Set(coordinates).size, coordinates.length)
  }
})

test('core exposes typed transient events without persisting them', () => {
  const state = createState()
  assert.equal(assignCat(state, 'pixel', 'alpha'), true)
  assert.deepEqual(drainEvents(state), [
    { type: 'achievement_unlocked', achievementId: 'first_squad' },
  ])
  assert.deepEqual(drainEvents(state), [])

  state.speed = 1
  tick(state, 0.25)
  const mission = state.squads[0].missionId
  assert.ok(mission)
  assert.deepEqual(drainEvents(state), [
    { type: 'mission_started', squadId: 'alpha', missionId: mission },
  ])

  const restored = deserializeState(serializeState(state))
  assert.deepEqual(drainEvents(restored), [])
})

test('a prepared raid keeps its deterministic rolls after loading', () => {
  const state = openRaid()
  const restored = deserializeState(serializeState(state))
  assert.deepEqual(restored.incident, state.incident)
  assert.equal(restored.rngSeed, state.rngSeed)
})

test('unsupported and malformed save files are rejected', () => {
  const envelope = JSON.parse(serializeState(createState()))
  envelope.version = 99
  assert.throws(() => deserializeState(JSON.stringify(envelope)), /save\.error\.unsupported_version/)
  assert.throws(() => deserializeState('{oops'), /save\.error\.invalid_json/)
  assert.throws(() => deserializeState(JSON.stringify({ format: 'foreign', version: 1 })), /save\.error\.unknown_format/)
})

test('version one saves migrate their text log into legacy entries', () => {
  const envelope = JSON.parse(serializeState(createState()))
  envelope.version = 1
  envelope.state.log = ['09:16 · Пиксель назначен в Отряд «Альфа»', '09:15 · Старая запись']
  const restored = deserializeState(JSON.stringify(envelope))
  assert.deepEqual(restored.log[0], { time: 960, key: 'log.cat_assigned', params: { cat: 'cat.pixel.name', squad: 'squad.alpha' } })
  assert.deepEqual(restored.log[1], { time: 900, key: 'log.legacy', params: { text: 'Старая запись' } })
})

test('version two saves migrate presentation text and discard the saved view', () => {
  const envelope = JSON.parse(serializeState(createState()))
  envelope.version = 2
  envelope.state.activeView = 'base'
  envelope.state.cats[0].name = 'Марлоу'
  envelope.state.cats[0].role = 'переговорщик'
  envelope.state.squads[0].name = 'Отряд «Альфа»'
  envelope.state.missions[0].title = 'Свалка у эстакады'
  envelope.state.log = [{ time: 0, key: 'log.cat_assigned', params: { cat: 'Марлоу', squad: 'Отряд «Альфа»' } }]

  const restored = deserializeState(JSON.stringify(envelope))
  assert.equal('activeView' in restored, false)
  assert.equal(restored.cats[0].name, 'cat.marlowe.name')
  assert.equal(restored.cats[0].role, 'cat.marlowe.role')
  assert.equal(restored.squads[0].name, 'squad.alpha')
  assert.equal(restored.missions[0].title, 'mission.a')
  assert.deepEqual(restored.log[0].params, { cat: 'cat.marlowe.name', squad: 'squad.alpha' })
})

test('version three saves resume support that was left paused by the old flow', () => {
  const state = openRaid()
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.supportRoll = 1
  assert.equal(resolveRaidDecision(state, 'support'), true)
  state.speed = 0

  const envelope = JSON.parse(serializeState(state))
  envelope.version = 3
  const restored = deserializeState(JSON.stringify(envelope))

  assert.equal(restored.incident?.stage, 'support_en_route')
  assert.equal(restored.speed, 1)
})

test('version four saves migrate the sleeping state', () => {
  const envelope = JSON.parse(serializeState(createState()))
  envelope.version = 4
  envelope.state.cats[0].energy = 20
  for (const cat of envelope.state.cats) delete cat.sleeping

  const restored = deserializeState(JSON.stringify(envelope))
  assert.equal(restored.cats[0].sleeping, true)
  assert.equal(restored.cats[1].sleeping, false)
})

test('version five saves enable auto-deploy while migrating squads', () => {
  const envelope = JSON.parse(serializeState(createState()))
  envelope.version = 5
  for (const squad of envelope.state.squads) delete squad.autoDispatch

  const restored = deserializeState(JSON.stringify(envelope))

  assert.equal(restored.squads.every(squad => squad.autoDispatch), true)
})

test('version six saves migrate field route state', () => {
  const envelope = JSON.parse(serializeState(createState()))
  envelope.version = 6
  envelope.state.squads[0].phase = 'returning'
  envelope.state.squads[0].target = { id: 'a', title: 'mission.a', x: 23, y: 25, priority: 1 }
  for (const squad of envelope.state.squads) {
    delete squad.routeFrom
    delete squad.restAfterReturn
  }

  const restored = deserializeState(JSON.stringify(envelope))

  assert.deepEqual(restored.squads[0].routeFrom, { x: 23, y: 25 })
  assert.deepEqual(restored.squads[1].routeFrom, { x: 46, y: 51 })
  assert.equal(restored.squads[0].restAfterReturn, false)
})

test('version eight saves migrate an empty deferred equipment queue', () => {
  const envelope = JSON.parse(serializeState(createState()))
  envelope.version = 8
  for (const cat of envelope.state.cats) delete cat.pendingEquipment

  const restored = deserializeState(JSON.stringify(envelope))

  assert.equal(restored.cats.every(cat => !hasPendingEquipment(cat)), true)
})

test('an incomplete current-version save is normalized like an open HMR tab', () => {
  const envelope = JSON.parse(serializeState(createState()))
  delete envelope.state.cats[0].pendingEquipment

  const restored = deserializeState(JSON.stringify(envelope))

  assert.deepEqual(restored.cats[0].pendingEquipment, {})
})

test('a deployed squad composition is locked', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  state.speed = 1
  tick(state, 0.25)
  assert.equal(state.squads[0].phase, 'outbound')
  assert.equal(assignCat(state, 'pixel', ''), false)
  assert.equal(state.cats.find(cat => cat.id === 'pixel')?.assignedTo, 'alpha')
})

test('the scripted raid pauses the third cleanup at 15 seconds', () => {
  const state = createState()
  for (const catId of ['pixel', 'rust', 'bastion']) assignCat(state, catId, 'alpha')
  for (const catId of ['marlowe', 'shorokh', 'myata']) assignCat(state, catId, 'bravo')
  state.speed = 10
  for (let step = 0; step < 500 && !state.incident; step++) tick(state, 0.25)
  assert.ok(state.incident)
  assert.equal(state.incident.stage, 'decision')
  assert.equal(state.speed, 0)
  assert.equal(successfulCleanups(state), 2)
  const squad = state.squads.find(candidate => candidate.id === state.incident?.primarySquadId)
  assert.equal(squad?.progress, 15)
})

test('escaping cancels the raid mission without a reward', () => {
  const state = createState()
  for (const catId of ['pixel', 'rust', 'bastion']) assignCat(state, catId, 'alpha')
  state.squads[0].completed = 2
  state.speed = 10
  for (let step = 0; step < 100 && !state.incident; step++) tick(state, 0.25)
  const fame = state.fame
  const scrap = state.scrap
  assert.equal(resolveRaidDecision(state, 'escape'), true)
  assert.equal(state.incident, undefined)
  assert.equal(state.squads[0].phase, 'returning')
  assert.equal(state.fame, fame)
  assert.equal(state.scrap, scrap)
  assert.equal(getAchievements(state).find(achievement => achievement.id === 'raiders_resolved')?.completed, true)
})

test('successful support arrives after eight seconds and can complete the cleanup', () => {
  const state = createState()
  for (const catId of ['pixel', 'rust', 'bastion']) assignCat(state, catId, 'alpha')
  for (const catId of ['marlowe', 'shorokh', 'myata']) assignCat(state, catId, 'bravo')
  state.squads[0].completed = 2
  state.speed = 10
  for (let step = 0; step < 100 && !state.incident; step++) tick(state, 0.25)
  assert.ok(state.incident)
  state.incident.supportRoll = 1
  const fame = state.fame
  const scrap = state.scrap

  assert.equal(resolveRaidDecision(state, 'support'), true)
  assert.equal(state.incident.stage, 'support_en_route')
  const support = state.squads.find(squad => squad.id === state.incident?.supportSquadId)
  assert.equal(support?.phase, 'support')
  assert.equal(state.speed, 1)

  tick(state, 8)
  assert.equal(state.incident.stage, 'support_decision')
  assert.equal(state.speed, 0)
  assert.equal(resolveRaidFollowup(state, 'continue'), true)
  assert.equal(state.fame, fame)
  assert.equal(state.scrap, scrap)
  assert.equal(support?.phase, 'assisting')
  state.speed = 1
  tick(state, 3)
  assert.equal(state.fame, fame + 5)
  assert.equal(state.scrap, scrap + 10)
  assert.equal(state.incident, undefined)
  assert.equal(support?.phase, 'returning')
})

test('the ninth life investigation opens immediately after the third successful cleanup', () => {
  const state = finishThirdCleanup()
  assert.equal(successfulCleanups(state), 3)
  assert.equal(state.storyTriggered, true)
  assert.equal(state.storyIncident?.kind, 'ninth_life')
  assert.equal(state.speed, 0)
})

test('sheltering the deserter reaches the goal and opens the final summary', () => {
  const state = finishThirdCleanup()
  assert.equal(resolveNinthLife(state, 'shelter'), true)
  assert.equal(state.fame, 50)
  assert.equal(state.threat, 40)
  assert.equal(state.storyResolution?.branch, 'story.shelter.branch')
  assert.equal(getAchievements(state).find(achievement => achievement.id === 'first_cleanup')?.completed, true)
  assert.equal(getAchievements(state).find(achievement => achievement.id === 'ninth_life_closed')?.completed, true)
  assert.equal(state.finalSummaryVisible, true)
  assert.equal(continueAfterFinale(state), true)
  assert.equal(state.finalSummaryVisible, false)
  assert.equal(state.finalSummarySeen, true)
})

test('a cautious story decision waits for 50 fame before the final summary', () => {
  const state = finishThirdCleanup()
  assert.equal(resolveNinthLife(state, 'escort'), true)
  assert.equal(state.fame, 40)
  assert.equal(state.finalSummaryVisible, false)

  const squad = state.squads[0]
  state.speed = 1
  squad.phase = 'cleanup'
  squad.progress = 29
  tick(state, 1)
  assert.equal(state.fame, 45)
  assert.equal(state.finalSummaryVisible, false)
  squad.phase = 'cleanup'
  squad.progress = 29
  tick(state, 1)
  assert.equal(state.fame, 50)
  assert.equal(state.finalSummaryVisible, true)
})

test('research consumes scrap over sixty seconds and grants its warehouse reward', () => {
  const state = createState()
  state.scrap = 20
  assert.equal(selectResearch(state, 'field_scanners'), true)
  state.speed = 1
  tick(state, 60)

  assert.equal(state.research.nodes.field_scanners.completed, true)
  assert.equal(state.research.nodes.field_scanners.scrapSpent, 20)
  assert.equal(state.research.nodes.field_scanners.progress, 60)
  assert.equal(state.inventory.scanner, 2)
  assert.equal(state.scrap, 0)
  assert.equal(Math.round(state.cats.find(cat => cat.id === 'pixel')?.energy ?? 0), 87)
})

test('research pauses without scrap and resumes with the same progress', () => {
  const state = createState()
  state.scrap = 1
  selectResearch(state, 'emergency_dispatch')
  state.speed = 1
  tick(state, 10)
  assert.equal(state.research.nodes.emergency_dispatch.progress, 3)
  assert.equal(state.scrap, 0)
  tick(state, 10)
  assert.equal(state.research.nodes.emergency_dispatch.progress, 3)
  state.scrap = 1
  tick(state, 3)
  assert.equal(state.research.nodes.emergency_dispatch.progress, 6)
})

test('equipped headset adds fifteen points to the support chance', () => {
  const baseline = openRaid()
  const baselineChance = getRaidOptions(baseline)?.support.chance

  const equipped = createState()
  assert.equal(equipItem(equipped, 'pixel', 'belt', 'headset'), true)
  assignCat(equipped, 'pixel', 'alpha')
  assignCat(equipped, 'marlowe', 'bravo')
  const squad = equipped.squads[0]
  squad.completed = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  equipped.missions[0].status = 'assigned'
  equipped.missions[0].squadId = squad.id
  squad.progress = 14
  equipped.speed = 1
  tick(equipped, 1)
  assert.equal(getRaidOptions(equipped)?.support.chance, Math.min(100, (baselineChance ?? 0) + 15))
})

test('completed defense research and an equipped weapon unlock a successful attack', () => {
  const state = createState()
  state.research.nodes.improvised_defense.completed = true
  state.inventory.nonlethal_weapon = 1
  assert.equal(equipItem(state, 'pixel', 'hands', 'nonlethal_weapon'), true)
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const squad = state.squads[0]
  squad.completed = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadId = squad.id
  squad.progress = 14
  state.speed = 1
  tick(state, 1)
  assert.equal(getRaidOptions(state)?.attack.available, true)
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.attackRoll = 1
  const fame = state.fame
  const scrap = state.scrap
  assert.equal(resolveRaidDecision(state, 'attack'), true)
  assert.equal(state.incident, undefined)
  assert.equal(state.fame, fame)
  assert.equal(state.scrap, scrap)
  state.speed = 1
  tick(state, 15)
  assert.equal(state.fame, fame + 5)
  assert.equal(state.scrap, scrap + 10)
})

test('dispatch research reduces support travel to five seconds', () => {
  const state = openRaid()
  state.research.nodes.emergency_dispatch.completed = true
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.supportRoll = 1
  assert.equal(resolveRaidDecision(state, 'support'), true)
  const support = state.squads.find(squad => squad.id === state.incident?.supportSquadId)
  assert.equal(support?.travelDuration, 5)
})

test('a medkit shortens the recovery time of its injured wearer', () => {
  const state = createState()
  assert.equal(equipItem(state, 'pixel', 'belt', 'medkit'), true)
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const squad = state.squads[0]
  squad.completed = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadId = squad.id
  squad.progress = 14
  state.speed = 1
  tick(state, 1)
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.supportRoll = 100
  state.incident.injuryRoll = 1
  state.incident.injuredMemberRoll = 1
  assert.equal(resolveRaidDecision(state, 'support'), true)
  assert.equal(state.cats.find(cat => cat.id === 'pixel')?.injuredRemaining, 20)
})

test('an armor vest reduces injury chance and returns to the warehouse when removed', () => {
  const state = createState()
  assert.equal(state.inventory.armor_vest, 2)
  assert.equal(equipItem(state, 'pixel', 'armor', 'armor_vest'), true)
  assert.equal(state.inventory.armor_vest, 1)
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const squad = state.squads[0]
  squad.completed = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadId = squad.id
  squad.progress = 14
  state.speed = 1
  tick(state, 1)
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.supportRoll = 100
  state.incident.injuryRoll = 55
  assert.equal(resolveRaidDecision(state, 'support'), true)
  assert.equal(state.cats.find(cat => cat.id === 'pixel')?.injuredRemaining, 0)

  squad.phase = 'base'
  assert.equal(equipItem(state, 'pixel', 'armor'), true)
  assert.equal(state.inventory.armor_vest, 2)
})
