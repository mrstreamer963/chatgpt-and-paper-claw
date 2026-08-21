import assert from 'node:assert/strict'
import test from 'node:test'
import { layoutSquadFormation, layoutSquadMarkers } from './components/squadMarkerLayout.ts'

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
  assert.notDeepEqual(result.get('alpha'), { x: 50, y: 50 })
  assert.notDeepEqual(result.get('charlie'), { x: 50, y: 50 })
})

test('squad marker layout pushes two coincident squads equally in opposite directions', () => {
  const result = layoutSquadMarkers([
    { id: 'alpha', x: 50, y: 50 },
    { id: 'bravo', x: 50, y: 50 },
  ], viewport)
  const alpha = pixels(result.get('alpha')!)
  const bravo = pixels(result.get('bravo')!)
  assert.equal((alpha.x + bravo.x) / 2, viewport.width / 2)
  assert.equal((alpha.y + bravo.y) / 2, viewport.height / 2)
  assertSeparated([...result.values()])
})

test('squad marker layout treats a mission as a fixed repelling center', () => {
  const result = layoutSquadMarkers([
    { id: 'alpha', x: 50, y: 50 },
    { id: 'bravo', x: 51, y: 50 },
  ], {
    ...viewport,
    obstacles: [{ id: 'mission-a', x: 50, y: 50, size: 44 }],
  })
  const mission = { x: viewport.width / 2, y: viewport.height / 2 }
  for (const point of result.values()) {
    const position = pixels(point)
    assert.ok(Math.abs(position.x - mission.x) >= 56 || Math.abs(position.y - mission.y) >= 56)
  }
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

test('field formation assigns every member a stable independent slot', () => {
  const first = layoutSquadFormation(['rust', 'marlowe', 'pixel'])
  const second = layoutSquadFormation(['pixel', 'rust', 'marlowe'])

  assert.deepEqual(first, second)
  assert.deepEqual(first.members.map(member => member.id), ['marlowe', 'pixel', 'rust'])
  assert.equal(new Set(first.members.map(member => `${member.x}:${member.y}`)).size, 3)
  assert.ok(first.width > 38)
  assert.ok(first.height > 44)
})

test('field formation rotates its slots toward the route without rotating member identity', () => {
  const north = layoutSquadFormation(['marlowe', 'pixel', 'rust'], { x: 0, y: -1 })
  const east = layoutSquadFormation(['marlowe', 'pixel', 'rust'], { x: 1, y: 0 })

  assert.deepEqual(north.members.map(member => member.id), east.members.map(member => member.id))
  assert.notDeepEqual(north.members.map(({ x, y }) => ({ x, y })), east.members.map(({ x, y }) => ({ x, y })))
  assert.ok(east.height > north.height)
  assert.ok(east.width < north.width)
})

test('squad marker layout separates rectangular formation footprints and keeps them on screen', () => {
  const result = layoutSquadMarkers([
    { id: 'alpha', x: 50, y: 50, width: 110, height: 60 },
    { id: 'bravo', x: 50, y: 50, width: 54, height: 96 },
  ], { width: viewport.width, height: viewport.height, gap: 8 })
  const alpha = pixels(result.get('alpha')!)
  const bravo = pixels(result.get('bravo')!)

  assert.ok(Math.abs(alpha.x - bravo.x) >= 90 || Math.abs(alpha.y - bravo.y) >= 86)
  assert.ok(alpha.x >= 55 && alpha.x <= viewport.width - 55)
  assert.ok(alpha.y >= 30 && alpha.y <= viewport.height - 30)
  assert.ok(bravo.x >= 27 && bravo.x <= viewport.width - 27)
  assert.ok(bravo.y >= 48 && bravo.y <= viewport.height - 48)
})
