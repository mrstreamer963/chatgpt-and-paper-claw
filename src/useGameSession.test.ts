import assert from 'node:assert/strict'
import test from 'node:test'
import { replaceObjectState } from './core/replaceState.ts'
import { createState } from './core/simulation.ts'

test('replacing a session removes optional state left by the previous operation', () => {
  const state = createState()
  state.storyTriggered = true
  state.storyIncident = {
    kind: 'ninth_life',
    foundBySquadId: 'alpha',
    x: 62,
    y: 34,
  }

  const freshState = createState()
  replaceObjectState(state, freshState)

  assert.deepEqual(state, freshState)
  assert.equal('storyIncident' in state, false)
})
