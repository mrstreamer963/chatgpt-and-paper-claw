import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignCat,
  checkIncident,
  createSquad,
  createState,
  getOperationalQueue,
  getPoliceSupportOption,
  getVisibleHeadquarters,
  requestPoliceSupport,
  resolveNinthLife,
  resolvePoliceContainer,
  tick,
  type NinthLifeDecision,
  type State,
  type StoryFact,
} from '../src/simulation.ts'
import { CITY_PLACES, CITY_QUARTERS, DISTRICT_DEFINITIONS, LOCAL_STREETS, ROUTE_EDGES, ROUTE_NODES, planOperationalRoute } from '../src/campaign.ts'

test('the city transport graph has seven outer districts, a complete orbital road, radials, and special links', () => {
  assert.equal(DISTRICT_DEFINITIONS.length, 8, 'service core plus seven outer districts')
  assert.ok(ROUTE_NODES.length >= 20 && ROUTE_NODES.length <= 30)

  const outerRing = ROUTE_EDGES.filter(edge => edge.kind === 'outer_ring')
  const ringNodeIds = new Set(outerRing.flatMap(edge => [edge.from, edge.to]))
  assert.equal(ringNodeIds.size, 8)
  for (const nodeId of ringNodeIds) {
    assert.equal(outerRing.filter(edge => edge.from === nodeId || edge.to === nodeId).length, 2)
  }

  assert.ok(ROUTE_EDGES.filter(edge => edge.kind === 'radial').length >= 4)
  assert.ok(ROUTE_EDGES.filter(edge => edge.kind === 'shortcut').length >= 5)
})

test('the hybrid city gives every district physical quarters and local streets without making them dynamic state', () => {
  assert.ok(CITY_QUARTERS.length >= 25 && CITY_QUARTERS.length <= 35)
  for (const district of DISTRICT_DEFINITIONS) {
    assert.ok(CITY_QUARTERS.filter(quarter => quarter.districtId === district.id).length >= 3)
    assert.ok(LOCAL_STREETS.some(street => street.districtId === district.id))
  }
  assert.ok(CITY_PLACES.filter(place => place.kind === 'square').length >= 4)
  assert.ok(CITY_QUARTERS.some(quarter => quarter.significant))
})

test('the city starts as known silhouettes with only sanctioned operational corridors', () => {
  const state = createState()

  assert.equal(state.campaignPhase, 'peace_first_shift')
  assert.equal(state.districts.service_core.access, 'operational')
  assert.equal(state.districts.north_bastion.access, 'contact')
  assert.equal(state.districts.residential_ring.access, 'silhouette')
  assert.deepEqual(getVisibleHeadquarters(state).map(hq => hq.id), ['monolith'])
  assert.ok(planOperationalRoute(state.districts, { x: 46, y: 51 }, { x: 48, y: 17 }))
  assert.equal(planOperationalRoute(state.districts, { x: 46, y: 51 }, { x: 75, y: 25 }), undefined)

  const queue = getOperationalQueue(state)
  assert.deepEqual(queue.map(item => item.missionId), ['monolith-service-1'])
  assert.equal(queue[0].deadline, 120)
})

test('travel within an operational district uses the direct route instead of detouring through a graph node', () => {
  const state = createState()
  const origin = { x: 46, y: 51 }
  const cleanup = { x: 47, y: 39 }

  const route = planOperationalRoute(state.districts, origin, cleanup)

  assert.deepEqual(route?.points, [origin, cleanup])
  assert.equal(route?.distance, Math.hypot(cleanup.x - origin.x, cleanup.y - origin.y))
})

test('all four container decisions open the district but preserve distinct causal consequences', () => {
  const expected = {
    police_handoff: { police: 60, monolith: 70, risk: 15, delay: 15, sample: false },
    independent_sample: { police: 45, monolith: 70, risk: 20, delay: 0, sample: true },
    call_monolith: { police: 35, monolith: 60, risk: 25, delay: 30, sample: false },
    ignore: { police: 35, monolith: 70, risk: 30, delay: 45, sample: false },
  } as const

  for (const [decision, outcome] of Object.entries(expected)) {
    const state = createState()
    state.firstShift.stage = 'container'
    state.firstShift.stageStartedAt = 10
    state.firstShift.containerDeadline = 100
    state.firstShift.containerSquadId = decision === 'ignore' ? undefined : 'test-squad'
    state.time = 10

    assert.equal(resolvePoliceContainer(state, decision as keyof typeof expected), true)
    assert.equal(state.districts.residential_ring.access, 'operational')
    assert.equal(state.relations.police, outcome.police)
    assert.equal(state.relations.green_monolith, outcome.monolith)
    assert.equal(state.districts.residential_ring.risk, outcome.risk)
    assert.equal(state.firstShift.filterWarningAt, state.time + outcome.delay)
    assert.equal(state.firstShift.filterSample, outcome.sample)
    assert.equal(state.urgentOperation?.deadline, state.time + 90)
  }
})

