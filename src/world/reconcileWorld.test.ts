import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createState,
  createSquad,
  createWorldPatch,
  hasPendingEquipment,
  type CommandResult,
  type GameCommand,
  type WorldSnapshot,
  type WorldSource,
  type WorldUpdate,
} from '@nine-lives/game-core'
import { computed } from 'vue'
import { WorldProjection, applyWorldPatch, applyWorldSnapshot } from './reconcileWorld.ts'

class FakeWorldSource implements WorldSource {
  listeners = new Set<(update: WorldUpdate) => void>()
  snapshot: WorldSnapshot
  snapshotRequests = 0

  constructor(snapshot: WorldSnapshot) {
    this.snapshot = snapshot
  }

  start() { return Promise.resolve(this.snapshot) }
  dispatch(_command: GameCommand): Promise<CommandResult> { throw new Error('not implemented') }
  serialize() { return Promise.resolve('') }
  importSave() { return Promise.resolve(this.snapshot) }
  reset() { return Promise.resolve(this.snapshot) }
  requestSnapshot() {
    this.snapshotRequests++
    return Promise.resolve(this.snapshot)
  }
  subscribe(listener: (update: WorldUpdate) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  emit(update: WorldUpdate) {
    for (const listener of this.listeners) listener(update)
  }
  dispose() {}
}

function initialSnapshot(): WorldSnapshot {
  return { kind: 'snapshot', revision: 0, state: createState() }
}

test('energy patches preserve the world, collections, entities, inventory and equipment', () => {
  const source = new FakeWorldSource(initialSnapshot())
  const projection = new WorldProjection(source, source.snapshot, () => {})
  const world = projection.state.value
  const cats = world.cats
  const marlowe = world.cats.find(cat => cat.id === 'marlowe')!
  const inventory = world.inventory
  const equipment = marlowe.equipment
  const next = structuredClone(source.snapshot.state)
  next.time = 0.25
  next.cats[0].energy -= 1
  const patch = createWorldPatch(source.snapshot.state, next, 0)!

  source.emit(patch)

  assert.equal(projection.state.value, world)
  assert.equal(world.cats, cats)
  assert.equal(world.cats.find(cat => cat.id === 'marlowe'), marlowe)
  assert.equal(world.inventory, inventory)
  assert.equal(marlowe.equipment, equipment)
  assert.equal(marlowe.energy, next.cats[0].energy)
  projection.dispose()
})

test('equipment patches update only the affected values', () => {
  const snapshot = initialSnapshot()
  const source = new FakeWorldSource(snapshot)
  const projection = new WorldProjection(source, snapshot, () => {})
  const world = projection.state.value
  const marlowe = world.cats.find(cat => cat.id === 'marlowe')!
  const pixel = world.cats.find(cat => cat.id === 'pixel')!
  const equipment = marlowe.equipment
  const inventory = world.inventory
  const next = structuredClone(snapshot.state)
  next.cats[0].equipment.armor = 'armor_vest'
  next.inventory.armor_vest--

  source.emit(createWorldPatch(snapshot.state, next, 0)!)

  assert.equal(world.cats.find(cat => cat.id === 'marlowe'), marlowe)
  assert.equal(world.cats.find(cat => cat.id === 'pixel'), pixel)
  assert.equal(marlowe.equipment, equipment)
  assert.equal(world.inventory, inventory)
  assert.equal(marlowe.equipment.armor, 'armor_vest')
  assert.equal(world.inventory.armor_vest, next.inventory.armor_vest)
  projection.dispose()
})

test('adding a deferred equipment key invalidates Vue computed state', () => {
  const snapshot = initialSnapshot()
  const source = new FakeWorldSource(snapshot)
  const projection = new WorldProjection(source, snapshot, () => {})
  const marlowe = projection.state.value.cats[0]
  const pending = computed(() => hasPendingEquipment(marlowe, 'belt'))
  const selected = computed(() => marlowe.pendingEquipment.belt)
  assert.equal(pending.value, false)
  assert.equal(selected.value, undefined)
  const next = structuredClone(snapshot.state)
  next.cats[0].pendingEquipment.belt = 'medkit'

  source.emit(createWorldPatch(snapshot.state, next, 0)!)

  assert.equal(pending.value, true)
  assert.equal(selected.value, 'medkit')
  projection.dispose()
})

test('adding and removing a deferred assignment invalidates Vue computed state', () => {
  const snapshot = initialSnapshot()
  const source = new FakeWorldSource(snapshot)
  const projection = new WorldProjection(source, snapshot, () => {})
  const marlowe = projection.state.value.cats[0]
  const pending = computed(() => 'pendingAssignment' in marlowe)
  const selected = computed(() => marlowe.pendingAssignment)
  assert.equal(pending.value, false)
  assert.equal(selected.value, undefined)

  const queued = structuredClone(snapshot.state)
  queued.cats[0].pendingAssignment = 'bravo'
  source.emit(createWorldPatch(snapshot.state, queued, 0)!)
  assert.equal(pending.value, true)
  assert.equal(selected.value, 'bravo')

  const applied = structuredClone(queued)
  delete applied.cats[0].pendingAssignment
  source.emit(createWorldPatch(queued, applied, 1)!)
  assert.equal(pending.value, false)
  assert.equal(selected.value, undefined)
  projection.dispose()
})

test('mission reconciliation preserves remaining entities and mutates member arrays in place', () => {
  const snapshot = initialSnapshot()
  createSquad(snapshot.state)
  const target = structuredClone(snapshot.state)
  const firstMission = target.missions[0]
  const secondMission = target.missions[1]
  const members = target.squads[0].members
  const next = structuredClone(snapshot.state)
  next.missions = [next.missions[1], {
    id: 'new-mission', title: 'mission.new', x: 10, y: 20, priority: 2, status: 'available',
    progress: 0, interruptionPolicy: 'preserve_progress', squadIds: [], contributorSquadIds: [],
  }]
  next.squads[0].members = ['marlowe', 'pixel']
  const patch = createWorldPatch(snapshot.state, next, 0)!

  applyWorldPatch(target, patch)

  assert.equal(target.missions[0], secondMission)
  assert.equal(target.missions.includes(firstMission), false)
  assert.equal(target.missions[1].id, 'new-mission')
  assert.equal(target.squads[0].members, members)
  assert.deepEqual(members, ['marlowe', 'pixel'])
})

test('optional fields are deleted recursively and snapshots restore without replacing identities', () => {
  const target = createState()
  target.storyIncident = { kind: 'ninth_life', participantSquadIds: [], x: 1, y: 2 }
  target.cats[0].assignedTo = 'alpha'
  const world = target
  const cats = target.cats
  const marlowe = target.cats[0]
  const fresh = createState()

  applyWorldSnapshot(target, { kind: 'snapshot', revision: 9, state: fresh })

  assert.equal(target, world)
  assert.equal(target.cats, cats)
  assert.equal(target.cats[0], marlowe)
  assert.equal('storyIncident' in target, false)
  assert.equal('assignedTo' in marlowe, false)
  assert.deepEqual(target, fresh)
})

test('a revision gap rejects the patch and requests a full snapshot', async () => {
  const initial = initialSnapshot()
  const recovered = structuredClone(initial.state)
  recovered.fame = 77
  const source = new FakeWorldSource(initial)
  source.snapshot = { kind: 'snapshot', revision: 5, state: recovered }
  const projection = new WorldProjection(source, initial, () => {})

  source.emit({
    kind: 'patch', baseRevision: 3, revision: 4, changes: { fame: 999 }, removedKeys: [], events: [],
  })
  await new Promise(resolve => setTimeout(resolve, 0))

  assert.equal(source.snapshotRequests, 1)
  assert.equal(projection.state.value.fame, 77)
  projection.dispose()
})

test('a non-sequential revision also triggers snapshot recovery', async () => {
  const initial = initialSnapshot()
  const recovered = structuredClone(initial.state)
  recovered.scrap = 42
  const source = new FakeWorldSource(initial)
  source.snapshot = { kind: 'snapshot', revision: 4, state: recovered }
  const projection = new WorldProjection(source, initial, () => {})

  source.emit({
    kind: 'patch', baseRevision: 0, revision: 3, changes: { scrap: 999 }, removedKeys: [], events: [],
  })
  await new Promise(resolve => setTimeout(resolve, 0))

  assert.equal(source.snapshotRequests, 1)
  assert.equal(projection.state.value.scrap, 42)
  projection.dispose()
})
