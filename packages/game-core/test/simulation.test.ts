import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignSquadToMission,
  assignCat,
  continueAfterFinale,
  createSquad,
  createState as createFreshState,
  disbandSquad,
  deserializeCurrentSave,
  deserializeState,
  drainEvents,
  equipItem,
  getAchievements,
  getCreateSquadBlockReason,
  getDisbandSquadBlockReason,
  getCatAssignmentSelection,
  getEquipmentSelection,
  getRaidOptions,
  getSquadCleanupEstimate,
  getSquadMapPosition,
  getMoveSquadBlockReason,
  getSplitSquadBlockReason,
  GameCore,
  hasPendingEquipment,
  hasPendingAssignment,
  resolveNinthLife,
  resolveRaidDecision,
  resolveRaidFollowup,
  renameSquad,
  returnSquadToBase,
  moveSquadToPoint,
  mergeSquads,
  selectResearch,
  serializeState,
  setSquadAutoDispatch,
  setSquadStyle,
  splitSquad,
  successfulCleanups,
  tick,
} from '../src/simulation.ts'

// Most legacy regression cases exercise established squad behavior. Seed their
// fixture explicitly now that production starts without empty squad templates.
function createState() {
  const state = createFreshState()
  createSquad(state)
  createSquad(state)
  state.squads[0].id = 'alpha'
  state.squads[0].name = 'squad.alpha'
  state.squads[0].autoDispatch = true
  state.squads[1].id = 'bravo'
  state.squads[1].name = 'squad.bravo'
  state.squads[1].style = 'careful'
  state.squads[1].autoDispatch = true
  return state
}

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

test('GameCore forms a persistent squad from map-selected cats on first order', () => {
  const core = new GameCore()
  const missionId = core.snapshot().missions[0].id
  assert.equal(core.snapshot().squads.length, 0)
  assert.equal(core.dispatch({ type: 'deploy_cats', catIds: ['pixel', 'rust'], order: { type: 'mission', missionId } }), true)
  const snapshot = core.snapshot()
  assert.equal(snapshot.squads.length, 1)
  assert.deepEqual(snapshot.squads[0].members, ['pixel', 'rust'])
  assert.equal(snapshot.squads[0].autoDispatch, false)
  assert.deepEqual(snapshot.missions[0].squadIds, [snapshot.squads[0].id])
})

test('squads can be created up to the staff count with stable non-reused ids', () => {
  const state = createState()
  assert.equal(state.squads.length, 2)
  assert.equal(state.squadSerial, 2)
  for (let expected = 3; expected <= 6; expected++) {
    assert.equal(createSquad(state), true)
    assert.equal(state.squads.at(-1)?.id, `squad-${expected}`)
  }
  assert.equal(getCreateSquadBlockReason(state), 'squad.manage.reason.limit')
  assert.equal(createSquad(state), false)

  assert.equal(disbandSquad(state, 'squad-3'), true)
  assert.equal(createSquad(state), true)
  assert.equal(state.squads.at(-1)?.id, 'squad-7')
  assert.equal(state.squads.at(-1)?.name, 'squad.generated.07')
  const restored = deserializeState(serializeState(state))
  assert.equal(restored.squadSerial, 7)
  assert.deepEqual(restored.squads.map(squad => squad.id), state.squads.map(squad => squad.id))
})

test('disbanding only accepts an empty idle non-final squad', () => {
  const state = createState()
  assert.equal(getDisbandSquadBlockReason(state, 'alpha'), undefined)
  assignCat(state, 'pixel', 'alpha')
  assert.equal(getDisbandSquadBlockReason(state, 'alpha'), 'squad.manage.reason.members')
  assert.equal(disbandSquad(state, 'alpha'), false)
  assignCat(state, 'pixel', '')
  state.squads[0].completed = 2
  assert.equal(disbandSquad(state, 'alpha'), true)
  assert.equal(successfulCleanups(state), 0)
  assert.equal(state.disbandedSquadCleanups, 2)
  assert.equal(getDisbandSquadBlockReason(state, 'bravo'), undefined)
  assert.equal(disbandSquad(state, 'bravo'), true)
})

