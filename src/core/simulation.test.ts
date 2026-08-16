import assert from 'node:assert/strict'
import test from 'node:test'
import { translate } from '../i18n.ts'
import {
  assignCat,
  continueAfterFinale,
  createState,
  deserializeState,
  drainEvents,
  equipItem,
  getAchievements,
  getRaidOptions,
  getSquadCleanupEstimate,
  resolveNinthLife,
  resolveRaidDecision,
  resolveRaidFollowup,
  selectResearch,
  serializeState,
  successfulCleanups,
  tick,
} from './simulation.ts'

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

test('five equally productive cats clean five times faster and split fatigue', () => {
  const state = createState()
  const catIds = ['marlowe', 'pixel', 'rust', 'shorokh', 'bastion']
  for (const catId of catIds) {
    const cat = state.cats.find(candidate => candidate.id === catId)!
    cat.cleanupTrait = 0
    assignCat(state, catId, 'alpha')
  }
  const squad = state.squads[0]
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
  assert.equal(squad.phase, 'returning')
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

test('domain log events render in either language with localized parameters', () => {
  const params = { cat: 'cat.pixel.name', squad: 'squad.alpha' }
  assert.equal(translate('ru', 'log.cat_assigned', params), 'Пиксель назначен в Отряд «Альфа»')
  assert.equal(translate('en', 'log.cat_assigned', params), 'Pixel assigned to Squad “Alpha”')
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

  state.speed = 1
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
