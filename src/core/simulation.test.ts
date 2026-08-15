import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignCat,
  continueAfterFinale,
  createState,
  equipItem,
  getRaidOptions,
  resolveNinthLife,
  resolveRaidDecision,
  resolveRaidFollowup,
  selectResearch,
  successfulCleanups,
  tick,
} from './simulation.ts'

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
  assert.equal(state.storyResolution?.branch, 'Защита свидетеля')
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