test('squads can be renamed in any phase with trimmed unique names', () => {
  const state = createState()
  state.squads[0].phase = 'incident'
  assert.equal(renameSquad(state, 'alpha', '  Night Watch  '), true)
  assert.equal(state.squads[0].customName, 'Night Watch')
  assert.deepEqual(state.log[0], {
    time: 0,
    key: 'log.squad_renamed',
    params: { previous: 'squad.alpha', squad: 'Night Watch' },
  })
  assert.equal(renameSquad(state, 'bravo', 'night watch'), false)
  assert.equal(renameSquad(state, 'alpha', 'Night Watch'), false)
  assert.equal(renameSquad(state, 'missing', 'Other'), false)
  assert.equal(renameSquad(state, 'bravo', ''), false)
  assert.equal(renameSquad(state, 'bravo', ' '.repeat(8)), false)
  assert.equal(renameSquad(state, 'bravo', 'x'.repeat(32)), true)
  assert.equal(renameSquad(state, 'bravo', 'x'.repeat(33)), false)
})

test('custom squad names survive save round trips and remain optional in old saves', () => {
  const state = createState()
  assert.equal(renameSquad(state, 'alpha', 'Lanterns'), true)
  const restored = deserializeState(serializeState(state))
  assert.equal(restored.squads[0].customName, 'Lanterns')

  const envelope = JSON.parse(serializeState(createState()))
  delete envelope.state.squads[0].customName
  assert.equal(deserializeState(JSON.stringify(envelope)).squads[0].customName, undefined)
})

test('adding a staff cat increases dynamic squad capacity', () => {
  const state = createState()
  while (createSquad(state)) { /* fill current capacity */ }
  const recruit = structuredClone(state.cats[0])
  recruit.id = 'recruit'
  recruit.name = 'cat.recruit.name'
  recruit.assignedTo = undefined
  recruit.pendingAssignment = undefined
  state.cats.push(recruit)
  assert.equal(createSquad(state), true)
  assert.equal(state.squads.length, 7)
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
  state.missions[0].squadIds = [squad.id]
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
  const current = { id: 'current', title: 'mission.a', x: 20, y: 20, priority: 1, status: 'assigned' as const, squadIds: [squad.id], contributorSquadIds: [], progress: 29, interruptionPolicy: 'preserve_progress' as const }
  const farther = { id: 'farther', title: 'mission.b', x: 80, y: 80, priority: 2, status: 'available' as const, squadIds: [], contributorSquadIds: [], progress: 0, interruptionPolicy: 'preserve_progress' as const }
  const nearby = { id: 'nearby', title: 'mission.c', x: 24, y: 20, priority: 2, status: 'available' as const, squadIds: [], contributorSquadIds: [], progress: 0, interruptionPolicy: 'preserve_progress' as const }
  state.missions = [current, farther, nearby]
  squad.phase = 'cleanup'
  squad.missionId = current.id
  squad.target = { id: current.id, title: current.title, x: current.x, y: current.y, priority: current.priority }
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
  current.squadIds = [squad.id]
  squad.phase = 'cleanup'
  squad.missionId = current.id
  squad.target = { id: current.id, title: current.title, x: current.x, y: current.y, priority: current.priority }
  current.progress = 29
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

  assert.equal(assignSquadToMission(state, 'alpha', selectedMission.id), true)
  assert.equal(state.squads[0].phase, 'outbound')
  assert.equal(state.squads[0].missionId, selectedMission.id)
  assert.equal(selectedMission.status, 'assigned')
  assert.equal(assignSquadToMission(state, 'bravo', state.missions[0].id), false)
})

