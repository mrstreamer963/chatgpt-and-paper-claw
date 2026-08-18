import type { GameCommand, GameEvent, State } from './simulation.ts'

export type WorldSnapshot = {
  kind: 'snapshot'
  revision: number
  state: State
}

export type WorldPatch = {
  kind: 'patch'
  baseRevision: number
  revision: number
  changes: Partial<State>
  removedKeys: (keyof State)[]
  events: GameEvent[]
}

export type WorldUpdate = WorldSnapshot | WorldPatch

export type CommandResult = {
  requestId: number
  accepted: boolean
  revision: number
}

export type SerializedWorldError = {
  name: string
  message: string
  key?: string
  params?: Record<string, string | number>
}

export type WorldRequest =
  | { type: 'start'; requestId: number; save?: string }
  | { type: 'command'; requestId: number; command: GameCommand }
  | { type: 'serialize'; requestId: number; pretty: boolean }
  | { type: 'import'; requestId: number; payload: string }
  | { type: 'reset'; requestId: number }
  | { type: 'snapshot'; requestId: number }

export type WorldResponse =
  | { type: 'update'; update: WorldUpdate }
  | { type: 'snapshot_result'; requestId: number; snapshot: WorldSnapshot }
  | { type: 'command_result'; result: CommandResult }
  | { type: 'serialize_result'; requestId: number; payload: string }
  | { type: 'error'; requestId?: number; error: SerializedWorldError }

export interface WorldSource {
  start(save?: string): Promise<WorldSnapshot>
  dispatch(command: GameCommand): Promise<CommandResult>
  serialize(pretty?: boolean): Promise<string>
  importSave(payload: string): Promise<WorldSnapshot>
  reset(): Promise<WorldSnapshot>
  requestSnapshot(): Promise<WorldSnapshot>
  subscribe(listener: (update: WorldUpdate) => void): () => void
  dispose(): void
}
