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
  const placed: Array<SquadMarkerPoint & { px: number; py: number }> = []

  const overlaps = (px: number, py: number) => placed.some(other =>
    Math.abs(other.px - px) < spacing && Math.abs(other.py - py) < spacing)

  for (const point of [...points].sort((a, b) => a.id.localeCompare(b.id))) {
    const originX = clamp(point.x / 100 * width, half, width - half)
    const originY = clamp(point.y / 100 * height, half, height - half)
    let selected = { px: originX, py: originY }

    if (overlaps(selected.px, selected.py)) {
      let found = false
      for (let ring = 1; ring <= 12 && !found; ring++) {
        const slots = ring * 8
        for (let slot = 0; slot < slots; slot++) {
          const angle = -Math.PI / 2 + slot / slots * Math.PI * 2
          const px = clamp(originX + Math.cos(angle) * spacing * ring, half, width - half)
          const py = clamp(originY + Math.sin(angle) * spacing * ring, half, height - half)
          if (!overlaps(px, py)) {
            selected = { px, py }
            found = true
            break
          }
        }
      }
    }

    placed.push({ ...point, ...selected })
  }

  return new Map(placed.map(point => [point.id, {
    x: point.px / width * 100,
    y: point.py / height * 100,
  }]))
}