test('a manual squad waits in the field and accepts its next mission there', () => {
  const state = createState()
  state.raidTriggered = true
  assignCat(state, 'pixel', 'alpha')
  setSquadAutoDispatch(state, 'alpha', false)
  const squad = state.squads[0]
  const completedMission = state.missions[0]
  completedMission.status = 'assigned'
  completedMission.squadIds = [squad.id]
  squad.phase = 'cleanup'
  squad.missionId = completedMission.id
  squad.target = { ...completedMission }
  completedMission.progress = 29
  state.speed = 1

  tick(state, 1)

  assert.equal(squad.phase, 'field')
  assert.equal(squad.missionId, undefined)
  assert.equal(squad.target, undefined)
  assert.deepEqual(squad.routeFrom, { x: completedMission.x, y: completedMission.y })
  assert.equal(state.missions.includes(completedMission), false)

  const nextMission = state.missions.find(mission => mission.status === 'available')!
  assert.equal(assignSquadToMission(state, squad.id, nextMission.id), true)
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

test('an idle field squad moves toward base without retaining a mission target', () => {
  const state = createState()
  const squad = state.squads[0]
  squad.members = ['pixel']
  squad.phase = 'field'
  squad.routeFrom = { x: 30, y: 30 }
  squad.target = undefined
  state.speed = 1

  assert.equal(returnSquadToBase(state, squad.id), true)
  const duration = squad.travelDuration
  tick(state, duration / 2)

  assert.deepEqual(getSquadMapPosition(squad), { x: 38, y: 40.5 })
  assert.equal(squad.phase, 'returning')
})

test('a manual squad marches to an arbitrary point and waits there', () => {
  const state = createState()
  const squad = state.squads[0]
  squad.autoDispatch = false
  squad.members = ['pixel']
  state.speed = 1

  assert.equal(getMoveSquadBlockReason(state, squad.id, { x: 30, y: 30 }), undefined)
  assert.equal(moveSquadToPoint(state, squad.id, { x: 30, y: 30 }), true)
  assert.equal(squad.phase, 'moving')
  assert.deepEqual(squad.destination, { x: 30, y: 30 })

  tick(state, squad.travelDuration / 2)
  assert.equal(squad.phase, 'moving')
  assert.deepEqual(getSquadMapPosition(squad), { x: 38, y: 40.5 })

  tick(state, squad.travelDuration)
  assert.equal(squad.phase, 'field')
  assert.deepEqual(squad.routeFrom, { x: 30, y: 30 })
  assert.equal(squad.destination, undefined)
})

test('an arbitrary march requires manual control, a ready crew, and return energy', () => {
  const state = createState()
  const squad = state.squads[0]
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  squad.members = [pixel.id]
  const destination = { x: 5, y: 7 }

  assert.equal(getMoveSquadBlockReason(state, squad.id, destination), 'dispatch.reason.auto_enabled')
  squad.autoDispatch = false
  pixel.energy = 1
  assert.equal(getMoveSquadBlockReason(state, squad.id, destination), 'dispatch.reason.tired')
  assert.equal(moveSquadToPoint(state, squad.id, destination), false)
  pixel.energy = 100
  assert.equal(moveSquadToPoint(state, squad.id, { x: -1, y: 50 }), false)
})

test('an arbitrary march survives save and load', () => {
  const state = createState()
  state.squads[0].autoDispatch = false
  state.squads[0].members = ['pixel']
  assert.equal(moveSquadToPoint(state, 'alpha', { x: 70, y: 70 }), true)
  state.squads[0].travel = state.squads[0].travelDuration / 3

  const restored = deserializeState(serializeState(state))
  assert.equal(restored.squads[0].phase, 'moving')
  assert.deepEqual(restored.squads[0].destination, { x: 70, y: 70 })
  assert.equal(restored.squads[0].travel, state.squads[0].travel)
})

test('the application migrates version ten saves after adding squad lifecycle state', () => {
  const envelope = JSON.parse(serializeState(createState()))
  envelope.version = 10
  envelope.saveVersion = 10
  delete envelope.state.squadSerial
  delete envelope.state.disbandedSquadCleanups

  const restored = deserializeCurrentSave(JSON.stringify(envelope))
  assert.equal(restored.squads.length, 0)
  assert.equal(restored.squadSerial, 2)
  assert.equal(restored.disbandedSquadCleanups, 0)
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
  state.squads.find(squad => squad.id === 'bravo')!.autoDispatch = false
  const squad = state.squads[0]
  squad.completed = 2
  state.completedMissionCount = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadIds = [squad.id]
  state.missions[0].progress = 14
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
  state.completedMissionCount = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadIds = [squad.id]
  state.missions[0].progress = 29
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
  mission.squadIds = [squad.id]
  squad.phase = 'cleanup'
  squad.missionId = mission.id
  squad.target = { ...mission }
  mission.progress = 29
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
  mission.squadIds = [squad.id]
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

test('selecting the currently equipped item cancels its deferred replacement', () => {
  const state = createState()
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  assert.equal(equipItem(state, pixel.id, 'belt', 'headset'), true)
  assert.equal(assignCat(state, pixel.id, 'alpha'), true)
  state.squads[0].phase = 'cleanup'

  assert.equal(equipItem(state, pixel.id, 'belt', 'medkit'), true)
  assert.equal(pixel.equipment.belt, 'headset')
  assert.equal(getEquipmentSelection(pixel, 'belt'), 'medkit')
  assert.equal(state.inventory.medkit, 0)

  assert.equal(equipItem(state, pixel.id, 'belt', 'headset'), true)
  assert.equal(pixel.equipment.belt, 'headset')
  assert.equal(getEquipmentSelection(pixel, 'belt'), 'headset')
  assert.equal(hasPendingEquipment(pixel, 'belt'), false)
  assert.equal(state.inventory.medkit, 1)
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
  storyState.storyIncident = { kind: 'ninth_life', participantSquadIds: ['alpha'], x: 50, y: 20 }
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
  envelope.state.squads[0].members = ['marlowe']
  envelope.state.cats[0].assignedTo = 'alpha'
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
  assert.equal(resolveRaidDecision(state, 'support', 'bravo'), true)
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
  assert.equal(restored.squads[0].restAfterReturn, false)
  assert.equal(restored.squads.length, 1)
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

test('removing a deployed cat is deferred until the current cleanup and return finish', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  const alpha = state.squads[0]
  alpha.phase = 'cleanup'
  alpha.missionId = state.missions[0].id
  alpha.target = { ...state.missions[0] }
  state.missions[0].progress = 29
  state.missions[0].status = 'assigned'
  state.missions[0].squadIds = [alpha.id]
  state.raidTriggered = true
  state.speed = 1

  assert.equal(assignCat(state, pixel.id, ''), true)
  assert.equal(hasPendingAssignment(pixel), true)
  assert.equal(getCatAssignmentSelection(pixel), undefined)
  assert.equal(pixel.assignedTo, 'alpha')
  assert.deepEqual(alpha.members, ['pixel'])

  tick(state, 1)
  assert.equal(alpha.completed, 1)
  assert.equal(alpha.phase, 'returning')
  assert.equal(pixel.assignedTo, 'alpha')

  tick(state, alpha.travelDuration + 1)
  assert.equal(alpha.phase, 'base')
  assert.equal(pixel.assignedTo, undefined)
  assert.equal(hasPendingAssignment(pixel), false)
  assert.deepEqual(alpha.members, [])
})

test('moving a deployed cat waits for both squads to return and can be canceled', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  const pixel = state.cats.find(cat => cat.id === 'pixel')!
  const alpha = state.squads[0]
  const bravo = state.squads[1]
  alpha.phase = 'cleanup'
  bravo.phase = 'field'
  bravo.routeFrom = { x: 40, y: 40 }

  assert.equal(assignCat(state, pixel.id, 'bravo'), true)
  assert.equal(pixel.assignedTo, 'alpha')
  assert.equal(pixel.pendingAssignment, 'bravo')
  assert.equal(bravo.phase, 'returning')

  assert.equal(assignCat(state, pixel.id, 'alpha'), true)
  assert.equal(hasPendingAssignment(pixel), false)
  assert.equal(pixel.assignedTo, 'alpha')

  assert.equal(assignCat(state, pixel.id, 'bravo'), true)
  alpha.phase = 'base'
  state.speed = 1
  tick(state, bravo.travelDuration + 1)
  assert.equal(bravo.phase, 'base')
  assert.equal(pixel.assignedTo, 'bravo')
  assert.deepEqual(alpha.members, [])
  assert.deepEqual(bravo.members, ['pixel'])
})

test('a deferred assignment survives save and load', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  state.squads[0].phase = 'outbound'

  assert.equal(assignCat(state, 'pixel', 'bravo'), true)
  const restored = deserializeState(serializeState(state))
  const pixel = restored.cats.find(cat => cat.id === 'pixel')!

  assert.equal(pixel.assignedTo, 'alpha')
  assert.equal(pixel.pendingAssignment, 'bravo')
  assert.equal(getCatAssignmentSelection(pixel), 'bravo')
})

test('the scripted raid pauses the third cleanup at 15 seconds', () => {
  const state = createState()
  for (const catId of ['pixel', 'rust', 'bastion']) assignCat(state, catId, 'alpha')
  for (const catId of ['marlowe', 'shorokh', 'myata']) assignCat(state, catId, 'bravo')
  state.squads.find(squad => squad.id === 'bravo')!.autoDispatch = false
  state.speed = 10
  for (let step = 0; step < 500 && !state.incident; step++) tick(state, 0.25)
  assert.ok(state.incident)
  assert.equal(state.incident.stage, 'decision')
  assert.equal(state.speed, 0)
  assert.equal(successfulCleanups(state), 2)
  const mission = state.missions.find(candidate => candidate.id === state.incident?.missionId)
  assert.equal(mission?.progress, 15)
})

test('escaping cancels the raid mission without a reward', () => {
  const state = createState()
  for (const catId of ['pixel', 'rust', 'bastion']) assignCat(state, catId, 'alpha')
  state.squads[0].completed = 2
  state.completedMissionCount = 2
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
  state.squads.find(squad => squad.id === 'bravo')!.autoDispatch = false
  state.squads[0].completed = 2
  state.completedMissionCount = 2
  state.speed = 10
  for (let step = 0; step < 100 && !state.incident; step++) tick(state, 0.25)
  assert.ok(state.incident)
  state.incident.supportRoll = 1
  const fame = state.fame
  const scrap = state.scrap

  assert.equal(resolveRaidDecision(state, 'support', 'bravo'), true)
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
  assert.equal(support?.phase, 'cleanup')
  state.speed = 1
  tick(state, 3)
  assert.equal(state.fame, fame + 5)
  assert.equal(state.scrap, scrap + 10)
  assert.equal(state.incident, undefined)
  assert.notEqual(support?.phase, 'cleanup')
})

test('retasking a working squad preserves cleanup progress on the old mission', () => {
  const state = createState()
  state.raidTriggered = true
  assignCat(state, 'pixel', 'alpha')
  const squad = state.squads[0]
  const first = state.missions[0]
  const second = state.missions[1]
  assert.equal(assignSquadToMission(state, squad.id, first.id), true)
  state.speed = 1
  tick(state, squad.travelDuration)
  tick(state, 4)
  const savedProgress = first.progress
  assert.ok(savedProgress > 0)

  assert.equal(assignSquadToMission(state, squad.id, second.id), true)
  assert.equal(first.status, 'available')
  assert.deepEqual(first.squadIds, [])
  assert.equal(first.progress, savedProgress)
  assert.equal(squad.missionId, second.id)
})

test('an occupied cleanup accepts a second equal squad', () => {
  const state = createState()
  state.raidTriggered = true
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const mission = state.missions[0]
  const primary = state.squads[0]
  const assistant = state.squads[1]
  assert.equal(assignSquadToMission(state, primary.id, mission.id), true)
  state.speed = 1
  tick(state, primary.travelDuration)
  assert.equal(assignSquadToMission(state, assistant.id, mission.id), true)
  tick(state, assistant.travelDuration)
  assert.equal(primary.phase, 'cleanup')
  assert.equal(assistant.phase, 'cleanup')
  assert.deepEqual(mission.squadIds, [primary.id, assistant.id])
  const before = mission.progress
  tick(state, 1)
  assert.ok(mission.progress - before > 1.9)
  assert.equal(returnSquadToBase(state, primary.id), true)
  assert.deepEqual(mission.squadIds, [assistant.id])
  assert.equal(assistant.phase, 'cleanup')
})

test('every equal squad with positive work receives credit while the world reward is granted once', () => {
  const state = createState()
  state.raidTriggered = true
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const mission = state.missions[0]
  const first = state.squads[0]
  const second = state.squads[1]
  setSquadAutoDispatch(state, first.id, false)
  setSquadAutoDispatch(state, second.id, false)
  assert.equal(assignSquadToMission(state, first.id, mission.id), true)
  assert.equal(assignSquadToMission(state, second.id, mission.id), true)
  state.speed = 1
  tick(state, Math.max(first.travelDuration, second.travelDuration))
  assert.equal(first.phase, 'cleanup')
  assert.equal(second.phase, 'cleanup')
  mission.progress = 29
  const { scrap, fame, completedMissionCount } = state

  tick(state, 1)

  assert.equal(state.scrap, scrap + 10)
  assert.equal(state.fame, fame + 5)
  assert.equal(state.completedMissionCount, completedMissionCount + 1)
  assert.equal(first.completed, 1)
  assert.equal(second.completed, 1)
})

test('a squad that has not arrived when equal peers finish gets no credit and leaves independently', () => {
  const state = createState()
  state.raidTriggered = true
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const mission = state.missions[0]
  const arrived = state.squads[0]
  const late = state.squads[1]
  setSquadAutoDispatch(state, arrived.id, false)
  setSquadAutoDispatch(state, late.id, false)
  assert.equal(assignSquadToMission(state, arrived.id, mission.id), true)
  state.speed = 1
  tick(state, arrived.travelDuration)
  assert.equal(arrived.phase, 'cleanup')
  mission.progress = 29.5
  assert.equal(assignSquadToMission(state, late.id, mission.id), true)

  tick(state, 1)

  assert.equal(arrived.completed, 1)
  assert.equal(late.completed, 0)
  assert.equal(late.phase, 'returning')
  assert.equal(state.missions.some(candidate => candidate.id === mission.id), false)
})

test('a safe field split creates a normal manual squad at the same position', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'rust', 'alpha')
  const source = state.squads[0]
  source.phase = 'field'
  source.routeFrom = { x: 42, y: 44 }
  assert.equal(getSplitSquadBlockReason(state, source.id, ['pixel']), undefined)
  assert.equal(splitSquad(state, source.id, ['pixel']), true)
  const created = state.squads.at(-1)!
  assert.deepEqual(source.members, ['rust'])
  assert.deepEqual(created.members, ['pixel'])
  assert.equal(created.phase, 'field')
  assert.equal(created.autoDispatch, false)
  assert.deepEqual(getSquadMapPosition(created), { x: 42, y: 44 })
  assert.equal(state.cats.find(cat => cat.id === 'pixel')?.assignedTo, created.id)
})

test('a field squad physically merges into the clicked target squad', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const source = state.squads[0]
  const target = state.squads[1]
  source.phase = 'field'
  target.phase = 'field'
  source.routeFrom = { x: 40, y: 40 }
  target.routeFrom = { x: 40, y: 40 }
  assert.equal(mergeSquads(state, source.id, target.id), true)
  assert.equal(source.phase, 'merging')
  state.speed = 1
  tick(state, 2)
  assert.equal(state.squads.some(squad => squad.id === source.id), false)
  assert.deepEqual(target.members.sort(), ['marlowe', 'pixel'])
  assert.equal(state.cats.find(cat => cat.id === 'pixel')?.assignedTo, target.id)
})

