export interface SquadMarkerPoint {
  id: string
  x: number
  y: number
}

export interface SquadMarkerLayoutOptions {
  width: number
  height: number
  markerSize?: number
  gap?: number
  obstacles?: Array<{ id: string; x: number; y: number; size: number }>
}

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))

export function layoutSquadMarkers(points: SquadMarkerPoint[], options: SquadMarkerLayoutOptions) {
  const markerSize = options.markerSize ?? 56
  const gap = options.gap ?? 6
  const spacing = markerSize + gap
  const half = markerSize / 2
  const width = Math.max(markerSize, options.width)
  const height = Math.max(markerSize, options.height)
  const placed = [...points]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(point => ({
      ...point,
      px: clamp(point.x / 100 * width, half, width - half),
      py: clamp(point.y / 100 * height, half, height - half),
    }))
  const obstacles = [...(options.obstacles ?? [])]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(obstacle => ({
      ...obstacle,
      px: clamp(obstacle.x / 100 * width, obstacle.size / 2, width - obstacle.size / 2),
      py: clamp(obstacle.y / 100 * height, obstacle.size / 2, height - obstacle.size / 2),
    }))

  const idAngle = (id: string) => {
    let hash = 0
    for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
    return hash / 0xffffffff * Math.PI * 2
  }

  // Resolve every collision by pushing both participants equally. Repeating the
  // pass lets the displacement propagate through a whole group like a force field.
  for (let iteration = 0; iteration < 100; iteration++) {
    let collisionFound = false
    for (const point of placed) {
      for (const obstacle of obstacles) {
        let dx = point.px - obstacle.px
        let dy = point.py - obstacle.py
        const clearance = markerSize / 2 + obstacle.size / 2 + gap
        const overlapX = clearance - Math.abs(dx)
        const overlapY = clearance - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue
        collisionFound = true

        if (dx === 0 && dy === 0) {
          const angle = idAngle(`${obstacle.id}:${point.id}`)
          dx = Math.cos(angle)
          dy = Math.sin(angle)
        }
        const distance = Math.hypot(dx, dy)
        const unitX = dx / distance
        const unitY = dy / distance
        const pushX = Math.abs(unitX) > 0.001 ? overlapX / Math.abs(unitX) : Number.POSITIVE_INFINITY
        const pushY = Math.abs(unitY) > 0.001 ? overlapY / Math.abs(unitY) : Number.POSITIVE_INFINITY
        const push = Math.min(pushX, pushY) + 0.01
        point.px = clamp(point.px + unitX * push, half, width - half)
        point.py = clamp(point.py + unitY * push, half, height - half)
      }
    }

    for (let index = 0; index < placed.length; index++) {
      for (let otherIndex = index + 1; otherIndex < placed.length; otherIndex++) {
        const first = placed[index]
        const second = placed[otherIndex]
        const dx = second.px - first.px
        const dy = second.py - first.py
        const overlapX = spacing - Math.abs(dx)
        const overlapY = spacing - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue
        collisionFound = true

        if (overlapX <= overlapY) {
          const direction = dx === 0 ? (index + otherIndex) % 2 ? 1 : -1 : Math.sign(dx)
          const push = overlapX / 2 + 0.01
          first.px = clamp(first.px - direction * push, half, width - half)
          second.px = clamp(second.px + direction * push, half, width - half)
        } else {
          const direction = dy === 0 ? (index + otherIndex) % 2 ? -1 : 1 : Math.sign(dy)
          const push = overlapY / 2 + 0.01
          first.py = clamp(first.py - direction * push, half, height - half)
          second.py = clamp(second.py + direction * push, half, height - half)
        }
      }
    }
    if (!collisionFound) break
  }

  return new Map(placed.map(point => [point.id, {
    x: point.px / width * 100,
    y: point.py / height * 100,
  }]))
}
