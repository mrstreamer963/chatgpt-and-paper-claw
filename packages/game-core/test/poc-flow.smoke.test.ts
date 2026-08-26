import assert from 'node:assert/strict'
import test from 'node:test'
import {
  continueAfterFinale,
  createState,
  createSquad,
  assignCat,
  assignSquadToMission,
  drainEvents,
  dispatchWaterFilters,
  equipItem,
  getAchievements,
  resolvePoliceContainer,
  selectResearch,
  successfulCleanups,
  tick,
  type State,
} from '../src/simulation.ts'

function advanceUntil(state: State, condition: () => boolean, message: string, maxSteps = 1_000) {
  for (let step = 0; step < maxSteps; step++) {
    if (condition()) return
    tick(state, 0.25)
  }
  assert.fail(message)
}

test('smoke: a new operation completes and archives the First Shift causal report', () => {
  const state = createState()

  assert.equal(equipItem(state, 'pixel', 'hands', 'toolkit'), true)
  assert.equal(equipItem(state, 'marlowe', 'belt', 'headset'), true)
  assert.equal(selectResearch(state, 'field_scanners'), true)

  assert.equal(createSquad(state), true)
  assert.equal(createSquad(state), true)
  for (const catId of ['pixel', 'rust', 'bastion']) assert.equal(assignCat(state, catId, 'squad-1'), true)
  for (const catId of ['marlowe', 'shorokh', 'myata']) assert.equal(assignCat(state, catId, 'squad-2'), true)
  state.squads.forEach(squad => { squad.autoDispatch = false })
  assert.equal(assignSquadToMission(state, 'squad-1', state.missions[0].id), true)

  state.speed = 10
  advanceUntil(state, () => state.firstShift.stage === 'container', 'The Police container contact did not open')
  assert.equal(state.speed, 0)
  const container = state.missions.find(mission => mission.kind === 'police_contact')!
  assert.equal(state.districts.residential_ring.access, 'contact')
  assert.equal(assignSquadToMission(state, 'squad-2', container.id), true)
  state.speed = 10
  advanceUntil(state, () => Boolean(state.firstShift.containerSquadId), 'The squad did not reach the Police container')
  assert.equal(state.speed, 0)
  assert.equal(resolvePoliceContainer(state, 'independent_sample'), true)
  assert.equal(state.districts.residential_ring.access, 'operational')
  assert.equal(state.firstShift.filterSample, true)
  const duty = state.missions.find(mission => mission.kind === 'residential_duty')!
  assert.equal(assignSquadToMission(state, 'squad-2', duty.id), true)
  state.speed = 1
  tick(state, 0.25)
  state.speed = 0
  assert.equal(dispatchWaterFilters(state, 'squad-1'), true)
  state.speed = 10
  advanceUntil(state, () => state.finalSummaryVisible, 'The First Shift causal report did not open')

  assert.equal(state.finalSummaryVisible, true)
  assert.equal(state.firstShift.stage, 'summary')
  assert.equal(state.firstShift.residentialDutyOutcome, 'completed')
  assert.equal(state.firstShift.southNodeOutcome, 'full')
  assert.equal(successfulCleanups(state), 1)
  const eventTypes = drainEvents(state).map(event => event.type)
  const requiredEventOrder = [
    'achievement_unlocked',
    'research_started',
    'mission_started',
    'mission_completed',
    'urgent_operation_dispatched',
    'urgent_operation_resolved',
    'final_summary_available',
  ] as const
  let eventCursor = -1
  for (const eventType of requiredEventOrder) {
    eventCursor = eventTypes.indexOf(eventType, eventCursor + 1)
    assert.notEqual(eventCursor, -1, `Missing or out-of-order domain event: ${eventType}`)
  }
  assert.deepEqual(
    getAchievements(state).filter(achievement => achievement.completed).map(achievement => achievement.id),
    ['first_squad', 'field_kit', 'first_cleanup', 'research_started'],
  )

  assert.equal(continueAfterFinale(state), true)
  assert.equal(state.finalSummaryVisible, false)
  assert.equal(state.finalSummarySeen, true)
  assert.equal(state.campaignPhase, 'peace_sandbox')
})
