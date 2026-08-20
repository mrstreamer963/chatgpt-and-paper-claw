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

  // Resolve every collision by pushing both participants equally. Repeating the
  // pass lets the displacement propagate through a whole group like a force field.
  for (let iteration = 0; iteration < 100; iteration++) {
    let collisionFound = false
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
