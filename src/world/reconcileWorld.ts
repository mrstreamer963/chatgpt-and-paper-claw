import { reactive, shallowRef, type ShallowRef } from 'vue'
import type { GameEvent, State, WorldPatch, WorldSnapshot, WorldSource, WorldUpdate } from '@nine-lives/game-core'

type MutableRecord = Record<string, unknown>

function isRecord(value: unknown): value is MutableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasEntityId(value: unknown): value is MutableRecord & { id: string } {
  return isRecord(value) && typeof value.id === 'string'
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function reconcileArray(target: unknown[], source: unknown[]) {
  const entityArray = source.every(hasEntityId) && target.every(value => hasEntityId(value))
  if (entityArray) {
    const existing = new Map(target.filter(hasEntityId).map(value => [value.id, value]))
    const ordered = source.map(value => {
      const current = existing.get(value.id)
      if (!current) return clone(value)
      reconcileObject(current, value)
      return current
    })
    const orderChanged = ordered.length !== target.length || ordered.some((value, index) => value !== target[index])
    if (orderChanged) target.splice(0, target.length, ...ordered)
    return
  }

  const commonLength = Math.min(target.length, source.length)
  for (let index = 0; index < commonLength; index++) reconcileProperty(target, index, source[index])
  if (target.length > source.length) target.splice(source.length)
  if (source.length > target.length) target.push(...source.slice(target.length).map(clone))
}

function reconcileProperty(target: MutableRecord | unknown[], key: string | number, next: unknown) {
  const current = target[key as keyof typeof target]
  if (Object.is(current, next)) return
  if (Array.isArray(current) && Array.isArray(next)) {
    reconcileArray(current, next)
    return
  }
  if (isRecord(current) && isRecord(next)) {
    reconcileObject(current, next)
    return
  }
  Object.assign(target, { [key]: clone(next) })
}

function reconcileObject(target: MutableRecord, source: MutableRecord) {
  for (const key of Object.keys(target)) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) Reflect.deleteProperty(target, key)
  }
  for (const [key, value] of Object.entries(source)) reconcileProperty(target, key, value)
}

export function applyWorldSnapshot(target: State, snapshot: WorldSnapshot) {
  reconcileObject(target as unknown as MutableRecord, snapshot.state as unknown as MutableRecord)
}

export function applyWorldPatch(target: State, patch: WorldPatch) {
  for (const key of patch.removedKeys) Reflect.deleteProperty(target, key)
  for (const [key, value] of Object.entries(patch.changes)) {
    reconcileProperty(target as unknown as MutableRecord, key, value)
  }
}

export class WorldProjection {
  readonly state: ShallowRef<State>
  private readonly source: WorldSource
  private readonly onEvents: (events: GameEvent[]) => void
  private revision: number
  private unsubscribe: () => void
  private resyncing = false

  constructor(
    source: WorldSource,
    initial: WorldSnapshot,
    onEvents: (events: GameEvent[]) => void,
  ) {
    this.source = source
    this.onEvents = onEvents
    this.revision = initial.revision
    this.state = shallowRef(reactive(clone(initial.state)) as State)
    this.unsubscribe = source.subscribe(update => this.apply(update))
  }

  private apply(update: WorldUpdate) {
    if (update.kind === 'snapshot') {
      applyWorldSnapshot(this.state.value, update)
      this.revision = update.revision
      return
    }
    if (this.resyncing) return
    if (update.baseRevision !== this.revision || update.revision !== update.baseRevision + 1) {
      void this.resync()
      return
    }
    applyWorldPatch(this.state.value, update)
    this.revision = update.revision
    this.onEvents(update.events)
  }

  private async resync() {
    if (this.resyncing) return
    this.resyncing = true
    try {
      const snapshot = await this.source.requestSnapshot()
      applyWorldSnapshot(this.state.value, snapshot)
      this.revision = snapshot.revision
    } finally {
      this.resyncing = false
    }
  }

  dispose() {
    this.unsubscribe()
  }
}