test('a merge intercepts a moving target on its route', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const source = state.squads[0]
  const target = state.squads[1]
  source.phase = 'field'
  source.routeFrom = { x: 30, y: 50 }
  target.phase = 'moving'
  target.autoDispatch = false
  target.routeFrom = { x: 45, y: 50 }
  target.destination = { x: 65, y: 50 }
  target.travel = 0
  target.travelDuration = 5

  assert.equal(mergeSquads(state, source.id, target.id), true)
  state.speed = 1
  for (let step = 0; step < 100 && state.squads.some(squad => squad.id === source.id); step++) tick(state, 0.25)

  assert.equal(state.squads.some(squad => squad.id === source.id), false)
  assert.deepEqual(target.members.sort(), ['marlowe', 'pixel'])
})

test('a merge chain follows the final absorbing squad', () => {
  const state = createState()
  assert.equal(createSquad(state), true)
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  assignCat(state, 'rust', 'squad-3')
  state.squads.find(squad => squad.id === 'squad-3')!.autoDispatch = false
  const alpha = state.squads[0]
  const bravo = state.squads[1]
  const charlie = state.squads[2]
  for (const squad of state.squads) {
    squad.phase = 'field'
    squad.routeFrom = { x: 40, y: 40 }
  }
  alpha.routeFrom = { x: 20, y: 20 }

  assert.equal(mergeSquads(state, bravo.id, charlie.id), true)
  assert.equal(mergeSquads(state, alpha.id, bravo.id), true)
  state.speed = 1
  tick(state, 0.25)
  assert.equal(alpha.mergeTargetSquadId, charlie.id)
  for (let step = 0; step < 100 && state.squads.length > 1; step++) tick(state, 0.25)

  assert.deepEqual(state.squads.map(squad => squad.id), [charlie.id])
  assert.deepEqual(charlie.members.sort(), ['marlowe', 'pixel', 'rust'])
})

