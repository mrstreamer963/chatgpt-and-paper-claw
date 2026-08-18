import type { GameEvent, State } from './simulation.ts'
import type { WorldPatch } from './protocol.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function worldValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => worldValuesEqual(value, right[index]))
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    return leftKeys.length === rightKeys.length
      && leftKeys.every(key => Object.prototype.hasOwnProperty.call(right, key) && worldValuesEqual(left[key], right[key]))
  }
  return false
}

export function createWorldPatch(
  previous: State,
  next: State,
  baseRevision: number,
  events: GameEvent[] = [],
): WorldPatch | undefined {
  const changes: Partial<State> = {}
  const removedKeys: (keyof State)[] = []
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)] as (keyof State)[])

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) {
      removedKeys.push(key)
      continue
    }
    if (!worldValuesEqual(previous[key], next[key])) {
      Object.assign(changes, { [key]: structuredClone(next[key]) })
    }
  }

  if (Object.keys(changes).length === 0 && removedKeys.length === 0) return undefined
  return {
    kind: 'patch',
    baseRevision,
    revision: baseRevision + 1,
    changes,
    removedKeys,
    events: structuredClone(events),
  }
}
