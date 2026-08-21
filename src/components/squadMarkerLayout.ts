export interface SquadMarkerPoint {
  id: string
  x: number
  y: number
  width?: number
  height?: number
}

export interface SquadMarkerLayoutOptions {
  width: number
  height: number
  markerSize?: number
  gap?: number
  obstacles?: Array<{ id: string; x: number; y: number; size?: number; width?: number; height?: number }>
}

export interface FormationMemberSlot {
  id: string
  x: number
  y: number
  stepDelay: number
}

export interface SquadFormationLayout {
  members: FormationMemberSlot[]
  width: number
  height: number
}

export interface MissionSquadPoint extends SquadMarkerPoint {
  missionId: string
  slot?: number
}

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))

const formationPatterns: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-.5, 0], [.5, 0]],
  3: [[0, -.5], [-.55, .5], [.55, .5]],
  4: [[-.45, -.5], [.45, -.5], [-.55, .5], [.55, .5]],
  5: [[0, -.75], [-.55, 0], [.55, 0], [-.42, .75], [.42, .75]],
  6: [[-.4, -.8], [.4, -.8], [-.65, 0], [.65, 0], [-.4, .8], [.4, .8]],
}

export function layoutSquadFormation(memberIds: string[], direction = { x: 0, y: -1 }): SquadFormationLayout {
  const ids = [...new Set(memberIds)].sort((a, b) => a.localeCompare(b))
  const pattern = formationPatterns[ids.length] ?? ids.map((_, index) => {
    const columns = Math.ceil(Math.sqrt(ids.length))
    const rows = Math.ceil(ids.length / columns)
    return [(index % columns) - (Math.min(columns, ids.length) - 1) / 2, Math.floor(index / columns) - (rows - 1) / 2] as [number, number]
  })
  const length = Math.hypot(direction.x, direction.y)
  const heading = length > 1e-6 ? Math.atan2(direction.y, direction.x) + Math.PI / 2 : 0
  const cosine = Math.cos(heading)
  const sine = Math.sin(heading)
  const members = ids.map((id, index) => {
    const [column, row] = pattern[index]
    const rawX = column * 34
    const rawY = row * 30
    return {
      id,
      x: rawX * cosine - rawY * sine,
      y: rawX * sine + rawY * cosine,
      stepDelay: index * -.09,
    }
  })
  const halfUnitWidth = 19
  const halfUnitHeight = 22
  const width = members.length ? Math.max(...members.map(member => member.x + halfUnitWidth)) - Math.min(...members.map(member => member.x - halfUnitWidth)) + 8 : 0
  const height = members.length ? Math.max(...members.map(member => member.y + halfUnitHeight)) - Math.min(...members.map(member => member.y - halfUnitHeight)) + 8 : 0
  return { members, width, height }
}

/** Stable visual parking slots around a mission. These coordinates are only
 * presentation offsets; simulation positions and arrival checks stay intact. */
export function layoutSquadsAroundMission(
  points: MissionSquadPoint[],
  mission: { x: number; y: number; width?: number; height?: number },
  viewport: { width: number; height: number },
) {
  const sorted = [...points].sort((a, b) => a.id.localeCompare(b.id))
  const missionWidth = mission.width ?? 70
  const missionHeight = mission.height ?? 70
  // A squad owns the same angular slot for its whole lifetime. Adding another
  // squad to the mission therefore cannot rearrange one that is already there.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  return new Map(sorted.map((point, index) => {
    const pointWidth = point.width ?? 56
    const pointHeight = point.height ?? 56
    const radiusX = missionWidth / 2 + pointWidth / 2 + 12
    const radiusY = missionHeight / 2 + pointHeight / 2 + 12
    const angle = Math.PI + (point.slot ?? index) * goldenAngle
    return [point.id, {
      x: clamp(mission.x + Math.cos(angle) * radiusX / viewport.width * 100, pointWidth / 2 / viewport.width * 100, 100 - pointWidth / 2 / viewport.width * 100),
      y: clamp(mission.y + Math.sin(angle) * radiusY / viewport.height * 100, pointHeight / 2 / viewport.height * 100, 100 - pointHeight / 2 / viewport.height * 100),
    }]
  }))
}