test('version eleven mission work migrates from the assigned squad', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  const mission = state.missions[0]
  const squad = state.squads[0]
  mission.status = 'assigned'
  mission.squadIds = [squad.id]
  squad.missionId = mission.id
  const envelope = JSON.parse(serializeState(state))
  envelope.version = 11
  envelope.saveVersion = 11
  envelope.state.squads[0].progress = 7
  delete envelope.state.missions[0].progress
  delete envelope.state.missions[0].interruptionPolicy
  const restored = deserializeCurrentSave(JSON.stringify(envelope))
  assert.equal(restored.missions[0].progress, 7)
  assert.equal(restored.missions[0].interruptionPolicy, 'preserve_progress')
})

test('version twelve migrates equal mission squads, incident participants, and empty templates', () => {
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  const mission = state.missions[0]
  const alpha = state.squads[0]
  const bravo = state.squads[1]
  mission.status = 'assigned'
  mission.squadIds = [alpha.id, bravo.id]
  alpha.phase = 'incident'
  alpha.missionId = mission.id
  bravo.phase = 'cleanup'
  bravo.missionId = mission.id
  state.incident = {
    kind: 'raiders',
    missionId: mission.id,
    participantSquadIds: [bravo.id],
    stage: 'decision',
    supportChance: 50,
    attackChance: 50,
    attackRoll: 0.5,
    supportRoll: 0.5,
    injuryRoll: 0.5,
    injuredMemberRoll: 0.5,
  }
  const envelope = JSON.parse(serializeState(state))
  envelope.version = 12
  envelope.saveVersion = 12
  const legacyMission = envelope.state.missions[0]
  legacyMission.squadId = alpha.id
  delete legacyMission.squadIds
  delete legacyMission.contributorSquadIds
  envelope.state.squads[1].phase = 'assisting'
  envelope.state.incident.primarySquadId = alpha.id
  envelope.state.squads.push({
    id: 'legacy-empty', name: 'squad.charlie', members: [], style: 'balanced', autoDispatch: true,
    phase: 'base', travel: 0, travelDuration: 0, completed: 4, routeFrom: { x: 46, y: 51 }, restAfterReturn: false,
  })

  const restored = deserializeCurrentSave(JSON.stringify(envelope))
  const restoredMission = restored.missions.find(candidate => candidate.id === mission.id)!
  assert.deepEqual(restoredMission.squadIds.sort(), [alpha.id, bravo.id].sort())
  assert.deepEqual(restoredMission.contributorSquadIds.sort(), [alpha.id, bravo.id].sort())
  assert.deepEqual(restored.incident?.participantSquadIds.sort(), [alpha.id, bravo.id].sort())
  assert.equal('primarySquadId' in (restored.incident ?? {}), false)
  assert.equal(restored.squads.some(squad => squad.id === 'legacy-empty'), false)
  assert.equal(restored.disbandedSquadCleanups, 4)
})