function storyState(facts: StoryFact[], relation = 50) {
  const state = createState()
  state.campaignPhase = 'post_cataclysm'
  state.relations.needle_front = relation
  state.storyTriggered = true
  state.storyIncident = {
    kind: 'ninth_life',
    stage: 'contact',
    participantSquadIds: [],
    x: 78,
    y: 23,
    stageStartedAt: 0,
    facts: structuredClone(facts),
  }
  return state
}

const reportedFacts: StoryFact[] = [
  { id: 'deserter_identity', quality: 'reported', source: 'needle' },
  { id: 'pursuit', quality: 'estimate', source: 'dispatch' },
  { id: 'base_coordinates', quality: 'reported', source: 'needle' },
  { id: 'border_route', quality: 'stale', source: 'dispatch' },
]

test('Ninth Life keeps hidden, search-area, false-lead, and exact-HQ outcomes distinct', () => {
  const cases: Array<{ decision: NinthLifeDecision; facts: StoryFact[]; knowledge: State['hedgehogHqKnowledge'] }> = [
    { decision: 'shelter', facts: reportedFacts, knowledge: 'hidden' },
    { decision: 'interrogate', facts: reportedFacts.map(fact => fact.id === 'deserter_identity' ? { ...fact, quality: 'confirmed', source: 'marlowe' } : fact.id === 'base_coordinates' ? { ...fact, quality: 'estimate', source: 'marlowe' } : fact), knowledge: 'search_area' },
    { decision: 'exploit', facts: reportedFacts, knowledge: 'false_lead' },
    { decision: 'exploit', facts: reportedFacts.map(fact => ['deserter_identity', 'base_coordinates'].includes(fact.id) ? { ...fact, quality: 'confirmed' } : fact), knowledge: 'confirmed' },
  ]

  for (const scenario of cases) {
    const state = storyState(scenario.facts)
    assert.equal(resolveNinthLife(state, scenario.decision), true)
    assert.equal(state.hedgehogHqKnowledge, scenario.knowledge)
    assert.equal(state.storyResolution?.locationKnowledge, scenario.knowledge)
    assert.equal(getVisibleHeadquarters(state).some(hq => hq.id === 'needle-front-depot'), scenario.knowledge === 'confirmed')
  }
})

test('exact HQ discovery charges both the story decision and the additional intrusion cost', () => {
  const facts = reportedFacts.map(fact => ['deserter_identity', 'base_coordinates'].includes(fact.id)
    ? { ...fact, quality: 'confirmed' as const }
    : fact)
  const state = storyState(facts, 50)

  assert.equal(resolveNinthLife(state, 'exploit'), true)
  assert.equal(state.relations.needle_front, 25)
  assert.equal(state.storyResolution?.frontRelationDelta, -25)
  assert.equal(state.needleTrust, -10)
  assert.equal(state.factionMemory.some(memory => memory.kind === 'hq_compromised'), true)
})

function frontRaidState(policeRelation = 50) {
  const state = createState()
  state.campaignPhase = 'peace_sandbox'
  state.firstShift.stage = 'complete'
  state.districts.service_core.access = 'operational'
  state.missions = [{
    id: 'front-contact', title: 'mission.a', kind: 'municipal', districtId: 'service_core', createdAt: 0,
    x: 46, y: 51, priority: 1, status: 'assigned', progress: 14,
    interruptionPolicy: 'preserve_progress', squadIds: ['squad-1'], contributorSquadIds: [],
  }]
  createSquad(state)
  assignCat(state, 'marlowe', 'squad-1')
  assignCat(state, 'shorokh', 'squad-1')
  const squad = state.squads[0]
  squad.phase = 'cleanup'
  squad.missionId = 'front-contact'
  squad.target = { id: 'front-contact', title: 'mission.a', x: 46, y: 51, priority: 1 }
  state.completedMissionCount = 2
  state.relations.police = policeRelation
  state.speed = 1
  tick(state, 1)
  assert.ok(state.incident)
  return state
}

test('a Front cell starts unidentified and negotiated contact cannot exceed neutrality 50', () => {
  const state = frontRaidState()
  state.relations.needle_front = 45
  assert.equal(state.incident?.actualActor, 'needle_front')
  assert.equal(state.incident?.knownActor, undefined)

  assert.equal(checkIncident(state, 'recon'), true)
  tick(state, 10)
  assert.equal(state.incident?.knownActor, 'needle_front')
  assert.equal(checkIncident(state, 'contact'), true)
  tick(state, 15)

  assert.equal(state.incident, undefined)
  assert.equal(state.relations.needle_front, 50)
  assert.equal(state.factionMemory.some(memory => memory.kind === 'cell_negotiated'), true)
})

test('Police support remains available at low trust, arrives physically, and costs Front relation', () => {
  const state = frontRaidState(20)
  assert.deepEqual(getPoliceSupportOption(state), { available: true, seconds: 16, reason: undefined })
  assert.equal(requestPoliceSupport(state), true)
  assert.equal(state.externalUnits.patrol_12.status, 'en_route')
  assert.equal(state.incident?.stage, 'police_en_route')

  tick(state, 16)

  assert.equal(state.incident, undefined)
  assert.equal(state.externalUnits.patrol_12.status, 'on_scene')
  assert.equal(state.relations.needle_front, 15)
  assert.equal(state.factionMemory.some(memory => memory.kind === 'cell_suppressed'), true)
})
