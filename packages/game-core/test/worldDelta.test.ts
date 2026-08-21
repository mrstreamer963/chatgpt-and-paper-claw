import assert from 'node:assert/strict'
import test from 'node:test'
import { createState, createWorldPatch } from '../src/index.ts'

test('world patches contain complete changed top-level slices and monotonic revisions', () => {
  const previous = createState()
  const next = structuredClone(previous)
  next.time = 0.25
  next.cats[0].energy -= 0.5

  const patch = createWorldPatch(previous, next, 7, [{
    type: 'mission_started',
    squadId: 'alpha',
    missionId: 'mission-1',
  }])

  assert.ok(patch)
  assert.equal(patch.baseRevision, 7)
  assert.equal(patch.revision, 8)
  assert.deepEqual(Object.keys(patch.changes).sort(), ['cats', 'time'])
  assert.deepEqual(patch.changes.cats, next.cats)
  assert.notEqual(patch.changes.cats, next.cats)
  assert.deepEqual(structuredClone(patch), patch)
  assert.doesNotThrow(() => JSON.stringify(patch))
})

test('unchanged worlds do not publish a patch or advance a revision', () => {
  const state = createState()
  assert.equal(createWorldPatch(state, structuredClone(state), 3), undefined)
})

test('top-level optional fields are represented as removals', () => {
  const previous = createState()
  previous.storyIncident = { kind: 'ninth_life', participantSquadIds: ['alpha'], x: 1, y: 2 }
  const next = structuredClone(previous)
  delete next.storyIncident

  const patch = createWorldPatch(previous, next, 2)

  assert.ok(patch)
  assert.deepEqual(patch.removedKeys, ['storyIncident'])
  assert.deepEqual(patch.changes, {})
})