test('a raid exposes every candidate and dispatches the squad selected by id', () => {
  const state = openRaid()
  assert.equal(createSquad(state), true)
  const charlie = state.squads.at(-1)!
  assert.equal(assignCat(state, 'shorokh', charlie.id), true)
  const candidates = getRaidOptions(state)?.support.candidates ?? []
  assert.deepEqual(candidates.map(candidate => candidate.squadId).sort(), ['bravo', charlie.id].sort())
  assert.equal(resolveRaidDecision(state, 'support', 'missing'), false)
  assert.equal(state.incident?.stage, 'decision')
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.supportRoll = 1
  assert.equal(resolveRaidDecision(state, 'support', charlie.id), true)
  assert.equal(state.incident.supportSquadId, charlie.id)
  assert.equal(charlie.phase, 'support')
})

test('a squad already assigned to a mission cannot be recalled as raid support', () => {
  const state = openRaid()
  const support = state.squads.find(squad => squad.id === 'bravo')!
  const mission = state.missions[1]
  support.phase = 'cleanup'
  support.missionId = mission.id
  support.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
  mission.status = 'assigned'
  mission.squadIds = [support.id]

  assert.deepEqual(getRaidOptions(state)?.support.candidates, [])
  assert.equal(resolveRaidDecision(state, 'support', support.id), false)
  assert.equal(state.incident?.stage, 'decision')
})

