import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignCat,
  continueAfterFinale,
  createState,
  equipItem,
  getAchievements,
  resolveNinthLife,
  resolveRaidDecision,
  resolveRaidFollowup,
  selectResearch,
  successfulCleanups,
  tick,
  type State,
} from './simulation.ts'

function advanceUntil(state: State, condition: () => boolean, message: string, maxSteps = 1_000) {
  for (let step = 0; step < maxSteps; step++) {
    if (condition()) return
    tick(state, 0.25)
  }
  assert.fail(message)
}

test('smoke: a new operation reaches and archives the Ninth Life finale', () => {
  const state = createState()

  assert.equal(equipItem(state, 'pixel', 'hands', 'toolkit'), true)
  assert.equal(equipItem(state, 'marlowe', 'belt', 'headset'), true)
  assert.equal(selectResearch(state, 'field_scanners'), true)

  for (const catId of ['pixel', 'rust', 'bastion']) assert.equal(assignCat(state, catId, 'alpha'), true)
  for (const catId of ['marlowe', 'shorokh', 'myata']) assert.equal(assignCat(state, catId, 'bravo'), true)

  state.speed = 10
  advanceUntil(state, () => Boolean(state.incident), 'The scripted raider incident did not open')

  assert.equal(successfulCleanups(state), 2)
  assert.equal(state.incident?.stage, 'decision')
  assert.equal(state.speed, 0)
  if (!state.incident) assert.fail('The raider incident is missing')
  state.incident.supportRoll = 1

  assert.equal(resolveRaidDecision(state, 'support'), true)
  assert.equal(state.incident.stage, 'support_en_route')

  state.speed = 10
  advanceUntil(
    state,
    () => state.incident?.stage === 'support_decision',
    'The support squad did not arrive',
  )

  assert.equal(state.speed, 0)
  assert.equal(resolveRaidFollowup(state, 'continue'), true)
  assert.equal(successfulCleanups(state), 3)
  assert.equal(state.storyIncident?.kind, 'ninth_life')

  assert.equal(resolveNinthLife(state, 'shelter'), true)
  assert.equal(state.fame, 50)
  assert.equal(state.threat, 40)
  assert.equal(state.finalSummaryVisible, true)
  assert.deepEqual(
    getAchievements(state).filter(achievement => achievement.completed).map(achievement => achievement.id),
    ['first_squad', 'field_kit', 'first_cleanup', 'research_started', 'raiders_resolved', 'ninth_life_closed'],
  )

  assert.equal(continueAfterFinale(state), true)
  assert.equal(state.finalSummaryVisible, false)
  assert.equal(state.finalSummarySeen, true)
})
