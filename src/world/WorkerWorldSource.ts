import {
  SaveError,
  type CommandResult,
  type GameCommand,
  type SaveErrorKey,
  type SerializedWorldError,
  type WorldRequest,
  type WorldResponse,
  type WorldSnapshot,
  type WorldSource,
  type WorldUpdate,
} from '@nine-lives/game-core'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

function restoreError(error: SerializedWorldError) {
  if (error.key) return new SaveError(error.key as SaveErrorKey, error.params)
  const restored = new Error(error.message)
  restored.name = error.name
  return restored
}

export class WorkerWorldSource implements WorldSource {
  private readonly worker: Worker
  private readonly listeners = new Set<(update: WorldUpdate) => void>()
  private readonly pending = new Map<number, PendingRequest>()
  private readonly bufferedUpdates: WorldUpdate[] = []
  private requestSerial = 0
  private disposed = false

  constructor() {
    this.worker = new Worker(new URL('./localWorld.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = event => this.handleMessage(event.data as WorldResponse)
    this.worker.onerror = event => {
      const error = new Error(event.message || 'Game worker failed')
      for (const request of this.pending.values()) request.reject(error)
      this.pending.clear()
    }
  }

  private nextRequestId() {
    return ++this.requestSerial
  }

  private request<T>(message: WorldRequest): Promise<T> {
    if (this.disposed) return Promise.reject(new Error('World source is disposed'))
    return new Promise<T>((resolve, reject) => {
      this.pending.set(message.requestId, { resolve: resolve as (value: unknown) => void, reject })
      this.worker.postMessage(message)
    })
  }

  private settle(requestId: number, value: unknown) {
    const request = this.pending.get(requestId)
    if (!request) return
    this.pending.delete(requestId)
    request.resolve(value)
  }

  private handleMessage(response: WorldResponse) {
    if (response.type === 'update') {
      if (this.listeners.size === 0) this.bufferedUpdates.push(response.update)
      else for (const listener of this.listeners) listener(response.update)
      return
    }
    if (response.type === 'error') {
      const error = restoreError(response.error)
      if (response.requestId !== undefined) {
        const request = this.pending.get(response.requestId)
        this.pending.delete(response.requestId)
        request?.reject(error)
      }
      return
    }
    if (response.type === 'command_result') {
      this.settle(response.result.requestId, response.result)
      return
    }
    if (response.type === 'serialize_result') {
      this.settle(response.requestId, response.payload)
      return
    }
    this.settle(response.requestId, response.snapshot)
  }

  start(save?: string) {
    const requestId = this.nextRequestId()
    return this.request<WorldSnapshot>({ type: 'start', requestId, save })
  }

  dispatch(command: GameCommand) {
    const requestId = this.nextRequestId()
    return this.request<CommandResult>({ type: 'command', requestId, command })
  }

  serialize(pretty = true) {
    const requestId = this.nextRequestId()
    return this.request<string>({ type: 'serialize', requestId, pretty })
  }

  importSave(payload: string) {
    const requestId = this.nextRequestId()
    return this.request<WorldSnapshot>({ type: 'import', requestId, payload })
  }

  reset() {
    const requestId = this.nextRequestId()
    return this.request<WorldSnapshot>({ type: 'reset', requestId })
  }

  requestSnapshot() {
    const requestId = this.nextRequestId()
    return this.request<WorldSnapshot>({ type: 'snapshot', requestId })
  }

  subscribe(listener: (update: WorldUpdate) => void) {
    this.listeners.add(listener)
    if (this.bufferedUpdates.length) {
      for (const update of this.bufferedUpdates.splice(0)) listener(update)
    }
    return () => this.listeners.delete(listener)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.worker.terminate()
    const error = new Error('World source was disposed')
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
    this.listeners.clear()
    this.bufferedUpdates.length = 0
  }
}