test('a raid captures every squad that has arrived at the cleanup', () => {
  const state = createState()
  assert.equal(createSquad(state), true)
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  assignCat(state, 'rust', 'squad-3')
  state.squads.find(squad => squad.id === 'squad-3')!.autoDispatch = false
  const primary = state.squads[0]
  const assistant = state.squads[1]
  const mission = state.missions[0]
  primary.completed = 2
  state.completedMissionCount = 2
  primary.phase = 'cleanup'
  assistant.phase = 'cleanup'
  primary.missionId = mission.id
  assistant.missionId = mission.id
  primary.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
  assistant.target = { ...primary.target }
  primary.missionArrivalTime = 1
  assistant.missionArrivalTime = 2
  mission.status = 'assigned'
  mission.squadIds = [primary.id, assistant.id]
  mission.progress = 14
  state.speed = 1

  tick(state, 0.5)

  assert.deepEqual(state.incident?.participantSquadIds, ['alpha', 'bravo'])
  assert.equal(primary.phase, 'incident')
  assert.equal(assistant.phase, 'incident')
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.supportRoll = 1
  assert.equal(resolveRaidDecision(state, 'support', 'squad-3'), true)
  tick(state, 8)
  assert.equal(resolveRaidFollowup(state, 'continue'), true)
  assert.equal(primary.phase, 'cleanup')
  assert.equal(assistant.phase, 'cleanup')
  assert.equal(state.squads.find(squad => squad.id === 'squad-3')?.phase, 'cleanup')
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
  state.missions.find(mission => mission.id === squad.missionId)!.progress = 29
  tick(state, 1)
  assert.equal(state.fame, 45)
  assert.equal(state.finalSummaryVisible, false)
  squad.phase = 'cleanup'
  state.missions.find(mission => mission.id === squad.missionId)!.progress = 29
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
  const baselineChance = getRaidOptions(baseline)?.support.candidates.find(candidate => candidate.squadId === 'bravo')?.chance

  const equipped = createState()
  assert.equal(equipItem(equipped, 'marlowe', 'belt', 'headset'), true)
  assignCat(equipped, 'pixel', 'alpha')
  assignCat(equipped, 'marlowe', 'bravo')
  equipped.squads.find(squad => squad.id === 'bravo')!.autoDispatch = false
  const squad = equipped.squads[0]
  squad.completed = 2
  equipped.completedMissionCount = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  equipped.missions[0].status = 'assigned'
  equipped.missions[0].squadIds = [squad.id]
  equipped.missions[0].progress = 14
  equipped.speed = 1
  tick(equipped, 1)
  assert.equal(getRaidOptions(equipped)?.support.candidates.find(candidate => candidate.squadId === 'bravo')?.chance, Math.min(100, (baselineChance ?? 0) + 15))
})

