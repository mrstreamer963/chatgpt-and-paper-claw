import {
  GameCore,
  SaveError,
  createState,
  createWorldPatch,
  deserializeCurrentSave,
  type GameEvent,
  type SerializedWorldError,
  type State,
  type WorldRequest,
  type WorldResponse,
  type WorldSnapshot,
} from '@nine-lives/game-core'

type LocalWorkerScope = {
  postMessage(message: WorldResponse): void
  onmessage: ((event: MessageEvent<WorldRequest>) => void) | null
}

const workerScope = self as unknown as LocalWorkerScope
let core: GameCore | undefined
let publishedState: State | undefined
let revision = 0
let tickTimer: ReturnType<typeof setInterval> | undefined

function post(response: WorldResponse) {
  workerScope.postMessage(response)
}

function serializeError(error: unknown): SerializedWorldError {
  if (error instanceof SaveError) {
    return { name: error.name, message: error.message, key: error.key, params: error.params }
  }
  if (error instanceof Error) return { name: error.name, message: error.message }
  return { name: 'Error', message: String(error) }
}

function requireCore() {
  if (!core) throw new Error('The world has not been started')
  return core
}

function snapshot(): WorldSnapshot {
  return { kind: 'snapshot', revision, state: requireCore().snapshot() }
}

function publish(events: GameEvent[] = []) {
  const world = requireCore()
  const next = world.snapshot()
  if (!publishedState) {
    publishedState = next
    return
  }
  const patch = createWorldPatch(publishedState, next, revision, events)
  if (!patch) return
  revision = patch.revision
  publishedState = next
  post({ type: 'update', update: patch })
}

function startTicking() {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = setInterval(() => {
    const world = requireCore()
    world.tick(0.25)
    publish(world.drainEvents())
  }, 250)
}

function replaceWorld(state: State) {
  requireCore().replaceState(state)
  requireCore().drainEvents()
  revision++
  publishedState = requireCore().snapshot()
  const update: WorldSnapshot = { kind: 'snapshot', revision, state: structuredClone(publishedState) }
  post({ type: 'update', update })
  return update
}

workerScope.onmessage = (event: MessageEvent<WorldRequest>) => {
  const request = event.data
  try {
    if (request.type === 'start') {
      const initialState = request.save ? deserializeCurrentSave(request.save) : createState()
      core = new GameCore(initialState)
      revision = 0
      publishedState = core.snapshot()
      startTicking()
      post({ type: 'snapshot_result', requestId: request.requestId, snapshot: snapshot() })
      return
    }

    if (request.type === 'command') {
      const world = requireCore()
      const accepted = world.dispatch(request.command)
      publish(world.drainEvents())
      post({ type: 'command_result', result: { requestId: request.requestId, accepted, revision } })
      return
    }

    if (request.type === 'serialize') {
      post({ type: 'serialize_result', requestId: request.requestId, payload: requireCore().serialize(request.pretty) })
      return
    }

    if (request.type === 'import') {
      const update = replaceWorld(deserializeCurrentSave(request.payload))
      post({ type: 'snapshot_result', requestId: request.requestId, snapshot: update })
      return
    }

    if (request.type === 'reset') {
      const update = replaceWorld(createState())
      post({ type: 'snapshot_result', requestId: request.requestId, snapshot: update })
      return
    }

    post({ type: 'snapshot_result', requestId: request.requestId, snapshot: snapshot() })
  } catch (error) {
    post({ type: 'error', requestId: request.requestId, error: serializeError(error) })
  }
}
