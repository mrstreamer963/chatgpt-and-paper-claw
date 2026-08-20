import assert from 'node:assert/strict'
import test from 'node:test'
import { layoutSquadMarkers } from './components/squadMarkerLayout.ts'

const viewport = { width: 800, height: 600, markerSize: 56, gap: 6 }

function pixels(point: { x: number; y: number }) {
  return { x: point.x / 100 * viewport.width, y: point.y / 100 * viewport.height }
}

function assertSeparated(points: Array<{ x: number; y: number }>) {
  const positions = points.map(pixels)
  for (let index = 0; index < positions.length; index++) {
    for (let other = index + 1; other < positions.length; other++) {
      assert.ok(Math.abs(positions[index].x - positions[other].x) >= 62 || Math.abs(positions[index].y - positions[other].y) >= 62)
    }
  }
}

test('squad marker layout keeps a lone squad at its logical position', () => {
  const result = layoutSquadMarkers([{ id: 'alpha', x: 40, y: 30 }], viewport)
  assert.deepEqual(result.get('alpha'), { x: 40, y: 30 })
})

test('squad marker layout separates coincident and partially overlapping markers', () => {
  const result = layoutSquadMarkers([
    { id: 'charlie', x: 50, y: 50 },
    { id: 'alpha', x: 50, y: 50 },
    { id: 'bravo', x: 53, y: 50 },
  ], viewport)
  assertSeparated([...result.values()])
})

test('squad marker layout stays separated at map edges and is deterministic', () => {
  const points = ['delta', 'bravo', 'alpha', 'charlie'].map(id => ({ id, x: 5, y: 7 }))
  const first = layoutSquadMarkers(points, viewport)
  const second = layoutSquadMarkers([...points].reverse(), viewport)
  assert.deepEqual(first, second)
  assertSeparated([...first.values()])
  for (const point of first.values()) {
    const position = pixels(point)
    assert.ok(position.x >= 28 && position.x <= viewport.width - 28)
    assert.ok(position.y >= 28 && position.y <= viewport.height - 28)
  }
})