test('completed defense research and an equipped weapon unlock a successful attack', () => {
  const state = createState()
  state.research.nodes.improvised_defense.completed = true
  state.inventory.nonlethal_weapon = 1
  assert.equal(equipItem(state, 'pixel', 'hands', 'nonlethal_weapon'), true)
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  state.squads.find(squad => squad.id === 'bravo')!.autoDispatch = false
  const squad = state.squads[0]
  squad.completed = 2
  state.completedMissionCount = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadIds = [squad.id]
  state.missions[0].progress = 14
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
  assert.equal(resolveRaidDecision(state, 'support', 'bravo'), true)
  const support = state.squads.find(squad => squad.id === state.incident?.supportSquadId)
  assert.equal(support?.travelDuration, 5)
})

test('a medkit shortens the recovery time of its injured wearer', () => {
  const state = createState()
  assert.equal(equipItem(state, 'pixel', 'belt', 'medkit'), true)
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  state.squads.find(squad => squad.id === 'bravo')!.autoDispatch = false
  const squad = state.squads[0]
  squad.completed = 2
  state.completedMissionCount = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadIds = [squad.id]
  state.missions[0].progress = 14
  state.speed = 1
  tick(state, 1)
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.supportRoll = 100
  state.incident.injuryRoll = 1
  state.incident.injuredMemberRoll = 1
  assert.equal(resolveRaidDecision(state, 'support', 'bravo'), true)
  assert.equal(state.cats.find(cat => cat.id === 'pixel')?.injuredRemaining, 20)
})

test('an armor vest reduces injury chance and returns to the warehouse when removed', () => {
  const state = createState()
  assert.equal(state.inventory.armor_vest, 2)
  assert.equal(equipItem(state, 'pixel', 'armor', 'armor_vest'), true)
  assert.equal(state.inventory.armor_vest, 1)
  assignCat(state, 'pixel', 'alpha')
  assignCat(state, 'marlowe', 'bravo')
  state.squads.find(squad => squad.id === 'bravo')!.autoDispatch = false
  const squad = state.squads[0]
  squad.completed = 2
  state.completedMissionCount = 2
  squad.phase = 'cleanup'
  squad.missionId = 'a'
  squad.target = { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1 }
  state.missions[0].status = 'assigned'
  state.missions[0].squadIds = [squad.id]
  state.missions[0].progress = 14
  state.speed = 1
  tick(state, 1)
  if (!state.incident) assert.fail('raid was not opened')
  state.incident.supportRoll = 100
  state.incident.injuryRoll = 55
  assert.equal(resolveRaidDecision(state, 'support', 'bravo'), true)
  assert.equal(state.cats.find(cat => cat.id === 'pixel')?.injuredRemaining, 0)

  squad.phase = 'base'
  assert.equal(equipItem(state, 'pixel', 'armor'), true)
  assert.equal(state.inventory.armor_vest, 2)
})