export function layoutSquadMarkers(points: SquadMarkerPoint[], options: SquadMarkerLayoutOptions) {
  const markerSize = options.markerSize ?? 56
  const gap = options.gap ?? 6
  const width = Math.max(markerSize, options.width)
  const height = Math.max(markerSize, options.height)
  const placed = [...points]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(point => {
      const pointWidth = point.width ?? markerSize
      const pointHeight = point.height ?? markerSize
      return {
        ...point,
        width: pointWidth,
        height: pointHeight,
        px: clamp(point.x / 100 * width, pointWidth / 2, width - pointWidth / 2),
        py: clamp(point.y / 100 * height, pointHeight / 2, height - pointHeight / 2),
      }
    })
  const obstacles = [...(options.obstacles ?? [])]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(obstacle => {
      const obstacleWidth = obstacle.width ?? obstacle.size ?? markerSize
      const obstacleHeight = obstacle.height ?? obstacle.size ?? markerSize
      return {
        ...obstacle,
        width: obstacleWidth,
        height: obstacleHeight,
        px: clamp(obstacle.x / 100 * width, obstacleWidth / 2, width - obstacleWidth / 2),
        py: clamp(obstacle.y / 100 * height, obstacleHeight / 2, height - obstacleHeight / 2),
      }
    })

  const idAngle = (id: string) => {
    let hash = 0
    for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
    return hash / 0xffffffff * Math.PI * 2
  }

  // Repeated passes let displacement propagate through a cluster while the
  // logical simulation coordinates remain untouched.
  for (let iteration = 0; iteration < 100; iteration++) {
    let collisionFound = false
    for (const point of placed) {
      for (const obstacle of obstacles) {
        let dx = point.px - obstacle.px
        let dy = point.py - obstacle.py
        const clearanceX = (point.width + obstacle.width) / 2 + gap
        const clearanceY = (point.height + obstacle.height) / 2 + gap
        const overlapX = clearanceX - Math.abs(dx)
        const overlapY = clearanceY - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue
        collisionFound = true

        if (dx === 0 && dy === 0) {
          const angle = idAngle(`${obstacle.id}:${point.id}`)
          dx = Math.cos(angle)
          dy = Math.sin(angle)
        }
        if (overlapX <= overlapY) point.px = clamp(point.px + (Math.sign(dx) || 1) * (overlapX + .01), point.width / 2, width - point.width / 2)
        else point.py = clamp(point.py + (Math.sign(dy) || 1) * (overlapY + .01), point.height / 2, height - point.height / 2)
      }
    }

    for (let index = 0; index < placed.length; index++) {
      for (let otherIndex = index + 1; otherIndex < placed.length; otherIndex++) {
        const first = placed[index]
        const second = placed[otherIndex]
        const dx = second.px - first.px
        const dy = second.py - first.py
        const clearanceX = (first.width + second.width) / 2 + gap
        const clearanceY = (first.height + second.height) / 2 + gap
        const overlapX = clearanceX - Math.abs(dx)
        const overlapY = clearanceY - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue
        collisionFound = true

        if (overlapX <= overlapY) {
          const direction = dx === 0 ? (index + otherIndex) % 2 ? 1 : -1 : Math.sign(dx)
          const push = overlapX / 2 + .01
          first.px = clamp(first.px - direction * push, first.width / 2, width - first.width / 2)
          second.px = clamp(second.px + direction * push, second.width / 2, width - second.width / 2)
        } else {
          const direction = dy === 0 ? (index + otherIndex) % 2 ? -1 : 1 : Math.sign(dy)
          const push = overlapY / 2 + .01
          first.py = clamp(first.py - direction * push, first.height / 2, height - first.height / 2)
          second.py = clamp(second.py + direction * push, second.height / 2, height - second.height / 2)
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
