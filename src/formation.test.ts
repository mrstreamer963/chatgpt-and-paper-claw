import test from 'node:test'
import assert from 'node:assert/strict'
import { baseFormationOffsets, formationOffsets } from './map/formation.ts'

test('field formations are stable and contain one offset per member', () => {
  for (let count = 0; count <= 12; count++) {
    const offsets = formationOffsets(count)
    assert.equal(offsets.length, count)
    assert.equal(new Set(offsets.map(offset => `${offset.x}:${offset.y}`)).size, count)
    assert.deepEqual(offsets, formationOffsets(count))
  }
})

test('small field formations are centered and symmetric', () => {
  assert.deepEqual(formationOffsets(1), [{ x: 0, y: 0 }])
  assert.deepEqual(formationOffsets(2).map(offset => offset.x), [-15, 15])
  assert.equal(formationOffsets(3).reduce((sum, offset) => sum + offset.x, 0), 0)
  assert.equal(formationOffsets(4).reduce((sum, offset) => sum + offset.y, 0), 0)
})

test('base formations separate cats without changing their logical anchor', () => {
  const offsets = baseFormationOffsets(6)
  assert.equal(offsets.length, 6)
  assert.equal(new Set(offsets.map(offset => `${offset.x}:${offset.y}`)).size, 6)
  assert.ok(offsets.some(offset => offset.x < 0))
  assert.ok(offsets.some(offset => offset.x > 0))
})
