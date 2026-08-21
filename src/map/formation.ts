export type FormationOffset = { x: number; y: number }

const FIELD_GAP = 30
const BASE_GAP = 24

function centeredRow(count: number, gap: number): FormationOffset[] {
  const center = (count - 1) / 2
  return Array.from({ length: count }, (_, index) => ({ x: (index - center) * gap, y: 0 }))
}

export function formationOffsets(count: number): FormationOffset[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: 0, y: 0 }]
  if (count === 2) return centeredRow(count, FIELD_GAP)
  if (count === 3) return [{ x: 0, y: -FIELD_GAP }, { x: -FIELD_GAP, y: FIELD_GAP }, { x: FIELD_GAP, y: FIELD_GAP }]
  if (count === 4) return [{ x: 0, y: -FIELD_GAP }, { x: -FIELD_GAP, y: 0 }, { x: FIELD_GAP, y: 0 }, { x: 0, y: FIELD_GAP }]

  const columns = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / columns)
  const result: FormationOffset[] = []
  for (let index = 0; index < count; index++) {
    const column = index % columns
    const row = Math.floor(index / columns)
    result.push({
      x: (column - (columns - 1) / 2) * FIELD_GAP,
      y: (row - (rows - 1) / 2) * FIELD_GAP,
    })
  }
  return result
}

export function baseFormationOffsets(count: number): FormationOffset[] {
  if (count <= 0) return []
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(count))))
  const rows = Math.ceil(count / columns)
  return Array.from({ length: count }, (_, index) => ({
    x: (index % columns - (columns - 1) / 2) * BASE_GAP,
    y: (Math.floor(index / columns) - (rows - 1) / 2) * BASE_GAP,
  }))
}
