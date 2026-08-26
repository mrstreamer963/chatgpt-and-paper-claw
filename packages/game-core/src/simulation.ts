import { SIMULATION_CONFIG as CONFIG } from './config.ts'
import {
  createInitialDistrictStates,
  createInitialExternalUnits,
  createInitialFirstShift,
  getDistrictAtPoint,
  planOperationalRoute,
  positionAlongRoute,
  relationBand,
  relationMaximum,
  type CampaignPhase,
  type ContainerDecision,
  type DistrictId,
  type DistrictState,
  type ExternalUnitId,
  type ExternalUnitState,
  type FactionMemoryEvent,
  type FirstShiftState,
  type LocationKnowledge,
  type MapPoint,
} from './campaign.ts'

export type {
  CampaignPhase,
  ContainerDecision,
  DistrictId,
  DistrictState,
  ExternalUnitId,
  ExternalUnitState,
  FactionMemoryEvent,
  FirstShiftState,
  LocationKnowledge,
  MapPoint,
} from './campaign.ts'

export type Speed = 0 | 1 | 5 | 10
export type SquadStyle = 'careful' | 'balanced' | 'risky'
export type EquipmentSlot = 'armor' | 'suit' | 'belt' | 'hands'
export type ItemId = 'armor_vest' | 'toolkit' | 'headset' | 'medkit' | 'scanner' | 'nonlethal_weapon'
export type ResearchId = 'field_scanners' | 'emergency_dispatch' | 'improvised_defense'
export type AchievementId = 'first_squad' | 'field_kit' | 'first_cleanup' | 'research_started' | 'raiders_resolved' | 'ninth_life_closed'
export type Equipment = Record<EquipmentSlot, ItemId | undefined>
export type PendingEquipment = Partial<Record<EquipmentSlot, ItemId | null>>
export type Cat = {
  id: string
  name: string
  role: string
  energy: number
  reaction: number
  combat: number
  tech: number
  perception: number
  scouting: number
  cleanupTrait: number
  supportTrait: number
  attackTrait: number
  injuryTrait: number
  sleeping: boolean
  assignedTo?: string
  pendingAssignment?: string | null
  injuredRemaining: number
  equipment: Equipment
  pendingEquipment: PendingEquipment
}

export type CatTraitPresentation = {
  trait: string
  action: string
  value: number
  format: 'bonus' | 'reduction'
}
export type MissionInterruptionPolicy = 'preserve_progress' | 'reset' | 'fail' | 'remove' | 'scripted'
export type Mission = {
  id: string
  title: string
  x: number
  y: number
  priority: number
  status: 'available' | 'assigned' | 'completed'
  progress: number
  interruptionPolicy: MissionInterruptionPolicy
  squadIds: string[]
  contributorSquadIds: string[]
  kind: 'municipal' | 'monolith_service' | 'police_contact' | 'residential_duty'
  districtId: DistrictId
  createdAt: number
  deadline?: number
}
export type MissionSquadRoster = {
  squad: Squad
  members: Cat[]
}
export type OperationalQueueItem = {
  id: string
  kind: 'mission' | 'urgent' | 'story'
  title: string
  status: string
  priority: number
  createdAt: number
  deadline?: number
  districtId?: DistrictId
  missionId?: string
  progress?: number
  remainingSeconds?: number
}
export type DeployOrder = { type: 'mission'; missionId: string } | { type: 'move'; x: number; y: number }
export type Phase = 'base' | 'field' | 'moving' | 'outbound' | 'cleanup' | 'incident' | 'support' | 'returning' | 'merging' | 'urgent'
export type Squad = {
  id: string
  name: string
  customName?: string
  members: string[]
  style: SquadStyle
  autoDispatch: boolean
  phase: Phase
  travel: number
  travelDuration: number
  completed: number
  routeFrom: MapPoint
  route: MapPoint[]
  restAfterReturn: boolean
  missionId?: string
  target?: Pick<Mission, 'id' | 'title' | 'x' | 'y' | 'priority'>
  destination?: MapPoint
  mergeTargetSquadId?: string
  mergePoint?: MapPoint
  missionArrivalTime?: number
}
export type ContactThreat = 'harmless' | 'armed' | 'heavy'
export type IncidentCheck = 'observe' | 'recon' | 'scan' | 'contact'
export type RaidStage = 'decision' | 'checking' | 'support_en_route' | 'support_decision' | 'monolith_en_route' | 'police_en_route'
export type RaidIncident = {
  kind: 'raiders'
  stage: RaidStage
  missionId: string
  supportSquadId?: string
  supportChance: number
  attackChance: number
  supportRoll: number
  attackRoll: number
  injuryRoll: number
  injuredMemberRoll: number
  participantSquadIds: string[]
  threatClass: ContactThreat
  threatRoll: number
  monolithRoll: number
  monolithRequested: boolean
  intelConfirmed: boolean
  clues: string[]
  actualActor: 'bandits' | 'needle_front'
  knownActor?: 'bandits' | 'needle_front'
  check?: IncidentCheck
  checkEndsAt?: number
}
export type RelationOwnerId = 'green_monolith' | 'police' | 'space_agency' | 'chemical_lab' | 'physics_lab' | 'biological_lab' | 'computer_lab' | 'shrey_clinic' | 'weapon_trader' | 'vehicle_trader' | 'needle_front'
export type Headquarters = { id: string; ownerId: RelationOwnerId; districtId: DistrictId; name: string; function: string; x: number; y: number; hidden?: boolean }
export type Cordon = { id: string; x: number; y: number; radius: number; startedAt: number; endsAt: number; threatClass: ContactThreat; affectedOwnerIds: RelationOwnerId[] }
export type MonolithState = { status: 'available' | 'en_route'; x: number; y: number; from: MapPoint; target?: MapPoint; travel: number; travelDuration: number; nextServiceAt: number }
export type NinthLifeDecision = 'shelter' | 'interrogate' | 'escort' | 'exploit'
export type NinthLifeStage = 'signal' | 'dispatch' | 'contact' | 'verification' | 'intervention'
export type NinthLifeInaction = 'self_evacuating' | 'pursued'
export type NinthLifeFactId = 'deserter_identity' | 'pursuit' | 'base_coordinates' | 'border_route'
export type IntelQuality = 'confirmed' | 'estimate' | 'reported' | 'stale' | 'lost_contact'
export type IntelSource = 'needle' | 'dispatch' | 'marlowe' | 'shorokh' | 'field_scan'
export type NinthLifeVerification = 'interview' | 'recon' | 'deescalation'
export type NinthLifeIntervention = 'myata_retreat' | 'bastion_intercept' | 'shorokh_false_alarm'
export type NinthLifeInterventionPreview = { kind: NinthLifeIntervention; catId: 'myata' | 'bastion' | 'shorokh'; reason: string; threatDelta: number; delay: number }
export type StoryFact = { id: NinthLifeFactId; quality: IntelQuality; source: IntelSource }
export type StoryIncident = {
  kind: 'ninth_life'
  stage: NinthLifeStage
  participantSquadIds: string[]
  x: number
  y: number
  stageStartedAt: number
  deadline?: number
  dispatchedSquadId?: string
  inaction?: NinthLifeInaction
  facts: StoryFact[]
  verification?: NinthLifeVerification
  pendingDecision?: NinthLifeDecision
  intervention?: NinthLifeIntervention
  deescalated?: boolean
}
export type StoryResolution = {
  decision: NinthLifeDecision
  title: string
  fameDelta: number
  threatDelta: number
  branch: string
  outcome: string
  unlockedLocation: boolean
  locationKnowledge: LocationKnowledge
  frontRelationDelta: number
  needleTrustDelta: number
  intervention?: NinthLifeIntervention
  participantCatIds?: string[]
  facts?: StoryFact[]
  deescalated?: boolean
  inaction?: NinthLifeInaction
}
export type StoryObserver = {
  status: 'hidden' | 'revealed' | 'tracking' | 'gone'
  x: number; y: number; fromX: number; fromY: number; targetX: number; targetY: number
  movementStartedAt: number; movementEndsAt: number
}
export type StoryAftermathKind = 'base_marked' | 'safe_route' | 'intercepted_transmission' | 'false_entrance'
export type StoryAftermath = { kind: StoryAftermathKind; status: 'pending' | 'completed'; dueAt: number; x: number; y: number }
export type UrgentOperationStatus = 'pending' | 'available' | 'dispatch' | 'active' | 'completed' | 'failed'
export type UrgentOperation = {
  kind: 'water_filters'
  status: UrgentOperationStatus
  x: number
  y: number
  availableAt: number
  deadline: number
  dispatchedSquadId?: string
  workRemaining?: number
  fullReward?: boolean
  sampleApplied?: boolean
}

function initialNinthLifeFacts(): StoryFact[] {
  return [
    { id: 'deserter_identity', quality: 'reported', source: 'needle' },
    { id: 'pursuit', quality: 'estimate', source: 'dispatch' },
    { id: 'base_coordinates', quality: 'reported', source: 'needle' },
    { id: 'border_route', quality: 'stale', source: 'dispatch' },
  ]
}
export type LogEntry = { time: number; key: string; params?: Record<string, string | number> }
export type GameEvent =
  | { type: 'mission_started'; squadId: string; missionId: string }
  | { type: 'mission_completed'; squadIds: string[]; missionId: string }
  | { type: 'mission_failed'; squadIds: string[]; missionId?: string; reason: 'escape' | 'attack' | 'support' | 'recalled' | 'retreat' }
  | { type: 'incident_started'; incident: 'raiders'; squadIds: string[]; missionId: string }
  | { type: 'support_requested'; squadId: string; missionId: string; seconds: number }
  | { type: 'support_arrived'; squadId: string; missionId: string }
  | { type: 'cat_injured'; catId: string; seconds: number }
  | { type: 'research_started'; researchId: ResearchId }
  | { type: 'research_completed'; researchId: ResearchId }
  | { type: 'achievement_unlocked'; achievementId: AchievementId }
  | { type: 'story_started'; story: 'ninth_life'; squadIds: string[] }
  | { type: 'story_dispatched'; story: 'ninth_life'; squadId: string; seconds: number }
  | { type: 'story_stage_changed'; story: 'ninth_life'; stage: NinthLifeStage; reason: 'arrival' | 'deadline' }
  | { type: 'urgent_operation_started'; operation: 'water_filters'; deadline: number }
  | { type: 'urgent_operation_dispatched'; operation: 'water_filters'; squadId: string }
  | { type: 'urgent_operation_resolved'; operation: 'water_filters'; outcome: 'completed' | 'failed' }
  | { type: 'story_resolved'; story: 'ninth_life'; decision: NinthLifeDecision }
  | { type: 'final_summary_available' }
  | { type: 'squad_split'; squadId: string; newSquadId: string; memberIds: string[] }
  | { type: 'squad_merge_started'; sourceSquadId: string; targetSquadId: string }
  | { type: 'squad_merged'; sourceSquadId: string; targetSquadId: string }
  | { type: 'mission_squad_assigned'; squadId: string; missionId: string }
  | { type: 'incident_checked'; check: IncidentCheck; confirmed: boolean }
  | { type: 'monolith_response'; accepted: boolean; missionId: string }
  | { type: 'cordon_started'; cordonId: string }
  | { type: 'cordon_ended'; cordonId: string }
export type State = {
  fame: number
  scrap: number
  corporateThreat: number
  campaignPhase: CampaignPhase
  districts: Record<DistrictId, DistrictState>
  firstShift: FirstShiftState
  speed: Speed
  time: number
  simulationRemainder: number
  cats: Cat[]
  squads: Squad[]
  squadSerial: number
  disbandedSquadCleanups: number
  completedMissionCount: number
  missions: Mission[]
  missionSerial: number
  rngSeed: number
  raidTriggered: boolean
  incident?: RaidIncident
  storyTriggered: boolean
  storyIncident?: StoryIncident
  storyResolution?: StoryResolution
  storyObserver?: StoryObserver
  storyAftermath?: StoryAftermath
  urgentOperation?: UrgentOperation
  relations: Record<RelationOwnerId, number>
  relationLastEvent: Partial<Record<RelationOwnerId, string>>
  factionMemory: FactionMemoryEvent[]
  hedgehogHqKnowledge: LocationKnowledge
  needleTrust: number
  monolith: MonolithState
  externalUnits: Record<ExternalUnitId, ExternalUnitState>
  cordons: Cordon[]
  finalSummaryVisible: boolean
  finalSummarySeen: boolean
  inventory: Record<ItemId, number>
  research: {
    activeId?: ResearchId
    workerCatId?: string
    nodes: Record<ResearchId, { progress: number; scrapSpent: number; spendClock: number; completed: boolean }>
  }
  achievements: { completedIds: AchievementId[] }
  log: LogEntry[]
}
export type RaidOption = { available: boolean; chance?: number; reason?: string }
export type RaidSupportCandidate = {
  squadId: string
  squadName: string
  memberIds: string[]
  chance: number
  location: 'base' | 'field'
}
export type CleanupEstimate = {
  members: number
  baseRate: number
  traitRate: number
  equipmentRate: number
  totalRate: number
  seconds: number
  energyPerCat: number
}
export type Achievement = {
  id: AchievementId
  title: string
  description: string
  hint: string
  completed: boolean
}

export const SAVE_FORMAT = 'nine-lives-corp-save'
export const SAVE_VERSION = 25
export const GAME_VERSION = '0.1.0'
export const SIMULATION_STEP_SECONDS = 0.25
export type SaveErrorKey =
  | 'save.error.invalid_json'
  | 'save.error.unknown_format'
  | 'save.error.unsupported_version'
  | 'save.error.invalid_date'
  | 'save.error.corrupted'

export class SaveError extends Error {
  readonly key: SaveErrorKey
  readonly params: Record<string, string | number>

  constructor(key: SaveErrorKey, params: Record<string, string | number> = {}) {
    super(key)
    this.name = 'SaveError'
    this.key = key
    this.params = params
  }
}

export type SaveEnvelope = {
  format: typeof SAVE_FORMAT
  version: typeof SAVE_VERSION
  saveVersion: typeof SAVE_VERSION
  gameVersion: typeof GAME_VERSION
  savedAt: string
  state: State
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'completed'>[] = [
  { id: 'first_squad', title: 'achievement.first_squad.title', description: 'achievement.first_squad.description', hint: 'achievement.first_squad.hint' },
  { id: 'field_kit', title: 'achievement.field_kit.title', description: 'achievement.field_kit.description', hint: 'achievement.field_kit.hint' },
  { id: 'first_cleanup', title: 'achievement.first_cleanup.title', description: 'achievement.first_cleanup.description', hint: 'achievement.first_cleanup.hint' },
  { id: 'research_started', title: 'achievement.research_started.title', description: 'achievement.research_started.description', hint: 'achievement.research_started.hint' },
  { id: 'raiders_resolved', title: 'achievement.raiders_resolved.title', description: 'achievement.raiders_resolved.description', hint: 'achievement.raiders_resolved.hint' },
  { id: 'ninth_life_closed', title: 'achievement.ninth_life_closed.title', description: 'achievement.ninth_life_closed.description', hint: 'achievement.ninth_life_closed.hint' },
]

export const EQUIPMENT_SLOTS: { id: EquipmentSlot; name: string }[] = [
  { id: 'armor', name: 'slot.armor' },
  { id: 'suit', name: 'slot.suit' },
  { id: 'belt', name: 'slot.belt' },
  { id: 'hands', name: 'slot.hands' },
]

export const ITEM_DEFINITIONS = CONFIG.equipment.items
export const RESEARCH_DEFINITIONS = CONFIG.research.nodes
export const RESEARCH_RULES = {
  duration: CONFIG.research.duration,
  scrapCost: CONFIG.research.scrapCost,
  supportTravelTime: CONFIG.raid.supportTravelTime,
  researchedSupportTravelTime: CONFIG.raid.researchedSupportTravelTime,
}
export const GAME_RULES = {
  fameGoal: CONFIG.goal.fame,
  cleanupWork: CONFIG.mission.cleanupWork,
  raidTriggerWork: CONFIG.mission.raidTriggerWork,
  cleanupRewardScrap: CONFIG.mission.rewardScrap,
  guaranteedChance: CONFIG.chance.maximum,
  minimumResearchEnergy: CONFIG.research.minimumStartEnergy,
  sleepAtEnergy: CONFIG.sleep.sleepAtEnergy,
  wakeForOrderEnergy: CONFIG.sleep.wakeForOrderEnergy,
  elevatedThreat: CONFIG.threat.elevated,
  severeThreat: CONFIG.threat.severe,
}
export const STORY_DECISION_BALANCE = CONFIG.story.decisions

const templates: Mission[] = CONFIG.mission.templates.map(template => ({
  ...template,
  kind: 'municipal',
  districtId: getDistrictAtPoint(template),
  createdAt: 0,
  status: 'available',
  progress: 0,
  interruptionPolicy: 'preserve_progress',
  squadIds: [],
  contributorSquadIds: [],
}))
export const HEADQUARTERS: Headquarters[] = [
  { id: 'monolith', ownerId: 'green_monolith', districtId: 'north_bastion', name: 'hq.monolith.name', function: 'hq.monolith.function', x: 48, y: 14 },
  { id: 'police', ownerId: 'police', districtId: 'residential_ring', name: 'hq.police.name', function: 'hq.police.function', x: 75, y: 25 },
  { id: 'space-agency', ownerId: 'space_agency', districtId: 'orbital_harbor', name: 'hq.space_agency.name', function: 'hq.space_agency.function', x: 70, y: 74 },
  { id: 'spaceport', ownerId: 'space_agency', districtId: 'orbital_harbor', name: 'hq.spaceport.name', function: 'hq.spaceport.function', x: 81, y: 82 },
  { id: 'chemical-lab', ownerId: 'chemical_lab', districtId: 'material_contour', name: 'hq.chemical_lab.name', function: 'hq.chemical_lab.function', x: 41, y: 84 },
  { id: 'physics-lab', ownerId: 'physics_lab', districtId: 'material_contour', name: 'hq.physics_lab.name', function: 'hq.physics_lab.function', x: 53, y: 87 },
  { id: 'biological-lab', ownerId: 'biological_lab', districtId: 'biomedical_belt', name: 'hq.biological_lab.name', function: 'hq.biological_lab.function', x: 14, y: 73 },
  { id: 'shrey-clinic', ownerId: 'shrey_clinic', districtId: 'biomedical_belt', name: 'hq.shrey_clinic.name', function: 'hq.shrey_clinic.function', x: 23, y: 81 },
  { id: 'computer-lab', ownerId: 'computer_lab', districtId: 'network_quarter', name: 'hq.computer_lab.name', function: 'hq.computer_lab.function', x: 14, y: 43 },
  { id: 'weapon-trader', ownerId: 'weapon_trader', districtId: 'commercial_arc', name: 'hq.weapon_trader.name', function: 'hq.weapon_trader.function', x: 83, y: 43 },
  { id: 'vehicle-trader', ownerId: 'vehicle_trader', districtId: 'commercial_arc', name: 'hq.vehicle_trader.name', function: 'hq.vehicle_trader.function', x: 89, y: 53 },
  { id: 'needle-front-depot', ownerId: 'needle_front', districtId: 'residential_ring', name: 'hq.needle_front.name', function: 'hq.needle_front.function', x: 83, y: 17, hidden: true },
]

export function getVisibleHeadquarters(state: State) {
  return HEADQUARTERS.filter(hq => {
    if (hq.hidden) return state.hedgehogHqKnowledge === 'confirmed'
    const access = state.districts[hq.districtId].access
    return access === 'operational' || access === 'contact'
  })
}

const initialRelations = (): Record<RelationOwnerId, number> => ({
  green_monolith: CONFIG.raid.monolith.initialTrust, police: 50, space_agency: 50,
  chemical_lab: 50, physics_lab: 50, biological_lab: 50, computer_lab: 50,
  shrey_clinic: 50, weapon_trader: 50, vehicle_trader: 50,
  needle_front: CONFIG.factions.needleFront.initialRelation,
})
const pendingEvents = new WeakMap<State, GameEvent[]>()

function emitEvent(state: State, event: GameEvent) {
  const events = pendingEvents.get(state)
  if (events) events.push(event)
  else pendingEvents.set(state, [event])
}

export function drainEvents(state: State) {
  const events = pendingEvents.get(state) ?? []
  pendingEvents.delete(state)
  return events
}

export function createState(): State {
  const emptyEquipment = (): Equipment => ({ armor: undefined, suit: undefined, belt: undefined, hands: undefined })
  return {
    fame: CONFIG.initial.fame,
    scrap: CONFIG.initial.scrap,
    corporateThreat: CONFIG.initial.corporateThreat,
    campaignPhase: 'peace_first_shift',
    districts: createInitialDistrictStates(),
    firstShift: createInitialFirstShift(),
    speed: 0,
    time: 0,
    simulationRemainder: 0,
    cats: CONFIG.cats.map(cat => ({ ...cat, sleeping: false, injuredRemaining: 0, equipment: emptyEquipment(), pendingEquipment: {} })),
    squadSerial: 0,
    disbandedSquadCleanups: 0,
    completedMissionCount: 0,
    missions: [
      ...structuredClone(templates.slice(0, CONFIG.mission.initialAvailableCount)),
      { id: 'monolith-service-1', title: 'mission.monolith_service', kind: 'monolith_service', districtId: 'north_bastion', createdAt: 0, deadline: CONFIG.firstShift.monolithDeadline, x: 48, y: 17, priority: 3, status: 'available', progress: 0, interruptionPolicy: 'preserve_progress', squadIds: [], contributorSquadIds: [] },
    ],
    missionSerial: 0,
    rngSeed: CONFIG.initial.rngSeed,
    raidTriggered: false,
    storyTriggered: false,
    relations: initialRelations(),
    relationLastEvent: {},
    factionMemory: [],
    hedgehogHqKnowledge: 'hidden',
    needleTrust: 0,
    monolith: { status: 'available', x: CONFIG.map.monolith.x, y: CONFIG.map.monolith.y, from: { ...CONFIG.map.monolith }, travel: 0, travelDuration: 0, nextServiceAt: 1_000_000_000 },
    externalUnits: createInitialExternalUnits(),
    cordons: [],
    finalSummaryVisible: false,
    finalSummarySeen: false,
    inventory: Object.fromEntries(CONFIG.equipment.items.map(item => [item.id, item.initialCount])) as Record<ItemId, number>,
    research: {
      nodes: {
        field_scanners: { progress: 0, scrapSpent: 0, spendClock: 0, completed: false },
        emergency_dispatch: { progress: 0, scrapSpent: 0, spendClock: 0, completed: false },
        improvised_defense: { progress: 0, scrapSpent: 0, spendClock: 0, completed: false },
      },
    },
    achievements: { completedIds: [] },
    squads: [],
    log: [{ time: 0, key: 'log.base_ready' }],
  }
}

function note(state: State, key: string, params?: Record<string, string | number>) {
  const displayedParams = params && Object.fromEntries(Object.entries(params).map(([param, value]) => {
    const squad = typeof value === 'string' ? state.squads.find(candidate => candidate.name === value) : undefined
    return [param, squad ? getSquadDisplayName(squad) : value]
  }))
  state.log = [{ time: state.time, key, params: displayedParams }, ...state.log].slice(0, CONFIG.mission.eventLogLimit)
}

function achievementCondition(state: State, id: AchievementId) {
  if (id === 'first_squad') return state.squads.some(squad => squad.members.length > 0)
  if (id === 'field_kit') return state.cats.some(cat => Object.values(cat.equipment).some(Boolean))
  if (id === 'first_cleanup') return successfulCleanups(state) >= 1
  if (id === 'research_started') return Boolean(state.research.activeId)
    || Object.values(state.research.nodes).some(node => node.progress > 0 || node.completed)
  if (id === 'raiders_resolved') return state.raidTriggered && !state.incident
  return Boolean(state.storyResolution)
}

export function syncAchievements(state: State) {
  const unlocked: AchievementId[] = []
  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    if (state.achievements.completedIds.includes(achievement.id) || !achievementCondition(state, achievement.id)) continue
    state.achievements.completedIds.push(achievement.id)
    unlocked.push(achievement.id)
    note(state, 'log.achievement', { achievement: achievement.title })
    emitEvent(state, { type: 'achievement_unlocked', achievementId: achievement.id })
  }
  return unlocked
}

export function getAchievements(state: State): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS
    .filter(achievement => achievement.id !== 'ninth_life_closed' || state.campaignPhase === 'post_cataclysm')
    .map(achievement => ({
      ...achievement,
      completed: state.achievements.completedIds.includes(achievement.id),
    }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidEquipment(value: unknown) {
  if (!isRecord(value)) return false
  return EQUIPMENT_SLOTS.every(slot => value[slot.id] === undefined
    || ITEM_DEFINITIONS.some(item => item.id === value[slot.id] && item.slot === slot.id))
}

function isValidPendingEquipment(value: unknown) {
  if (!isRecord(value)) return false
  return EQUIPMENT_SLOTS.every(slot => value[slot.id] === undefined
    || value[slot.id] === null
    || ITEM_DEFINITIONS.some(item => item.id === value[slot.id] && item.slot === slot.id))
}

function isValidCat(value: unknown) {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.role !== 'string') return false
  const numericFields = ['energy', 'reaction', 'combat', 'tech', 'perception', 'scouting', 'cleanupTrait', 'supportTrait', 'attackTrait', 'injuryTrait', 'injuredRemaining']
  return numericFields.every(field => isFiniteNumber(value[field]))
    && typeof value.sleeping === 'boolean'
    && (value.assignedTo === undefined || typeof value.assignedTo === 'string')
    && (value.pendingAssignment === undefined || value.pendingAssignment === null || typeof value.pendingAssignment === 'string')
    && isValidEquipment(value.equipment)
    && isValidPendingEquipment(value.pendingEquipment)
}

function isValidTarget(value: unknown): value is NonNullable<Squad['target']> {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string'
    && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.priority)
}

function isValidMapPoint(value: unknown) {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
}

function isValidSquad(value: unknown) {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return false
  if (value.customName !== undefined && (typeof value.customName !== 'string' || value.customName.length < 1 || value.customName.length > 32)) return false
  if (!Array.isArray(value.members) || !value.members.every(member => typeof member === 'string')) return false
  if (!['careful', 'balanced', 'risky'].includes(value.style as string)
    || !['base', 'field', 'moving', 'outbound', 'cleanup', 'incident', 'support', 'returning', 'merging', 'urgent'].includes(value.phase as string)) return false
  if (typeof value.autoDispatch !== 'boolean') return false
  if (!isValidMapPoint(value.routeFrom) || typeof value.restAfterReturn !== 'boolean') return false
  if (!Array.isArray(value.route) || !value.route.every(isValidMapPoint)) return false
  if (![value.travel, value.travelDuration, value.completed].every(isFiniteNumber)) return false
  return (value.missionId === undefined || typeof value.missionId === 'string')
    && (value.target === undefined || isValidTarget(value.target))
    && (value.destination === undefined || isValidMapPoint(value.destination))
    && (value.mergeTargetSquadId === undefined || typeof value.mergeTargetSquadId === 'string')
    && (value.mergePoint === undefined || isValidMapPoint(value.mergePoint))
    && (value.missionArrivalTime === undefined || isFiniteNumber(value.missionArrivalTime))
    && (value.phase !== 'moving' || isValidMapPoint(value.destination))
    && (value.phase !== 'merging' || (typeof value.mergeTargetSquadId === 'string' && isValidMapPoint(value.mergePoint)))
}

function isValidMission(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string'
    && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.priority)
    && isFiniteNumber(value.progress) && ['municipal', 'monolith_service', 'police_contact', 'residential_duty'].includes(value.kind as string)
    && Object.keys(createInitialDistrictStates()).includes(String(value.districtId))
    && isFiniteNumber(value.createdAt)
    && (value.deadline === undefined || isFiniteNumber(value.deadline))
    && ['preserve_progress', 'reset', 'fail', 'remove', 'scripted'].includes(value.interruptionPolicy as string)
    && ['available', 'assigned', 'completed'].includes(value.status as string)
    && Array.isArray(value.squadIds) && value.squadIds.every(id => typeof id === 'string')
    && Array.isArray(value.contributorSquadIds) && value.contributorSquadIds.every(id => typeof id === 'string')
}

function isValidIncident(value: unknown) {
  if (!isRecord(value)) return false
  const rolls = ['supportChance', 'attackChance', 'supportRoll', 'attackRoll', 'injuryRoll', 'injuredMemberRoll']
  return value.kind === 'raiders' && ['decision', 'checking', 'support_en_route', 'support_decision', 'monolith_en_route', 'police_en_route'].includes(value.stage as string)
    && typeof value.missionId === 'string'
    && (value.supportSquadId === undefined || typeof value.supportSquadId === 'string')
    && Array.isArray(value.participantSquadIds) && value.participantSquadIds.every(id => typeof id === 'string')
    && rolls.every(field => isFiniteNumber(value[field]))
    && ['harmless', 'armed', 'heavy'].includes(value.threatClass as string)
    && isFiniteNumber(value.threatRoll) && isFiniteNumber(value.monolithRoll)
    && typeof value.monolithRequested === 'boolean' && typeof value.intelConfirmed === 'boolean'
    && Array.isArray(value.clues) && value.clues.every(clue => typeof clue === 'string')
    && ['bandits', 'needle_front'].includes(String(value.actualActor))
    && (value.knownActor === undefined || ['bandits', 'needle_front'].includes(String(value.knownActor)))
}

function isValidStoryIncident(value: unknown) {
  return isRecord(value) && value.kind === 'ninth_life'
    && ['signal', 'dispatch', 'contact', 'verification', 'intervention'].includes(value.stage as string)
    && Array.isArray(value.participantSquadIds) && value.participantSquadIds.every(id => typeof id === 'string')
    && isFiniteNumber(value.x) && isFiniteNumber(value.y)
    && isFiniteNumber(value.stageStartedAt)
    && (value.deadline === undefined || isFiniteNumber(value.deadline))
    && (value.dispatchedSquadId === undefined || typeof value.dispatchedSquadId === 'string')
    && (value.inaction === undefined || ['self_evacuating', 'pursued'].includes(value.inaction as string))
    && Array.isArray(value.facts) && value.facts.every(fact => isRecord(fact)
      && ['deserter_identity', 'pursuit', 'base_coordinates', 'border_route'].includes(fact.id as string)
      && ['confirmed', 'estimate', 'reported', 'stale', 'lost_contact'].includes(fact.quality as string)
      && ['needle', 'dispatch', 'marlowe', 'shorokh', 'field_scan'].includes(fact.source as string))
    && (value.verification === undefined || ['interview', 'recon', 'deescalation'].includes(value.verification as string))
    && (value.pendingDecision === undefined || ['shelter', 'interrogate', 'escort', 'exploit'].includes(value.pendingDecision as string))
    && (value.intervention === undefined || ['myata_retreat', 'bastion_intercept', 'shorokh_false_alarm'].includes(value.intervention as string))
    && (value.deescalated === undefined || typeof value.deescalated === 'boolean')
}

function isValidStoryResolution(value: unknown) {
  return isRecord(value) && ['shelter', 'interrogate', 'escort', 'exploit'].includes(value.decision as string)
    && typeof value.title === 'string' && isFiniteNumber(value.fameDelta) && isFiniteNumber(value.threatDelta)
    && typeof value.branch === 'string' && typeof value.outcome === 'string' && typeof value.unlockedLocation === 'boolean'
    && ['hidden', 'search_area', 'false_lead', 'confirmed'].includes(String(value.locationKnowledge))
    && isFiniteNumber(value.frontRelationDelta) && isFiniteNumber(value.needleTrustDelta)
    && (value.intervention === undefined || ['myata_retreat', 'bastion_intercept', 'shorokh_false_alarm'].includes(value.intervention as string))
    && (value.participantCatIds === undefined || (Array.isArray(value.participantCatIds) && value.participantCatIds.every(id => typeof id === 'string')))
    && (value.facts === undefined || (Array.isArray(value.facts) && value.facts.every(fact => isRecord(fact)
      && ['deserter_identity', 'pursuit', 'base_coordinates', 'border_route'].includes(fact.id as string)
      && ['confirmed', 'estimate', 'reported', 'stale', 'lost_contact'].includes(fact.quality as string)
      && ['needle', 'dispatch', 'marlowe', 'shorokh', 'field_scan'].includes(fact.source as string))))
    && (value.deescalated === undefined || typeof value.deescalated === 'boolean')
    && (value.inaction === undefined || ['self_evacuating', 'pursued'].includes(value.inaction as string))
}

function isValidStoryObserver(value: unknown) {
  return isRecord(value) && ['hidden', 'revealed', 'tracking', 'gone'].includes(value.status as string)
    && [value.x, value.y, value.fromX, value.fromY, value.targetX, value.targetY, value.movementStartedAt, value.movementEndsAt].every(isFiniteNumber)
}

function isValidStoryAftermath(value: unknown) {
  return isRecord(value) && ['base_marked', 'safe_route', 'intercepted_transmission', 'false_entrance'].includes(value.kind as string)
    && ['pending', 'completed'].includes(value.status as string) && [value.dueAt, value.x, value.y].every(isFiniteNumber)
}

function isValidUrgentOperation(value: unknown) {
  return isRecord(value) && value.kind === 'water_filters'
    && ['pending', 'available', 'dispatch', 'active', 'completed', 'failed'].includes(value.status as string)
    && [value.x, value.y, value.availableAt, value.deadline].every(isFiniteNumber)
    && (value.dispatchedSquadId === undefined || typeof value.dispatchedSquadId === 'string')
    && (value.workRemaining === undefined || isFiniteNumber(value.workRemaining))
    && (value.fullReward === undefined || typeof value.fullReward === 'boolean')
    && (value.sampleApplied === undefined || typeof value.sampleApplied === 'boolean')
}

function isValidDistrictStates(value: unknown) {
  if (!isRecord(value)) return false
  return Object.keys(createInitialDistrictStates()).every(id => {
    const district = value[id]
    return isRecord(district)
      && ['silhouette', 'contact', 'operational', 'isolated'].includes(String(district.access))
      && isFiniteNumber(district.risk)
      && typeof district.accessReason === 'string'
      && (district.openedAt === undefined || isFiniteNumber(district.openedAt))
      && Array.isArray(district.authorizedTargetIds)
      && district.authorizedTargetIds.every(targetId => typeof targetId === 'string')
  })
}

function isValidFirstShift(value: unknown) {
  return isRecord(value)
    && ['monolith', 'container', 'responsibilities', 'summary', 'complete'].includes(String(value.stage))
    && isFiniteNumber(value.stageStartedAt)
    && isFiniteNumber(value.monolithDeadline)
    && typeof value.filterSample === 'boolean'
    && (value.containerDeadline === undefined || isFiniteNumber(value.containerDeadline))
    && (value.containerDecision === undefined || ['police_handoff', 'independent_sample', 'call_monolith', 'ignore'].includes(String(value.containerDecision)))
    && (value.containerSquadId === undefined || typeof value.containerSquadId === 'string')
    && (value.filterWarningAt === undefined || isFiniteNumber(value.filterWarningAt))
    && (value.residentialOpenedAt === undefined || isFiniteNumber(value.residentialOpenedAt))
    && (value.residentialDutyDeadline === undefined || isFiniteNumber(value.residentialDutyDeadline))
    && (value.residentialDutyOutcome === undefined || ['completed', 'failed'].includes(String(value.residentialDutyOutcome)))
    && (value.southNodeOutcome === undefined || ['full', 'partial', 'lost'].includes(String(value.southNodeOutcome)))
}

function isValidExternalUnits(value: unknown) {
  if (!isRecord(value)) return false
  return (['guard_7', 'patrol_12'] as const).every(id => {
    const unit = value[id]
    return isRecord(unit) && unit.id === id
      && ['green_monolith', 'police'].includes(String(unit.ownerId))
      && typeof unit.name === 'string'
      && isValidMapPoint(unit.home)
      && [unit.x, unit.y, unit.travel, unit.travelDuration].every(isFiniteNumber)
      && ['available', 'en_route', 'on_scene', 'returning'].includes(String(unit.status))
      && Array.isArray(unit.route) && unit.route.every(isValidMapPoint)
      && (unit.target === undefined || isValidMapPoint(unit.target))
      && (unit.purpose === undefined || ['container', 'support'].includes(String(unit.purpose)))
      && (unit.onSceneUntil === undefined || isFiniteNumber(unit.onSceneUntil))
  })
}

function isValidLogEntry(value: unknown) {
  if (!isRecord(value) || !isFiniteNumber(value.time) || typeof value.key !== 'string') return false
  if (value.params === undefined) return true
  return isRecord(value.params) && Object.values(value.params).every(param => typeof param === 'string' || isFiniteNumber(param))
}

function migrateV1LogText(text: string): Pick<LogEntry, 'key' | 'params'> {
  let match: RegExpExecArray | null
  if (text === 'База NINE LIVES CORP готова к работе') return { key: 'log.base_ready' }
  if (text === 'Работа лаборатории приостановлена') return { key: 'log.research_paused' }
  if (text === 'ЦЕЛЬ ДОСТИГНУТА: дело «Девятая жизнь» закрыто') return { key: 'log.goal_reached' }
  if (text === 'Сводка архивирована. Корпорация продолжает работу') return { key: 'log.summary_archived' }
  if (text === 'Два отряда вытеснили рейдеров и закончили уборку') return { key: 'log.raid_support_won' }
  if (text === 'Оба отряда безопасно отходят без добычи') return { key: 'log.raid_retreat' }
  if ((match = /^ДОСТИЖЕНИЕ: (.+)$/.exec(text))) return { key: 'log.achievement', params: { achievement: match[1] } }
  if ((match = /^(.+) назначен в (Отряд .+)$/.exec(text))) return { key: 'log.cat_assigned', params: { cat: match[1], squad: match[2] } }
  if ((match = /^(.+) выведен из состава (Отряд .+)$/.exec(text))) return { key: 'log.cat_unassigned', params: { cat: match[1], squad: match[2] } }
  if ((match = /^(Отряд .+): выбран стиль «(.+)»$/.exec(text))) {
    const styles: Record<string, string> = { осторожный: 'careful', стандартный: 'balanced', рискованный: 'risky' }
    return { key: 'log.squad_style', params: { squad: match[1], style: styles[match[2]] ?? match[2] } }
  }
  if ((match = /^(.+) получил: (.+)$/.exec(text))) return { key: 'log.item_equipped', params: { cat: match[1], item: match[2] } }
  if ((match = /^(.+): слот «(.+)» освобождён$/.exec(text))) return { key: 'log.slot_cleared', params: { cat: match[1], slot: match[2] } }
  if ((match = /^Выбрано исследование: (.+)$/.exec(text))) return { key: 'log.research_selected', params: { research: match[1] } }
  if ((match = /^(Отряд .+) выехал: (.+)$/.exec(text))) return { key: 'log.mission_started', params: { squad: match[1], mission: match[2] } }
  if ((match = /^(Отряд .+) прибыл на место уборки$/.exec(text))) return { key: 'log.mission_arrived', params: { squad: match[1] } }
  if ((match = /^(Отряд .+) закончил уборку: \+(\d+) лома, \+(\d+) известности$/.exec(text))) return { key: 'log.cleanup_completed', params: { squad: match[1], scrap: Number(match[2]), fame: Number(match[3]) } }
  if ((match = /^РАССЛЕДОВАНИЕ: (Отряд .+) обнаружил дезертира с данными о базе ежей$/.exec(text))) return { key: 'log.story_found', params: { squad: match[1] } }
  if ((match = /^ДЕЛО ЗАКРЫТО: (.+) · \+(\d+) известности(?: · \+(\d+) угрозы)?$/.exec(text))) return {
    key: match[3] ? 'log.story_closed_threat' : 'log.story_closed',
    params: { decision: match[1], fame: Number(match[2]), threat: Number(match[3] ?? 0) },
  }
  if ((match = /^Для финальной сводки нужно ещё (\d+) известности$/.exec(text))) return { key: 'log.fame_needed', params: { fame: Number(match[1]) } }
  if ((match = /^ТРЕВОГА: (Отряд .+) столкнулся с рейдерами$/.exec(text))) return { key: 'log.raid_started', params: { squad: match[1] } }
  if ((match = /^(.+) ранен\. Восстановление начнётся после возвращения на базу$/.exec(text))) return { key: 'log.cat_injured', params: { cat: match[1] } }
  if ((match = /^(Отряд .+) отступает без добычи$/.exec(text))) return { key: 'log.raid_escape', params: { squad: match[1] } }
  if ((match = /^Атака сорвалась\. (Отряд .+) отступает$/.exec(text))) return { key: 'log.raid_attack_failed', params: { squad: match[1] } }
  if ((match = /^(Отряд .+) вытеснил рейдеров и закончил уборку$/.exec(text))) return { key: 'log.raid_attack_won', params: { squad: match[1] } }
  if ((match = /^Запрос поддержки сорван\. (Отряд .+) отступает$/.exec(text))) return { key: 'log.raid_support_failed', params: { squad: match[1] } }
  if ((match = /^(Отряд .+) отозван с текущей уборки без награды$/.exec(text))) return { key: 'log.support_recalled', params: { squad: match[1] } }
  if ((match = /^(Отряд .+) направлен на поддержку\. Прибытие через (\d+) с$/.exec(text))) return { key: 'log.support_dispatched', params: { squad: match[1], seconds: Number(match[2]) } }
  if ((match = /^(Отряд .+) вернулся на базу$/.exec(text))) return { key: 'log.squad_returned', params: { squad: match[1] } }
  if ((match = /^ИССЛЕДОВАНИЕ ЗАВЕРШЕНО: (.+)$/.exec(text))) return { key: 'log.research_completed', params: { research: match[1] } }
  if ((match = /^(.+) восстановился после ранения$/.exec(text))) return { key: 'log.cat_recovered', params: { cat: match[1] } }
  if ((match = /^(Отряд .+) прибыл на поддержку$/.exec(text))) return { key: 'log.support_arrived', params: { squad: match[1] } }
  return { key: 'log.legacy', params: { text } }
}

function migrateV1State(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.log) || !value.log.every(entry => typeof entry === 'string')) return undefined
  const migrated = structuredClone(value)
  migrated.log = value.log.map(entry => {
    const match = /^(\d{2}):(\d{2}) · (.*)$/.exec(entry)
    const time = match ? Math.max(0, ((Number(match[1]) * 60 + Number(match[2])) - 540) * 60) : 0
    return { time, ...migrateV1LogText(match?.[3] ?? entry) }
  })
  return migrated
}

const LEGACY_TEXT_KEYS: Record<string, string> = {
  'Марлоу': 'cat.marlowe.name', 'переговорщик': 'cat.marlowe.role',
  'Пиксель': 'cat.pixel.name', 'техник': 'cat.pixel.role',
  'Ржа': 'cat.rust.name', 'грузчик': 'cat.rust.role',
  'Шорох': 'cat.shorokh.name', 'разведчик': 'cat.shorokh.role',
  'Бастион': 'cat.bastion.name', 'защитник': 'cat.bastion.role',
  'Мята': 'cat.myata.name', 'медик': 'cat.myata.role',
  'Отряд «Альфа»': 'squad.alpha', 'Отряд «Браво»': 'squad.bravo',
  'Свалка у эстакады': 'mission.a', 'Складской квартал': 'mission.b',
  'Ржавый терминал': 'mission.c', 'Старый коллектор': 'mission.d',
  'Бронежилет': 'slot.armor', 'Комбинезон': 'slot.suit', 'Пояс': 'slot.belt', 'Руки': 'slot.hands',
  'Инструментальный набор': 'item.toolkit.name', 'Переговорная гарнитура': 'item.headset.name',
  'Аптечка': 'item.medkit.name', 'Полевой сканер': 'item.scanner.name', 'Нелетальное оружие': 'item.nonlethal_weapon.name',
  '−10 п.п. к вероятности ранения': 'item.armor_vest.effect', '+12 п.п. к уборке': 'item.toolkit.effect',
  '+15 п.п. к запросу поддержки': 'item.headset.effect', 'Лечение ранения за 20 секунд': 'item.medkit.effect',
  '+8 п.п. к уборке': 'item.scanner.effect', '+25 п.п. к нападению': 'item.nonlethal_weapon.effect',
  'Полевые сканеры': 'research.field_scanners.name', '2 сканера на складе': 'research.field_scanners.result',
  'Протокол экстренной диспетчеризации': 'research.emergency_dispatch.name',
  'Поддержка прибывает за 5 секунд': 'research.emergency_dispatch.result',
  'Импровизированная защита': 'research.improvised_defense.name',
  'Нелетальное оружие и действие «Напасть»': 'research.improvised_defense.result',
  'Собрать звено': 'achievement.first_squad.title',
  'Назначить хотя бы одного кота в отряд.': 'achievement.first_squad.description',
  'Откройте «База → Гараж и арсенал» и назначьте кота в любой отряд.': 'achievement.first_squad.hint',
  'Готовы к выезду': 'achievement.field_kit.title',
  'Выдать оперативнику первый предмет снаряжения.': 'achievement.field_kit.description',
  'Раскройте карточку кота на базе и выдайте предмет со склада.': 'achievement.field_kit.hint',
  'Чистая работа': 'achievement.first_cleanup.title',
  'Успешно завершить первую уборку.': 'achievement.first_cleanup.description',
  'Включите время: подготовленный отряд сам выберет уборку и отправится на место.': 'achievement.first_cleanup.hint',
  'Лабораторная смена': 'achievement.research_started.title',
  'Запустить первое исследование.': 'achievement.research_started.description',
  'Откройте лабораторию, выберите исследование и оставьте одного кота свободным.': 'achievement.research_started.hint',
  'Нештатная ситуация': 'achievement.raiders_resolved.title',
  'Разрешить встречу с рейдерами.': 'achievement.raiders_resolved.description',
  'После двух уборок подготовьте второй отряд: он сможет прийти первому на поддержку.': 'achievement.raiders_resolved.hint',
  'Девятая жизнь': 'achievement.ninth_life_closed.title',
  'Принять решение по делу 09.': 'achievement.ninth_life_closed.description',
  'Добейтесь третьей успешной уборки и решите судьбу дезертира.': 'achievement.ninth_life_closed.hint',
  'Укрыть дезертира': 'story.shelter.title', 'Защита свидетеля': 'story.shelter.branch',
  'Дезертир остаётся под защитой корпорации. По району расходится слух: NINE LIVES своих не выдаёт.': 'story.shelter.outcome',
  'Допросить': 'story.interrogate.title', 'Архив «Иглы»': 'story.interrogate.branch',
  'Аналитики получают полную схему базы ежей, маршруты патрулей и позывные командиров.': 'story.interrogate.outcome',
  'Сопроводить к границе': 'story.escort.title', 'Тихий коридор': 'story.escort.branch',
  'Дезертир безопасно покидает сектор. Корпорация сохраняет нейтралитет и не привлекает лишнего внимания.': 'story.escort.outcome',
  'Использовать данные сразу': 'story.exploit.title', 'Координаты «Девятки»': 'story.exploit.branch',
  'Оперативники подтверждают координаты укрепления ежей. Новая цель нанесена на карту, но противник замечает разведку.': 'story.exploit.outcome',
}

function replaceLegacyText(value: unknown): unknown {
  if (typeof value === 'string') return LEGACY_TEXT_KEYS[value] ?? value
  if (Array.isArray(value)) return value.map(replaceLegacyText)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replaceLegacyText(entry)]))
}

function migrateLegacyState(value: unknown, removeLegacyEmptySquads = false) {
  const migrated = replaceLegacyText(value)
  if (!isRecord(migrated)) return undefined
  delete migrated.activeView
  if (!isFiniteNumber(migrated.simulationRemainder)) migrated.simulationRemainder = 0
  if (Array.isArray(migrated.cats)) {
    for (const cat of migrated.cats) {
      if (isRecord(cat) && !isRecord(cat.pendingEquipment)) cat.pendingEquipment = {}
      if (isRecord(cat) && typeof cat.sleeping !== 'boolean') {
        cat.sleeping = isFiniteNumber(cat.energy) && cat.energy <= CONFIG.sleep.sleepAtEnergy
      }
    }
  }
  if (Array.isArray(migrated.squads)) {
    for (const squad of migrated.squads) {
      if (!isRecord(squad)) continue
      if (typeof squad.customName === 'string'
        && (/^squad\.(?:alpha|bravo|charlie|delta|echo|foxtrot)$/.test(squad.customName)
          || /^squad\.generated\.\d+$/.test(squad.customName))) {
        squad.name = squad.customName
        delete squad.customName
      }
      if (squad.phase === 'assisting') squad.phase = 'cleanup'
      if (typeof squad.autoDispatch !== 'boolean') squad.autoDispatch = true
      if (!isValidMapPoint(squad.routeFrom)) {
        const legacyTarget = squad.target
        squad.routeFrom = squad.phase === 'returning' && isValidTarget(legacyTarget)
          ? { x: legacyTarget.x, y: legacyTarget.y }
          : { ...CONFIG.map.base }
      }
      if (typeof squad.restAfterReturn !== 'boolean') squad.restAfterReturn = false
    }
    if (!isFiniteNumber(migrated.squadSerial)) {
      const generatedSerials = migrated.squads
        .filter(isRecord)
        .map(squad => /^squad-(\d+)$/.exec(typeof squad.id === 'string' ? squad.id : '')?.[1])
        .filter((serial): serial is string => Boolean(serial))
        .map(Number)
      migrated.squadSerial = Math.max(2, migrated.squads.length, ...generatedSerials)
    }
  }
  if (Array.isArray(migrated.missions)) {
    for (const mission of migrated.missions) {
      if (isRecord(mission) && !['municipal', 'monolith_service'].includes(String(mission.kind))) mission.kind = 'municipal'
      if (!isRecord(mission)) continue
      if (!isFiniteNumber(mission.progress)) {
        const legacyOwnerId = typeof mission.squadId === 'string'
          ? mission.squadId
          : Array.isArray(mission.squadIds) && typeof mission.squadIds[0] === 'string' ? mission.squadIds[0] : undefined
        const owner = Array.isArray(migrated.squads)
          ? migrated.squads.find(squad => isRecord(squad) && squad.id === legacyOwnerId)
          : undefined
        mission.progress = isRecord(owner) && isFiniteNumber(owner.progress) ? owner.progress : 0
      }
      if (typeof mission.interruptionPolicy !== 'string') mission.interruptionPolicy = 'preserve_progress'
      const assignedIds = Array.isArray(mission.squadIds)
        ? mission.squadIds.filter(id => typeof id === 'string')
        : typeof mission.squadId === 'string' ? [mission.squadId] : []
      if (Array.isArray(migrated.squads)) {
        for (const squad of migrated.squads) {
          if (isRecord(squad) && squad.missionId === mission.id && typeof squad.id === 'string' && !assignedIds.includes(squad.id)) {
            assignedIds.push(squad.id)
          }
        }
      }
      mission.squadIds = assignedIds
      const legacyContributors = Array.isArray(migrated.squads)
        ? migrated.squads.filter(squad => isRecord(squad) && squad.missionId === mission.id
          && ['cleanup', 'assisting', 'incident'].includes(String(squad.phase)) && typeof squad.id === 'string')
          .map(squad => String((squad as Record<string, unknown>).id))
        : []
      mission.contributorSquadIds = Array.isArray(mission.contributorSquadIds)
        ? mission.contributorSquadIds.filter(id => typeof id === 'string')
        : legacyContributors
      delete mission.squadId
    }
  }
  if (Array.isArray(migrated.squads)) {
    for (const squad of migrated.squads) if (isRecord(squad)) delete squad.progress
  }
  if (isRecord(migrated.incident)) {
    const participants = Array.isArray(migrated.incident.participantSquadIds)
      ? migrated.incident.participantSquadIds.filter(id => typeof id === 'string')
      : []
    if (typeof migrated.incident.primarySquadId === 'string'
      && !participants.includes(migrated.incident.primarySquadId)) participants.push(migrated.incident.primarySquadId)
    migrated.incident.participantSquadIds = participants
    delete migrated.incident.primarySquadId
    if (!['harmless', 'armed', 'heavy'].includes(String(migrated.incident.threatClass))) migrated.incident.threatClass = 'armed'
    if (!isFiniteNumber(migrated.incident.threatRoll)) migrated.incident.threatRoll = 50
    if (!isFiniteNumber(migrated.incident.monolithRoll)) migrated.incident.monolithRoll = 50
    if (typeof migrated.incident.monolithRequested !== 'boolean') migrated.incident.monolithRequested = false
    if (typeof migrated.incident.intelConfirmed !== 'boolean') migrated.incident.intelConfirmed = false
    if (!Array.isArray(migrated.incident.clues)) migrated.incident.clues = ['incident.clue.movement', 'incident.clue.unclear_numbers']
  }
  if (isRecord(migrated.storyIncident)) {
    migrated.storyIncident.participantSquadIds = Array.isArray(migrated.storyIncident.participantSquadIds)
      ? migrated.storyIncident.participantSquadIds
      : typeof migrated.storyIncident.foundBySquadId === 'string' ? [migrated.storyIncident.foundBySquadId] : []
    delete migrated.storyIncident.foundBySquadId
    if (!['signal', 'dispatch', 'contact', 'verification', 'intervention'].includes(String(migrated.storyIncident.stage))) {
      migrated.storyIncident.stage = 'contact'
    }
    if (!isFiniteNumber(migrated.storyIncident.stageStartedAt)) {
      migrated.storyIncident.stageStartedAt = isFiniteNumber(migrated.time) ? migrated.time : 0
    }
    if (!Array.isArray(migrated.storyIncident.facts)) migrated.storyIncident.facts = initialNinthLifeFacts()
    if (migrated.storyIncident.stage === 'verification'
      && !['interview', 'recon', 'deescalation'].includes(String(migrated.storyIncident.verification))) {
      migrated.storyIncident.stage = 'contact'
      delete migrated.storyIncident.deadline
    }
  }
  if (removeLegacyEmptySquads && Array.isArray(migrated.squads)) {
    const emptySquads = migrated.squads
      .filter(squad => isRecord(squad) && Array.isArray(squad.members) && squad.members.length === 0 && squad.phase === 'base')
    const emptyIds = new Set(emptySquads
      .map(squad => isRecord(squad) ? squad.id : undefined)
      .filter((id): id is string => typeof id === 'string'))
    const archivedCleanups = emptySquads.reduce((total, squad) => total
      + (isRecord(squad) && isFiniteNumber(squad.completed) ? squad.completed : 0), 0)
    migrated.disbandedSquadCleanups = (isFiniteNumber(migrated.disbandedSquadCleanups)
      ? migrated.disbandedSquadCleanups
      : 0) + archivedCleanups
    migrated.squads = migrated.squads.filter(squad => !isRecord(squad) || !emptyIds.has(String(squad.id)))
    if (Array.isArray(migrated.cats)) {
      for (const cat of migrated.cats) {
        if (!isRecord(cat)) continue
        if (typeof cat.assignedTo === 'string' && emptyIds.has(cat.assignedTo)) delete cat.assignedTo
        if (typeof cat.pendingAssignment === 'string' && emptyIds.has(cat.pendingAssignment)) delete cat.pendingAssignment
      }
    }
  }
  if (!isFiniteNumber(migrated.disbandedSquadCleanups)) migrated.disbandedSquadCleanups = 0
  if (!isFiniteNumber(migrated.completedMissionCount)) {
    const squadTotal = Array.isArray(migrated.squads)
      ? migrated.squads.reduce((total, squad) => total + (isRecord(squad) && isFiniteNumber(squad.completed) ? squad.completed : 0), 0)
      : 0
    migrated.completedMissionCount = migrated.disbandedSquadCleanups + squadTotal
  }
  if (!isRecord(migrated.relations)) migrated.relations = initialRelations()
  if (!isRecord(migrated.relationLastEvent)) migrated.relationLastEvent = {}
  if (!Array.isArray(migrated.cordons)) migrated.cordons = []
  if (!isRecord(migrated.monolith)) migrated.monolith = { status: 'available', x: 18, y: 18, from: { x: 18, y: 18 }, travel: 0, travelDuration: 0, nextServiceAt: 0 }
  return migrated
}

function isValidState(value: unknown): value is State {
  if (!isRecord(value)) return false
  if (![0, 1, 5, 10].includes(value.speed as number)) return false
  if (!['peace_first_shift', 'peace_sandbox', 'cataclysm', 'post_cataclysm'].includes(String(value.campaignPhase))) return false
  if (!isValidDistrictStates(value.districts) || !isValidFirstShift(value.firstShift)) return false
  if (![value.fame, value.scrap, value.corporateThreat, value.time, value.squadSerial, value.disbandedSquadCleanups, value.completedMissionCount, value.missionSerial, value.rngSeed].every(isFiniteNumber)) return false
  if (!isFiniteNumber(value.simulationRemainder)
    || value.simulationRemainder < 0 || value.simulationRemainder >= SIMULATION_STEP_SECONDS) return false
  if (![value.raidTriggered, value.storyTriggered, value.finalSummaryVisible, value.finalSummarySeen].every(flag => typeof flag === 'boolean')) return false
  if (!Array.isArray(value.cats) || !value.cats.every(isValidCat)) return false
  if (!Array.isArray(value.squads) || !value.squads.every(isValidSquad)) return false
  if (!Array.isArray(value.missions) || !value.missions.every(isValidMission)) return false
  if (!isRecord(value.relations) || !Object.keys(initialRelations()).every(key => isFiniteNumber((value.relations as Record<string, unknown>)[key]))) return false
  if (!Array.isArray(value.factionMemory) || !value.factionMemory.every(memory => isRecord(memory)
    && typeof memory.kind === 'string' && isFiniteNumber(memory.time))) return false
  if (!['hidden', 'search_area', 'false_lead', 'confirmed'].includes(String(value.hedgehogHqKnowledge))
    || !isFiniteNumber(value.needleTrust)
    || !isValidExternalUnits(value.externalUnits)) return false
  if (!isRecord(value.relationLastEvent) || !isRecord(value.monolith) || !['available', 'en_route'].includes(String(value.monolith.status))
    || ![value.monolith.x, value.monolith.y, value.monolith.travel, value.monolith.travelDuration, value.monolith.nextServiceAt].every(isFiniteNumber)
    || !isValidMapPoint(value.monolith.from) || !Array.isArray(value.cordons)
    || !value.cordons.every(cordon => isRecord(cordon) && typeof cordon.id === 'string'
      && [cordon.x, cordon.y, cordon.radius, cordon.startedAt, cordon.endsAt].every(isFiniteNumber)
      && ['harmless', 'armed', 'heavy'].includes(String(cordon.threatClass)) && Array.isArray(cordon.affectedOwnerIds))) return false
  if (!isFiniteNumber(value.squadSerial) || !Number.isInteger(value.squadSerial) || value.squadSerial < 0) return false
  if (!isFiniteNumber(value.disbandedSquadCleanups) || !Number.isInteger(value.disbandedSquadCleanups)
    || value.disbandedSquadCleanups < 0) return false
  if (!isFiniteNumber(value.completedMissionCount) || !Number.isInteger(value.completedMissionCount)
    || value.completedMissionCount < 0) return false
  const cats = value.cats as Cat[]
  const squads = value.squads as Squad[]
  const missions = value.missions as Mission[]
  const squadIds = new Set(squads.map(squad => squad.id))
  const catIds = new Set(cats.map(cat => cat.id))
  if (squadIds.size !== squads.length || catIds.size !== cats.length) return false
  if (cats.some(cat => (cat.assignedTo && !squadIds.has(cat.assignedTo))
    || (cat.pendingAssignment && !squadIds.has(cat.pendingAssignment)))) return false
  const rosterMembers = squads.flatMap(squad => squad.members.map(memberId => ({ memberId, squadId: squad.id })))
  if (new Set(rosterMembers.map(entry => entry.memberId)).size !== rosterMembers.length
    || rosterMembers.some(entry => !catIds.has(entry.memberId))) return false
  if (missions.some(mission => mission.squadIds.some(id => !squadIds.has(id)))) return false
  if (squads.some(squad => squad.mergeTargetSquadId && !squadIds.has(squad.mergeTargetSquadId))) return false
  if (value.incident && isValidIncident(value.incident)
    && (value.incident as RaidIncident).participantSquadIds.some(id => !squadIds.has(id))) return false
  if (value.urgentOperation && isValidUrgentOperation(value.urgentOperation)
    && (value.urgentOperation as UrgentOperation).dispatchedSquadId
    && !squadIds.has((value.urgentOperation as UrgentOperation).dispatchedSquadId!)) return false
  if (!isRecord(value.inventory)) return false
  const inventory = value.inventory
  if (!ITEM_DEFINITIONS.every(item => isFiniteNumber(inventory[item.id]))) return false
  if (!isRecord(value.research) || !isRecord(value.research.nodes)) return false
  const researchState = value.research
  const researchNodes = researchState.nodes as Record<string, unknown>
  if ((researchState.activeId !== undefined && !RESEARCH_DEFINITIONS.some(research => research.id === researchState.activeId))
    || (researchState.workerCatId !== undefined && typeof researchState.workerCatId !== 'string')
    || !RESEARCH_DEFINITIONS.every(research => {
      const node = researchNodes[research.id]
      return isRecord(node) && isFiniteNumber(node.progress) && isFiniteNumber(node.scrapSpent)
        && isFiniteNumber(node.spendClock) && typeof node.completed === 'boolean'
    })) return false
  if (!isRecord(value.achievements) || !Array.isArray(value.achievements.completedIds)) return false
  const completedIds = value.achievements.completedIds
  if (new Set(completedIds).size !== completedIds.length
    || !completedIds.every(id => ACHIEVEMENT_DEFINITIONS.some(achievement => achievement.id === id))) return false
  if (!Array.isArray(value.log) || !value.log.every(isValidLogEntry)) return false
  if (value.incident !== undefined && !isValidIncident(value.incident)) return false
  if (value.storyIncident !== undefined && !isValidStoryIncident(value.storyIncident)) return false
  if (value.storyResolution !== undefined && !isValidStoryResolution(value.storyResolution)) return false
  if (value.storyObserver !== undefined && !isValidStoryObserver(value.storyObserver)) return false
  if (value.storyAftermath !== undefined && !isValidStoryAftermath(value.storyAftermath)) return false
  if (value.urgentOperation !== undefined && !isValidUrgentOperation(value.urgentOperation)) return false
  return true
}

export function serializeState(state: State, pretty = true) {
  // Vite HMR can preserve a pre-migration in-memory state while replacing this module.
  // Normalize it before autosaving so an already open tab does not write an invalid current save.
  state.cats.forEach(cat => { cat.pendingEquipment ??= {} })
  const hotState = state as State & { threat?: number }
  state.corporateThreat ??= hotState.threat ?? CONFIG.initial.corporateThreat
  delete hotState.threat
  state.campaignPhase ??= 'peace_first_shift'
  state.districts ??= createInitialDistrictStates()
  state.firstShift ??= createInitialFirstShift()
  state.factionMemory ??= []
  state.hedgehogHqKnowledge ??= 'hidden'
  state.needleTrust ??= 0
  state.externalUnits ??= createInitialExternalUnits()
  state.squadSerial ??= Math.max(2, state.squads.length)
  state.disbandedSquadCleanups ??= 0
  state.completedMissionCount ??= state.disbandedSquadCleanups + state.squads.reduce((total, squad) => total + squad.completed, 0)
  state.simulationRemainder ??= 0
  state.relations ??= initialRelations()
  state.relationLastEvent ??= {}
  state.cordons ??= []
  state.monolith ??= { status: 'available', x: CONFIG.map.monolith.x, y: CONFIG.map.monolith.y, from: { ...CONFIG.map.monolith }, travel: 0, travelDuration: 0, nextServiceAt: 1_000_000_000 }
  state.squads.forEach(squad => { squad.route ??= [{ ...squad.routeFrom }] })
  if (state.storyIncident) state.storyIncident.facts ??= initialNinthLifeFacts()
  if (state.storyResolution) {
    state.storyResolution.locationKnowledge ??= state.storyResolution.unlockedLocation ? 'confirmed' : 'hidden'
    state.storyResolution.frontRelationDelta ??= 0
    state.storyResolution.needleTrustDelta ??= 0
  }
  state.missions.forEach(mission => {
    const legacyMission = mission as Mission & { squadId?: string }
    mission.progress ??= 0
    mission.kind ??= 'municipal'
    mission.districtId ??= getDistrictAtPoint(mission)
    mission.createdAt ??= 0
    mission.interruptionPolicy ??= 'preserve_progress'
    mission.squadIds ??= []
    mission.contributorSquadIds ??= []
    if (legacyMission.squadId && !mission.squadIds.includes(legacyMission.squadId)) mission.squadIds.push(legacyMission.squadId)
    delete legacyMission.squadId
  })
  const envelope: SaveEnvelope = {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    saveVersion: SAVE_VERSION,
    gameVersion: GAME_VERSION,
    savedAt: new Date().toISOString(),
    state,
  }
  return JSON.stringify(envelope, null, pretty ? 2 : undefined)
}

export function deserializeState(payload: string): State {
  let envelope: unknown
  try {
    envelope = JSON.parse(payload)
  } catch {
    throw new SaveError('save.error.invalid_json')
  }
  if (!isRecord(envelope) || envelope.format !== SAVE_FORMAT) throw new SaveError('save.error.unknown_format')
  if (envelope.version !== SAVE_VERSION) {
    throw new SaveError('save.error.unsupported_version', { version: String(envelope.version) })
  }
  if (typeof envelope.savedAt !== 'string') throw new SaveError('save.error.invalid_date')
  const candidate = envelope.state
  if (!isValidState(candidate)) throw new SaveError('save.error.corrupted')

  const restored = structuredClone(candidate)
  restored.cats.forEach(cat => {
    cat.equipment = {
      armor: cat.equipment.armor,
      suit: cat.equipment.suit,
      belt: cat.equipment.belt,
      hands: cat.equipment.hands,
    }
    cat.pendingEquipment = { ...cat.pendingEquipment }
  })
  return restored
}

/** Current-format saves only; the early prototype intentionally uses clean schema breaks. */
export function deserializeCurrentSave(payload: string): State {
  let envelope: unknown
  try {
    envelope = JSON.parse(payload)
  } catch {
    throw new SaveError('save.error.invalid_json')
  }
  if (!isRecord(envelope) || envelope.gameVersion !== GAME_VERSION) {
    throw new SaveError('save.error.unsupported_version', {
      version: String(isRecord(envelope) ? envelope.gameVersion ?? envelope.version : 'unknown'),
    })
  }
  if (envelope.version !== SAVE_VERSION) {
    throw new SaveError('save.error.unsupported_version', { version: String(envelope.version) })
  }
  return deserializeState(payload)
}

export function successfulCleanups(state: State) {
  return state.completedMissionCount
}

export function catIsAtBase(state: State, cat: Cat) {
  if (!cat.assignedTo) return true
  return state.squads.find(squad => squad.id === cat.assignedTo)?.phase === 'base'
}

function putCatToSleep(state: State, cat: Cat) {
  if (cat.sleeping || !catIsAtBase(state, cat)) return false
  cat.sleeping = true
  if (state.research.workerCatId === cat.id) state.research.workerCatId = undefined
  note(state, 'log.cat_sleeping', { cat: cat.name })
  return true
}

function wakeCat(state: State, cat: Cat) {
  if (!cat.sleeping) return false
  cat.sleeping = false
  note(state, 'log.cat_woke', { cat: cat.name })
  return true
}

export function canReceiveWorkOrder(cat: Cat) {
  return cat.sleeping
    ? cat.energy + 1e-9 >= CONFIG.sleep.wakeForOrderEnergy
    : cat.energy > CONFIG.sleep.sleepAtEnergy
}

function wakeForWorkOrder(state: State, cat: Cat) {
  if (!canReceiveWorkOrder(cat)) return false
  wakeCat(state, cat)
  return true
}

function syncCatSleep(state: State) {
  for (const cat of state.cats) {
    if (!catIsAtBase(state, cat)) continue
    if (!cat.sleeping && cat.energy <= CONFIG.sleep.sleepAtEnergy) putCatToSleep(state, cat)
    if (cat.sleeping && cat.energy >= CONFIG.limits.energy) wakeCat(state, cat)
  }
}

export function canEditCat(state: State, catId: string) {
  return state.cats.some(cat => cat.id === catId)
}

export function hasPendingAssignment(cat: Cat) {
  return 'pendingAssignment' in cat
}

export function getCatAssignmentSelection(cat: Cat) {
  return hasPendingAssignment(cat) ? cat.pendingAssignment ?? undefined : cat.assignedTo
}

function squadHasPendingAssignment(state: State, squad: Squad) {
  return state.cats.some(cat => hasPendingAssignment(cat)
    && (cat.assignedTo === squad.id || cat.pendingAssignment === squad.id))
}

function applyAssignment(state: State, cat: Cat, targetSquad?: Squad, wakeForOrder = true) {
  const currentSquad = state.squads.find(squad => squad.id === cat.assignedTo)
  if (currentSquad?.id === targetSquad?.id || (!currentSquad && !targetSquad)) return false
  if (targetSquad && wakeForOrder) {
    if (cat.energy <= CONFIG.sleep.sleepAtEnergy) putCatToSleep(state, cat)
    if (!wakeForWorkOrder(state, cat)) return false
  }

  if (currentSquad) currentSquad.members = currentSquad.members.filter(id => id !== cat.id)
  if (targetSquad) {
    targetSquad.members.push(cat.id)
    cat.assignedTo = targetSquad.id
    if (state.research.workerCatId === cat.id) state.research.workerCatId = undefined
    note(state, 'log.cat_assigned', { cat: cat.name, squad: targetSquad.name })
  } else {
    cat.assignedTo = undefined
    note(state, 'log.cat_unassigned', { cat: cat.name, squad: currentSquad?.name ?? '' })
  }
  syncAchievements(state)
  return true
}

function requestRosterReturn(state: State, squad: Squad) {
  if (squad.phase !== 'field') return
  sendHome(squad)
  note(state, 'log.squad_returning_for_roster', { squad: squad.name })
}

function queueAssignment(state: State, cat: Cat, targetSquad?: Squad) {
  const selectedSquadId = getCatAssignmentSelection(cat)
  const targetSquadId = targetSquad?.id
  if (selectedSquadId === targetSquadId) return false

  if (targetSquadId === cat.assignedTo) {
    delete cat.pendingAssignment
    note(state, 'log.assignment_queue_canceled', { cat: cat.name })
  } else {
    cat.pendingAssignment = targetSquadId ?? null
    if (targetSquad) note(state, 'log.cat_assignment_queued', { cat: cat.name, squad: targetSquad.name })
    else {
      const currentSquad = state.squads.find(squad => squad.id === cat.assignedTo)
      note(state, 'log.cat_unassignment_queued', { cat: cat.name, squad: currentSquad?.name ?? '' })
    }
  }

  const currentSquad = state.squads.find(squad => squad.id === cat.assignedTo)
  if (currentSquad && hasPendingAssignment(cat)) requestRosterReturn(state, currentSquad)
  if (targetSquad && hasPendingAssignment(cat)) requestRosterReturn(state, targetSquad)
  return true
}

function applyAvailablePendingAssignments(state: State) {
  for (const cat of state.cats) {
    if (!hasPendingAssignment(cat)) continue
    const currentSquad = state.squads.find(squad => squad.id === cat.assignedTo)
    const targetSquad = cat.pendingAssignment
      ? state.squads.find(squad => squad.id === cat.pendingAssignment)
      : undefined
    if (currentSquad && currentSquad.phase !== 'base') continue
    if (cat.pendingAssignment && (!targetSquad || targetSquad.phase !== 'base')) continue
    const intendedSquadId = cat.pendingAssignment ?? undefined
    delete cat.pendingAssignment
    if (intendedSquadId === cat.assignedTo) continue
    applyAssignment(state, cat, targetSquad, false)
  }
}

export function assignCat(state: State, catId: string, squadId: string) {
  const cat = state.cats.find(candidate => candidate.id === catId)
  if (!cat || !canEditCat(state, catId)) return false
  const targetSquad = squadId ? state.squads.find(squad => squad.id === squadId) : undefined
  if (squadId && !targetSquad) return false
  if (getCatAssignmentSelection(cat) === targetSquad?.id) return false
  if (hasPendingAssignment(cat) && targetSquad?.id === cat.assignedTo) {
    delete cat.pendingAssignment
    note(state, 'log.assignment_queue_canceled', { cat: cat.name })
    return true
  }
  const currentSquad = state.squads.find(squad => squad.id === cat.assignedTo)
  const canApplyNow = (!currentSquad || currentSquad.phase === 'base')
    && (!targetSquad || targetSquad.phase === 'base')
  if (!canApplyNow) return queueAssignment(state, cat, targetSquad)
  if (hasPendingAssignment(cat)) delete cat.pendingAssignment
  return applyAssignment(state, cat, targetSquad)
}

const SQUAD_CALLSIGN_KEYS = [
  'squad.alpha',
  'squad.bravo',
  'squad.charlie',
  'squad.delta',
  'squad.echo',
  'squad.foxtrot',
]

function nextAvailableSquadName(state: State, serial: number) {
  const usedNames = new Set(state.squads.map(squad => squad.name))
  return SQUAD_CALLSIGN_KEYS.find(name => !usedNames.has(name))
    ?? `squad.generated.${String(serial).padStart(2, '0')}`
}

export function getSquadDisplayName(squad: Pick<Squad, 'name' | 'customName'>) {
  return squad.customName ?? squad.name
}

export type RenameSquadErrorKey =
  | 'squad.rename.error.missing'
  | 'squad.rename.error.empty'
  | 'squad.rename.error.too_long'
  | 'squad.rename.error.duplicate'
  | 'squad.rename.error.unchanged'

export function getRenameSquadError(state: State, squadId: string, requestedName: string): RenameSquadErrorKey | undefined {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return 'squad.rename.error.missing'
  const name = requestedName.trim()
  if (!name) return 'squad.rename.error.empty'
  if (name.length > 32) return 'squad.rename.error.too_long'
  if (squad.customName === name) return 'squad.rename.error.unchanged'
  const normalized = name.toLocaleLowerCase()
  if (state.squads.some(candidate => candidate.id !== squadId
    && candidate.customName?.toLocaleLowerCase() === normalized)) return 'squad.rename.error.duplicate'
  return undefined
}

export function renameSquad(state: State, squadId: string, requestedName: string) {
  if (getRenameSquadError(state, squadId, requestedName)) return false
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return false
  const previous = getSquadDisplayName(squad)
  const name = requestedName.trim()
  note(state, 'log.squad_renamed', { previous, squad: name })
  squad.customName = name
  return true
}

export function getCreateSquadBlockReason(state: State) {
  if (state.squads.length >= state.cats.length) return 'squad.manage.reason.limit'
  return undefined
}

export function createSquad(state: State) {
  if (getCreateSquadBlockReason(state)) return false
  const serial = Math.max(0, state.squadSerial) + 1
  const squad: Squad = {
    id: `squad-${serial}`,
    name: nextAvailableSquadName(state, serial),
    members: [],
    style: 'balanced',
    autoDispatch: true,
    phase: 'base',
    travel: 0,
    travelDuration: 0,
    completed: 0,
    routeFrom: { ...CONFIG.map.base },
    route: [{ ...CONFIG.map.base }],
    restAfterReturn: false,
  }
  state.squadSerial = serial
  state.squads.push(squad)
  note(state, 'log.squad_created', { squad: squad.name })
  return true
}

export function getDeployCatsBlockReason(state: State, catIds: string[], order: DeployOrder) {
  void state; void catIds; void order
  return 'dispatch.reason.away'
}

export function deployCats(state: State, catIds: string[], order: DeployOrder) {
  void state; void catIds; void order
  return false
}

export function getDisbandSquadBlockReason(state: State, squadId: string) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return 'squad.manage.reason.missing'
  if (squad.members.length || state.cats.some(cat => cat.assignedTo === squadId)) return 'squad.manage.reason.members'
  if (squad.phase !== 'base' || squad.missionId || squad.target || squad.destination
    || state.missions.some(mission => mission.squadIds.includes(squadId))) return 'squad.manage.reason.away'
  if (state.cats.some(cat => cat.pendingAssignment === squadId)) return 'squad.manage.reason.pending'
  if (state.incident?.supportSquadId === squadId || state.incident?.participantSquadIds.includes(squadId)
    || state.storyIncident?.participantSquadIds.includes(squadId)
    || state.storyIncident?.dispatchedSquadId === squadId
    || state.urgentOperation?.dispatchedSquadId === squadId) return 'squad.manage.reason.incident'
  return undefined
}

export function disbandSquad(state: State, squadId: string) {
  if (getDisbandSquadBlockReason(state, squadId)) return false
  const index = state.squads.findIndex(squad => squad.id === squadId)
  if (index < 0) return false
  const [squad] = state.squads.splice(index, 1)
  state.disbandedSquadCleanups += squad.completed
  note(state, 'log.squad_disbanded', { squad: squad.name })
  return true
}

export function setSquadStyle(state: State, squadId: string, style: SquadStyle) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad || !canEditSquadStyle(squad) || squad.style === style) return false
  squad.style = style
  note(state, 'log.squad_style', { squad: squad.name, style })
  return true
}

export function canEditSquadStyle(squad: Squad) {
  return squad.phase === 'base'
}

export function setSquadAutoDispatch(state: State, squadId: string, enabled: boolean) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad || squad.autoDispatch === enabled) return false
  squad.autoDispatch = enabled
  note(state, enabled ? 'log.auto_dispatch_enabled' : 'log.auto_dispatch_disabled', { squad: squad.name })
  return true
}

function itemDefinition(itemId: ItemId) {
  return CONFIG.equipment.items.find(item => item.id === itemId)
}

function hasEquipped(cat: Cat, itemId: ItemId) {
  return Object.values(cat.equipment).includes(itemId)
}

function itemBonus(itemId: ItemId, key: 'cleanupBonus' | 'supportBonus' | 'attackBonus' | 'injuryReduction') {
  const definition = itemDefinition(itemId)
  return definition && key in definition ? Number(definition[key as keyof typeof definition]) : 0
}

export function canEditEquipment(state: State, catId: string) {
  return state.cats.some(cat => cat.id === catId)
}

function hasPendingSlot(cat: Cat, slot: EquipmentSlot) {
  return Boolean(cat.pendingEquipment && slot in cat.pendingEquipment)
}

export function getEquipmentSelection(cat: Cat, slot: EquipmentSlot) {
  return hasPendingSlot(cat, slot) ? cat.pendingEquipment[slot] ?? undefined : cat.equipment[slot]
}

export function hasPendingEquipment(cat: Cat, slot?: EquipmentSlot) {
  return slot ? hasPendingSlot(cat, slot) : EQUIPMENT_SLOTS.some(candidate => hasPendingSlot(cat, candidate.id))
}

export function canSelectEquipmentItem(state: State, catId: string, slot: EquipmentSlot, itemId?: ItemId) {
  const cat = state.cats.find(candidate => candidate.id === catId)
  if (!cat) return false
  if (!itemId) return true
  const definition = itemDefinition(itemId)
  if (!definition || definition.slot !== slot) return false
  return itemId === getEquipmentSelection(cat, slot)
    || itemId === cat.equipment[slot]
    || state.inventory[itemId] > 0
}

function squadHasPendingEquipment(state: State, squad: Squad) {
  return membersOf(state, squad).some(cat => hasPendingEquipment(cat))
}

function squadHasPendingChanges(state: State, squad: Squad) {
  return squadHasPendingEquipment(state, squad) || squadHasPendingAssignment(state, squad)
}

function queueEquipment(state: State, cat: Cat, slot: EquipmentSlot, itemId?: ItemId) {
  cat.pendingEquipment ??= {}
  const currentItemId = cat.equipment[slot]
  const selectedItemId = getEquipmentSelection(cat, slot)
  if (selectedItemId === itemId) return false
  if (itemId) {
    const definition = itemDefinition(itemId)
    if (!definition || definition.slot !== slot || (itemId !== currentItemId && state.inventory[itemId] <= 0)) return false
  }

  const previousPendingItem = hasPendingSlot(cat, slot) ? cat.pendingEquipment[slot] : undefined
  if (previousPendingItem) state.inventory[previousPendingItem]++

  if (itemId === currentItemId) {
    delete cat.pendingEquipment[slot]
    note(state, 'log.equipment_queue_canceled', { cat: cat.name, slot: EQUIPMENT_SLOTS.find(candidate => candidate.id === slot)?.name ?? slot })
  } else {
    if (itemId) state.inventory[itemId]--
    cat.pendingEquipment[slot] = itemId ?? null
    if (itemId) note(state, 'log.item_queued', { cat: cat.name, item: itemDefinition(itemId)?.name ?? itemId })
    else note(state, 'log.slot_clear_queued', { cat: cat.name, slot: EQUIPMENT_SLOTS.find(candidate => candidate.id === slot)?.name ?? slot })
  }

  const squad = state.squads.find(candidate => candidate.id === cat.assignedTo)
  // A field cat may receive a loadout order at any point.  Do not interrupt
  // travel or the current cleanup: dispatchNextMissionOrReturn() will route
  // the squad home immediately after that cleanup, while the `field` case
  // can return it right away because there is no work left to preserve.
  if (squad?.phase === 'field' && hasPendingEquipment(cat)) {
    sendHome(squad)
    note(state, 'log.squad_returning_for_equipment', { squad: squad.name })
  }
  return true
}

export function equipItem(state: State, catId: string, slot: EquipmentSlot, itemId?: ItemId) {
  const cat = state.cats.find(candidate => candidate.id === catId)
  if (!cat || !canEditEquipment(state, catId)) return false
  if (!catIsAtBase(state, cat)) return queueEquipment(state, cat, slot, itemId)
  const currentItemId = cat.equipment[slot]
  if (currentItemId === itemId) return false
  if (itemId) {
    const definition = itemDefinition(itemId)
    if (!definition || definition.slot !== slot || state.inventory[itemId] <= 0) return false
  }

  if (currentItemId) state.inventory[currentItemId]++
  if (itemId) state.inventory[itemId]--
  cat.equipment[slot] = itemId
  if (itemId === 'medkit' && cat.injuredRemaining > CONFIG.raid.medkitRecoveryTime) {
    cat.injuredRemaining = CONFIG.raid.medkitRecoveryTime
  }
  if (itemId) note(state, 'log.item_equipped', { cat: cat.name, item: itemDefinition(itemId)?.name ?? itemId })
  else note(state, 'log.slot_cleared', { cat: cat.name, slot: EQUIPMENT_SLOTS.find(candidate => candidate.id === slot)?.name ?? slot })
  syncAchievements(state)
  return true
}

function applyPendingEquipment(state: State, cat: Cat) {
  if (!hasPendingEquipment(cat)) return false
  for (const slot of EQUIPMENT_SLOTS) {
    if (!hasPendingSlot(cat, slot.id)) continue
    const currentItemId = cat.equipment[slot.id]
    const plannedItemId = cat.pendingEquipment[slot.id]
    if (currentItemId) state.inventory[currentItemId]++
    cat.equipment[slot.id] = plannedItemId ?? undefined
    if (plannedItemId === 'medkit' && cat.injuredRemaining > CONFIG.raid.medkitRecoveryTime) {
      cat.injuredRemaining = CONFIG.raid.medkitRecoveryTime
    }
  }
  cat.pendingEquipment = {}
  note(state, 'log.equipment_plan_applied', { cat: cat.name })
  return true
}

export function selectResearch(state: State, researchId?: ResearchId) {
  if (researchId && state.research.nodes[researchId].completed) return false
  if (state.research.activeId === researchId) return false
  state.research.activeId = researchId
  state.research.workerCatId = undefined
  if (researchId) {
    chooseResearchWorker(state)
    const definition = CONFIG.research.nodes.find(node => node.id === researchId)
    note(state, 'log.research_selected', { research: definition?.name ?? researchId })
    emitEvent(state, { type: 'research_started', researchId })
  } else {
    note(state, 'log.research_paused')
  }
  syncAchievements(state)
  return true
}

export function getResearchWorker(state: State) {
  return state.cats.find(cat => cat.id === state.research.workerCatId)
}

function distanceBetween(origin: MapPoint, target: Pick<Mission, 'x' | 'y'>) {
  return Math.hypot(target.x - origin.x, target.y - origin.y)
}

export function pointInCordon(state: State, point: MapPoint) {
  return state.cordons.some(cordon => state.time < cordon.endsAt
    && Math.hypot(point.x - cordon.x, point.y - cordon.y) <= cordon.radius)
}

function travelTimeBetween(origin: MapPoint, target: Pick<Mission, 'x' | 'y'>) {
  return Math.max(CONFIG.mission.minimumTravelTime, distanceBetween(origin, target) / CONFIG.mission.mapSpeed)
}

function routeBetween(state: State, origin: MapPoint, target: MapPoint) {
  return planOperationalRoute(
    state.districts,
    origin,
    target,
    state.hedgehogHqKnowledge === 'confirmed' ? ['metro-depot'] : [],
  )
    ?? { points: [{ ...origin }, { ...target }], distance: distanceBetween(origin, target) }
}

function routeTravelTime(state: State, origin: MapPoint, target: MapPoint) {
  const route = routeBetween(state, origin, target)
  return Math.max(CONFIG.mission.minimumTravelTime, route.distance / CONFIG.mission.mapSpeed)
}

function setSquadTravelRoute(state: State, squad: Squad, origin: MapPoint, target: MapPoint) {
  const route = routeBetween(state, origin, target)
  squad.routeFrom = { ...origin }
  squad.route = route.points
  squad.travel = 0
  squad.travelDuration = Math.max(CONFIG.mission.minimumTravelTime, route.distance / CONFIG.mission.mapSpeed)
}

function missionEnergyCostFrom(state: State, squad: Squad, origin: MapPoint, mission: Mission) {
  const travelToMission = routeTravelTime(state, origin, mission)
  const estimate = getSquadCleanupEstimate(state, squad)
  const remainingRatio = Math.max(0, CONFIG.mission.cleanupWork - (mission.progress ?? 0)) / CONFIG.mission.cleanupWork
  const cleanup = estimate.energyPerCat * remainingRatio
  const travelHome = routeTravelTime(state, mission, CONFIG.map.base)
  return (travelToMission + travelHome) * CONFIG.mission.energyCostPerTravelSecond + cleanup
}

function hasEnergyForMissionFrom(state: State, squad: Squad, origin: MapPoint, mission: Mission) {
  const requiredEnergy = missionEnergyCostFrom(state, squad, origin, mission)
  return membersOf(state, squad).every(cat => cat.energy + 1e-9 >= requiredEnergy)
}

function travelEnergyBetween(origin: MapPoint, destination: MapPoint) {
  return travelTimeBetween(origin, destination) * CONFIG.mission.energyCostPerTravelSecond
}

function squadCurrentChanges(state: State, squad: Squad) {
  return membersOf(state, squad).some(cat => hasPendingAssignment(cat) || hasPendingEquipment(cat))
}

function energyRequiredForCurrentPlan(state: State, squad: Squad, origin: MapPoint) {
  const mission = state.missions.find(candidate => candidate.id === squad.missionId)
  if (mission && ['outbound', 'cleanup'].includes(squad.phase)) {
    return missionEnergyCostFrom(state, squad, origin, mission)
  }
  if (squad.phase === 'moving' && squad.destination) {
    return travelEnergyBetween(origin, squad.destination) + travelEnergyBetween(squad.destination, CONFIG.map.base)
  }
  return travelEnergyBetween(origin, CONFIG.map.base)
}

export function getSplitSquadBlockReason(state: State, squadId: string, memberIds: string[]) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return 'squad.split.reason.missing'
  if (state.squads.length >= state.cats.length) return 'squad.manage.reason.limit'
  if (['base', 'incident', 'support', 'merging'].includes(squad.phase)
    || state.incident?.participantSquadIds.includes(squad.id)) return 'squad.split.reason.phase'
  const selected = [...new Set(memberIds)]
  if (!selected.length || selected.length >= squad.members.length
    || selected.some(id => !squad.members.includes(id))) return 'squad.split.reason.members'
  if (squadHasPendingAssignment(state, squad)) return 'dispatch.reason.pending_assignment'
  if (membersOf(state, squad).some(cat => hasPendingEquipment(cat))) return 'dispatch.reason.pending_equipment'

  const origin = getSquadMapPosition(squad)
  const remainingSquad = { ...squad, members: squad.members.filter(id => !selected.includes(id)) }
  const detachedSquad = { ...squad, members: selected }
  const remainingEnergy = energyRequiredForCurrentPlan(state, remainingSquad, origin)
  const detachedEnergy = travelEnergyBetween(origin, CONFIG.map.base)
  if (membersOf(state, remainingSquad).some(cat => cat.energy + 1e-9 < remainingEnergy)
    || membersOf(state, detachedSquad).some(cat => cat.energy + 1e-9 < detachedEnergy)) return 'dispatch.reason.tired'
  return undefined
}

export function splitSquad(state: State, squadId: string, memberIds: string[]) {
  // Field regrouping is intentionally unavailable: squads are configured at base.
  return false
  /*
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return false
  const selected = [...new Set(memberIds)]
  const position = getSquadMapPosition(squad)
  const serial = Math.max(0, state.squadSerial) + 1
  const newSquad: Squad = {
    id: `squad-${serial}`,
    name: squadNameForSerial(serial),
    members: selected,
    style: squad.style,
    autoDispatch: false,
    phase: 'field',
    travel: 0,
    travelDuration: 0,
    completed: 0,
    routeFrom: position,
    route: [position],
    restAfterReturn: false,
  }
  squad.members = squad.members.filter(id => !selected.includes(id))
  for (const cat of membersOf(state, newSquad)) cat.assignedTo = newSquad.id
  state.squadSerial = serial
  state.squads.push(newSquad)
  note(state, 'log.squad_split', { squad: squad.name, created: newSquad.name })
  emitEvent(state, { type: 'squad_split', squadId, newSquadId: newSquad.id, memberIds: selected })
  return true
  */
}

function targetRouteEndpoint(squad: Squad): MapPoint {
  if (squad.phase === 'base' || squad.phase === 'returning') return { ...CONFIG.map.base }
  if (squad.phase === 'moving' && squad.destination) return { ...squad.destination }
  if (['outbound', 'support'].includes(squad.phase) && squad.target) return { x: squad.target.x, y: squad.target.y }
  return getSquadMapPosition(squad)
}

function targetPositionAfter(squad: Squad, seconds: number): MapPoint {
  const current = getSquadMapPosition(squad)
  const endpoint = targetRouteEndpoint(squad)
  const remaining = Math.max(0, squad.travelDuration - squad.travel)
  if (!remaining || seconds >= remaining) return endpoint
  const ratio = seconds / remaining
  return { x: current.x + (endpoint.x - current.x) * ratio, y: current.y + (endpoint.y - current.y) * ratio }
}

function calculateMergePoint(source: Squad, target: Squad) {
  const origin = getSquadMapPosition(source)
  const remaining = Math.max(0, target.travelDuration - target.travel)
  if (remaining > 0) {
    let low = 0
    let high = remaining
    if (travelTimeBetween(origin, targetPositionAfter(target, high)) <= high + 1e-9) {
      for (let iteration = 0; iteration < 24; iteration++) {
        const middle = (low + high) / 2
        if (travelTimeBetween(origin, targetPositionAfter(target, middle)) <= middle) high = middle
        else low = middle
      }
      return targetPositionAfter(target, high)
    }
  }
  return targetRouteEndpoint(target)
}

function mergeEnergyRequired(state: State, source: Squad, target: Squad, point: MapPoint) {
  const origin = getSquadMapPosition(source)
  const intercept = travelEnergyBetween(origin, point)
  const mission = state.missions.find(candidate => candidate.id === target.missionId)
  if (mission && !['returning', 'base'].includes(target.phase)) {
    const virtual = { ...source, members: [...source.members] }
    return intercept + missionEnergyCostFrom(state, virtual, point, mission)
  }
  const endpoint = targetRouteEndpoint(target)
  return intercept + travelEnergyBetween(point, endpoint) + travelEnergyBetween(endpoint, CONFIG.map.base)
}

function mergeChainContains(state: State, startId: string, searchedId: string) {
  const visited = new Set<string>()
  let current = state.squads.find(squad => squad.id === startId)
  while (current?.mergeTargetSquadId && !visited.has(current.id)) {
    if (current.mergeTargetSquadId === searchedId) return true
    visited.add(current.id)
    current = state.squads.find(squad => squad.id === current?.mergeTargetSquadId)
  }
  return false
}

export function getMergeSquadsBlockReason(state: State, sourceSquadId: string, targetSquadId: string) {
  const source = state.squads.find(candidate => candidate.id === sourceSquadId)
  const target = state.squads.find(candidate => candidate.id === targetSquadId)
  if (!source || !target || source.id === target.id) return 'squad.merge.reason.missing'
  if (source.phase === 'base' || ['incident', 'support'].includes(source.phase)
    || ['incident', 'support'].includes(target.phase)
    || state.incident?.participantSquadIds.some(id => id === source.id || id === target.id)) return 'squad.merge.reason.phase'
  if (squadCurrentChanges(state, source) || squadCurrentChanges(state, target)) return 'squad.merge.reason.pending'
  if (mergeChainContains(state, target.id, source.id)) return 'squad.merge.reason.cycle'
  const point = calculateMergePoint(source, target)
  const required = mergeEnergyRequired(state, source, target, point)
  if (membersOf(state, source).some(cat => cat.energy + 1e-9 < required)) return 'dispatch.reason.tired'
  return undefined
}

export function mergeSquads(state: State, sourceSquadId: string, targetSquadId: string) {
  // Field regrouping is intentionally unavailable: multiple squads may share a mission.
  return false
  /*
  const source = state.squads.find(candidate => candidate.id === sourceSquadId)
  const target = state.squads.find(candidate => candidate.id === targetSquadId)
  if (!source || !target) return false
  const origin = getSquadMapPosition(source)
  releaseSquadFromMission(state, source)
  const point = calculateMergePoint(source, target)
  source.phase = 'merging'
  source.routeFrom = origin
  source.mergeTargetSquadId = target.id
  source.mergePoint = point
  source.travel = 0
  source.travelDuration = travelTimeBetween(origin, point)
  delete source.destination
  note(state, 'log.squad_merge_started', { source: source.name, target: target.name })
  emitEvent(state, { type: 'squad_merge_started', sourceSquadId, targetSquadId })
  return true
  */
}

function startMission(state: State, squad: Squad, requestedMissionId?: string, origin: MapPoint = CONFIG.map.base) {
  const assignableMissions = state.missions
    .filter(candidate => candidate.status !== 'completed'
      && (!requestedMissionId ? candidate.status === 'available' : candidate.id === requestedMissionId)
      && !getMissionAccessBlockReason(state, candidate)
      && hasEnergyForMissionFrom(state, squad, origin, candidate))
  const mission = requestedMissionId
    ? assignableMissions.find(candidate => candidate.id === requestedMissionId)
    : assignableMissions.sort((a, b) => b.priority - a.priority || distanceBetween(origin, a) - distanceBetween(origin, b))[0]
  if (!mission) return false
  const members = membersOf(state, squad)
  if (!members.length || !members.every(cat => cat.injuredRemaining <= 0 && canReceiveWorkOrder(cat))) return false
  members.forEach(cat => wakeForWorkOrder(state, cat))
  mission.status = 'assigned'
  if (!mission.squadIds.includes(squad.id)) mission.squadIds.push(squad.id)
  squad.missionId = mission.id
  squad.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
  delete squad.destination
  squad.phase = 'outbound'
  squad.restAfterReturn = false
  setSquadTravelRoute(state, squad, origin, mission)
  delete squad.mergeTargetSquadId
  delete squad.mergePoint
  delete squad.missionArrivalTime
  note(state, 'log.mission_started', { squad: squad.name, mission: mission.title })
  emitEvent(state, { type: 'mission_started', squadId: squad.id, missionId: mission.id })
  return true
}

function missionSquads(state: State, missionId: string) {
  const mission = state.missions.find(candidate => candidate.id === missionId)
  return mission ? mission.squadIds
    .map(id => state.squads.find(squad => squad.id === id))
    .filter((squad): squad is Squad => Boolean(squad)) : []
}

function missionWorkingSquads(state: State, missionId: string) {
  return missionSquads(state, missionId).filter(squad => ['cleanup', 'incident'].includes(squad.phase))
}

function detachSquadMissionFields(squad: Squad) {
  squad.missionId = undefined
  squad.target = undefined
  delete squad.missionArrivalTime
}

function releaseSquadFromMission(state: State, squad: Squad) {
  const missionId = squad.missionId
  if (!missionId) return
  const mission = state.missions.find(candidate => candidate.id === missionId)
  detachSquadMissionFields(squad)
  if (!mission || mission.status === 'completed') return
  mission.squadIds = mission.squadIds.filter(id => id !== squad.id)
  if (!mission.squadIds.length) {
    mission.status = 'available'
  }
}

export function getAssignMissionBlockReason(state: State, squadId: string, missionId: string) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  const mission = state.missions.find(candidate => candidate.id === missionId)
  if (!squad || !mission || mission.status === 'completed') return 'dispatch.reason.unavailable'
  const accessReason = mission ? getMissionAccessBlockReason(state, mission) : undefined
  if (accessReason) return accessReason
  if (pointInCordon(state, mission)) return 'dispatch.reason.cordon'
  if (mission.squadIds.includes(squad.id)) return undefined
  if (state.incident?.missionId === missionId) return 'dispatch.reason.away'
  if (state.incident && state.incident.participantSquadIds.includes(squad.id)) return 'dispatch.reason.away'
  if (['incident', 'support', 'merging', 'returning'].includes(squad.phase)) return 'dispatch.reason.away'
  if (squadHasPendingAssignment(state, squad)) return 'dispatch.reason.pending_assignment'
  if (squadHasPendingEquipment(state, squad)) return 'dispatch.reason.pending_equipment'
  const members = membersOf(state, squad)
  if (!members.length) return 'dispatch.reason.empty'
  if (members.some(cat => cat.injuredRemaining > 0)) return 'dispatch.reason.injured'
  if (members.some(cat => !canReceiveWorkOrder(cat))) return 'dispatch.reason.tired'
  const origin = squad.phase === 'base' ? CONFIG.map.base : getSquadMapPosition(squad)
  if (!hasEnergyForMissionFrom(state, squad, origin, mission)) return 'dispatch.reason.tired'
  return undefined
}

export function assignSquadToMission(state: State, squadId: string, missionId: string) {
  if (getAssignMissionBlockReason(state, squadId, missionId)) return false
  const squad = state.squads.find(candidate => candidate.id === squadId)
  const mission = state.missions.find(candidate => candidate.id === missionId)
  if (!squad || !mission) return false
  if (mission.squadIds.includes(squad.id)) return true
  const origin = squad.phase === 'base' ? CONFIG.map.base : getSquadMapPosition(squad)
  releaseSquadFromMission(state, squad)
  const accepted = startMission(state, squad, missionId, origin)
  if (accepted) emitEvent(state, { type: 'mission_squad_assigned', squadId, missionId })
  return accepted
}

export function assignSquadsToMission(state: State, squadIds: string[], missionId: string) {
  const uniqueIds = [...new Set(squadIds)]
  let accepted = false
  for (const squadId of uniqueIds) {
    if (assignSquadToMission(state, squadId, missionId)) accepted = true
  }
  return accepted
}

function isMapCommandPoint(point: MapPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 5 && point.x <= 95 && point.y >= 7 && point.y <= 93
}

export function getMissionAccessBlockReason(state: State, mission: Mission) {
  const district = state.districts[mission.districtId]
  if (!district || district.access === 'silhouette' || district.access === 'isolated') return 'dispatch.reason.district_unavailable'
  if (district.access === 'contact' && !district.authorizedTargetIds.includes(mission.id)) return 'dispatch.reason.corridor_target'
  return undefined
}

export function getMoveSquadBlockReason(state: State, squadId: string, destination?: MapPoint) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return 'dispatch.reason.unavailable'
  if (squad.autoDispatch) return 'dispatch.reason.auto_enabled'
  if (!['base', 'field'].includes(squad.phase)) return 'dispatch.reason.away'
  if (squadHasPendingAssignment(state, squad)) return 'dispatch.reason.pending_assignment'
  if (squadHasPendingEquipment(state, squad)) return 'dispatch.reason.pending_equipment'
  const members = membersOf(state, squad)
  if (!members.length) return 'dispatch.reason.empty'
  if (members.some(cat => cat.injuredRemaining > 0)) return 'dispatch.reason.injured'
  if (members.some(cat => !canReceiveWorkOrder(cat))) return 'dispatch.reason.tired'
  if (!destination) return undefined
  if (!isMapCommandPoint(destination)) return 'dispatch.reason.invalid_point'
  const destinationDistrict = getDistrictAtPoint(destination)
  if (state.districts[destinationDistrict].access !== 'operational') return 'dispatch.reason.district_unavailable'
  if (pointInCordon(state, destination)) return 'dispatch.reason.cordon'
  const origin = squad.phase === 'field' ? getSquadMapPosition(squad) : CONFIG.map.base
  const energyCost = (routeTravelTime(state, origin, destination) + routeTravelTime(state, destination, CONFIG.map.base))
    * CONFIG.mission.energyCostPerTravelSecond
  if (members.some(cat => cat.energy + 1e-9 < energyCost)) return 'dispatch.reason.tired'
  return undefined
}

export function moveSquadToPoint(state: State, squadId: string, destination: MapPoint) {
  if (getMoveSquadBlockReason(state, squadId, destination)) return false
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return false
  const origin = squad.phase === 'field' ? getSquadMapPosition(squad) : CONFIG.map.base
  membersOf(state, squad).forEach(cat => wakeForWorkOrder(state, cat))
  squad.phase = 'moving'
  squad.destination = { ...destination }
  squad.target = undefined
  squad.missionId = undefined
  squad.restAfterReturn = false
  setSquadTravelRoute(state, squad, origin, destination)
  note(state, 'log.squad_moving', { squad: squad.name })
  return true
}

export function getGroupMoveDestinations(squadIds: string[], point: MapPoint) {
  const uniqueIds = [...new Set(squadIds)]
  const columns = Math.max(1, Math.ceil(Math.sqrt(uniqueIds.length)))
  return uniqueIds.map((squadId, index) => ({
    squadId,
    destination: {
      x: Math.max(5, Math.min(95, point.x + ((index % columns) - (Math.min(columns, uniqueIds.length) - 1) / 2) * 3)),
      y: Math.max(7, Math.min(93, point.y + (Math.floor(index / columns) - (Math.ceil(uniqueIds.length / columns) - 1) / 2) * 3)),
    },
  }))
}

export function moveSquadsToPoint(state: State, squadIds: string[], point: MapPoint) {
  if (!isMapCommandPoint(point)) return false
  let accepted = false
  for (const { squadId, destination } of getGroupMoveDestinations(squadIds, point)) {
    if (moveSquadToPoint(state, squadId, destination)) accepted = true
  }
  return accepted
}

function rewardMission(state: State, mission: Mission, contributors: Squad[]) {
  mission.status = 'completed'
  mission.progress = CONFIG.mission.cleanupWork
  if (mission.kind === 'monolith_service') {
    state.relations.green_monolith = Math.min(100, state.relations.green_monolith + 10)
    state.monolith.nextServiceAt = state.time + 1_000_000_000
    note(state, 'log.monolith_service_completed', { trust: state.relations.green_monolith })
    emitEvent(state, { type: 'mission_completed', squadIds: contributors.map(squad => squad.id), missionId: mission.id })
    beginPoliceContainerContact(state)
    return
  }
  for (const squad of contributors) squad.completed++
  state.completedMissionCount++
  state.scrap += CONFIG.mission.rewardScrap
  state.fame = Math.min(CONFIG.limits.fame, state.fame + CONFIG.mission.rewardFame)
  if (mission.kind === 'residential_duty') {
    state.firstShift.residentialDutyOutcome = 'completed'
    state.districts.residential_ring.risk = Math.max(0, state.districts.residential_ring.risk + CONFIG.firstShift.residentialDuty.riskSuccess)
    note(state, 'log.first_shift.residential_duty_completed')
  }
  note(state, 'log.cleanup_completed', {
    squad: contributors.map(squad => getSquadDisplayName(squad)).join(', '),
    scrap: CONFIG.mission.rewardScrap,
    fame: CONFIG.mission.rewardFame,
  })
  emitEvent(state, { type: 'mission_completed', squadIds: contributors.map(squad => squad.id), missionId: mission.id })
}

function dispatchNextMissionOrReturn(state: State, squad: Squad) {
  const previousMissionId = squad.missionId
  const origin = squad.target ? { x: squad.target.x, y: squad.target.y } : { ...CONFIG.map.base }
  if (squadHasPendingChanges(state, squad)) {
    sendHome(squad)
    note(state, squadHasPendingAssignment(state, squad)
      ? 'log.squad_returning_for_roster'
      : 'log.squad_returning_for_equipment', { squad: squad.name })
    return
  }
  const availableMissions = state.missions.filter(mission => mission.status === 'available')
  const fatigueBlocked = squad.autoDispatch && availableMissions.length > 0
    && !availableMissions.some(mission => hasEnergyForMissionFrom(state, squad, origin, mission))

  if (squad.autoDispatch) {
    if (startMission(state, squad, undefined, origin)) {
      removeMission(state, previousMissionId)
      return
    }
    sendHome(squad, fatigueBlocked)
    if (fatigueBlocked) note(state, 'log.squad_returning_to_rest', { squad: squad.name })
    return
  }

  if (fatigueBlocked) {
    sendHome(squad, true)
    note(state, 'log.squad_returning_to_rest', { squad: squad.name })
    return
  }

  removeMission(state, previousMissionId)
  squad.phase = 'field'
  squad.routeFrom = origin
  squad.missionId = undefined
  squad.target = undefined
  squad.travel = 0
  squad.travelDuration = 0
  squad.restAfterReturn = false
  note(state, 'log.squad_waiting_in_field', { squad: squad.name })
}

function continueAfterSharedMission(state: State, squad: Squad) {
  if (squad.phase !== 'outbound') return dispatchNextMissionOrReturn(state, squad)
  const origin = getSquadMapPosition(squad)
  detachSquadMissionFields(squad)
  squad.phase = 'field'
  squad.routeFrom = origin
  squad.travel = 0
  squad.travelDuration = 0
  if (squadHasPendingChanges(state, squad)) return sendHome(squad)
  if (squad.autoDispatch && startMission(state, squad, undefined, origin)) return
  sendHome(squad, squad.autoDispatch)
}

function maybeShowFinalSummary(state: State) {
  const urgentSettled = !state.urgentOperation || ['completed', 'failed'].includes(state.urgentOperation.status)
  if (!state.storyResolution || state.storyAftermath?.status !== 'completed' || !urgentSettled
    || state.fame < CONFIG.goal.fame || state.finalSummarySeen || state.finalSummaryVisible) return
  state.speed = 0
  state.finalSummaryVisible = true
  note(state, 'log.goal_reached')
  emitEvent(state, { type: 'final_summary_available' })
}

function startNinthLife(state: State, mission: Mission, participants: Squad[]) {
  if (state.campaignPhase !== 'post_cataclysm'
    || state.storyTriggered
    || successfulCleanups(state) < CONFIG.story.successfulCleanupsBeforeTrigger) return
  state.storyTriggered = true
  if (state.speed > 1) state.speed = 1
  state.storyIncident = {
    kind: 'ninth_life',
    stage: 'signal',
    participantSquadIds: [],
    x: mission.x,
    y: mission.y,
    stageStartedAt: state.time,
    deadline: state.time + CONFIG.story.signalDeadline,
    facts: initialNinthLifeFacts(),
  }
  note(state, 'log.story_found', { squad: participants.map(squad => getSquadDisplayName(squad)).join(', ') })
  emitEvent(state, { type: 'story_started', story: 'ninth_life', squadIds: participants.map(squad => squad.id) })
}

function afterSuccessfulCleanup(state: State, mission: Mission, participants: Squad[]) {
  startNinthLife(state, mission, participants)
  maybeShowFinalSummary(state)
}

function setDistrictAccess(state: State, districtId: DistrictId, access: DistrictState['access'], reason: string, authorizedTargetIds: string[] = []) {
  const district = state.districts[districtId]
  district.access = access
  district.accessReason = reason
  district.authorizedTargetIds = [...authorizedTargetIds]
  if (access === 'operational') district.openedAt ??= state.time
}

function releaseTimedOutMission(state: State, mission: Mission) {
  for (const squadId of [...mission.squadIds]) {
    const squad = state.squads.find(candidate => candidate.id === squadId)
    if (!squad) continue
    const origin = getSquadMapPosition(squad)
    releaseSquadFromMission(state, squad)
    squad.phase = 'field'
    squad.routeFrom = origin
    squad.route = [origin]
    squad.travel = 0
    squad.travelDuration = 0
  }
  removeMission(state, mission.id)
}

function beginPoliceContainerContact(state: State) {
  if (state.firstShift.stage !== 'monolith') return
  state.firstShift.stage = 'container'
  state.firstShift.stageStartedAt = state.time
  state.firstShift.containerDeadline = state.time + CONFIG.firstShift.containerDeadline
  const mission: Mission = {
    id: 'police-container',
    title: 'mission.police_container',
    kind: 'police_contact',
    districtId: 'residential_ring',
    createdAt: state.time,
    deadline: state.firstShift.containerDeadline,
    x: 72,
    y: 29,
    priority: 4,
    status: 'available',
    progress: 0,
    interruptionPolicy: 'scripted',
    squadIds: [],
    contributorSquadIds: [],
  }
  state.missions.push(mission)
  setDistrictAccess(state, 'north_bastion', 'operational', 'district.access.official_contact')
  setDistrictAccess(state, 'residential_ring', 'contact', 'district.access.police_container', [mission.id])
  state.speed = 0
  note(state, 'log.first_shift.police_contact', { seconds: CONFIG.firstShift.containerDeadline })
}

function reachPoliceContainer(state: State, squad: Squad) {
  if (state.firstShift.stage !== 'container') return false
  state.firstShift.containerSquadId = squad.id
  squad.phase = 'incident'
  squad.travel = squad.travelDuration
  state.speed = 0
  note(state, 'log.first_shift.container_reached', { squad: squad.name })
  return true
}

function policeTravelTime(state: State) {
  const relation = state.relations.police
  return relation >= 50 ? CONFIG.raid.police.fastTravelTime
    : relation >= 35 ? CONFIG.raid.police.delayedTravelTime
      : CONFIG.raid.police.slowTravelTime
}

function dispatchExternalUnit(state: State, unitId: ExternalUnitId, target: MapPoint, purpose: ExternalUnitState['purpose']) {
  const unit = state.externalUnits[unitId]
  if (unit.status !== 'available') return false
  const planned = planOperationalRoute(state.districts, { x: unit.x, y: unit.y }, target)
  unit.status = 'en_route'
  unit.target = { ...target }
  unit.purpose = purpose
  unit.route = planned?.points ?? [{ x: unit.x, y: unit.y }, { ...target }]
  unit.travel = 0
  delete unit.onSceneUntil
  unit.travelDuration = unitId === 'patrol_12' ? policeTravelTime(state) : CONFIG.raid.monolith.travelTime
  note(state, unitId === 'patrol_12' ? 'log.police_dispatched' : 'log.monolith_dispatched', { seconds: unit.travelDuration })
  return true
}

function updateExternalUnits(state: State, elapsed: number) {
  for (const unit of Object.values(state.externalUnits)) {
    if (unit.status === 'on_scene') {
      if (state.time + 1e-9 < (unit.onSceneUntil ?? Infinity)) continue
      const plannedReturn = planOperationalRoute(state.districts, { x: unit.x, y: unit.y }, unit.home)
      unit.status = 'returning'
      unit.route = plannedReturn?.points ?? [{ x: unit.x, y: unit.y }, { ...unit.home }]
      unit.travel = 0
      unit.travelDuration = unit.id === 'patrol_12' ? policeTravelTime(state) : CONFIG.raid.monolith.travelTime
      delete unit.onSceneUntil
      continue
    }
    if (!['en_route', 'returning'].includes(unit.status) || !unit.route.length) continue
    unit.travel += elapsed
    const ratio = Math.min(1, unit.travel / Math.max(unit.travelDuration, 1e-9))
    const position = positionAlongRoute(unit.route, ratio)
    unit.x = position.x
    unit.y = position.y
    if (ratio < 1) continue
    if (unit.status === 'returning') {
      unit.status = 'available'
      unit.x = unit.home.x
      unit.y = unit.home.y
      unit.route = []
      delete unit.target
      delete unit.purpose
      delete unit.onSceneUntil
    } else {
      unit.status = 'on_scene'
      unit.x = unit.target?.x ?? unit.x
      unit.y = unit.target?.y ?? unit.y
      unit.onSceneUntil = state.time + 20
      note(state, unit.id === 'patrol_12' ? 'log.police_arrived' : 'log.external_monolith_arrived')
      if (unit.purpose === 'support') finishExternalSupportArrival(state, unit)
    }
  }
}

export function resolvePoliceContainer(state: State, decision: ContainerDecision) {
  if (state.firstShift.stage !== 'container' || state.firstShift.containerDecision) return false
  if (decision !== 'ignore' && !state.firstShift.containerSquadId) return false
  const rules = CONFIG.firstShift.container[decision]
  state.firstShift.containerDecision = decision
  state.firstShift.filterSample = rules.sample
  state.firstShift.residentialOpenedAt = state.time
  state.firstShift.filterWarningAt = state.time + rules.warningDelay
  state.firstShift.residentialDutyDeadline = state.time + CONFIG.firstShift.residentialDutyDeadline
  state.firstShift.stage = 'responsibilities'
  state.firstShift.stageStartedAt = state.time
  adjustRelation(state, 'police', rules.policeRelation, `relation.police.container.${decision}`)
  if (rules.monolithRelation) adjustRelation(state, 'green_monolith', rules.monolithRelation, `relation.monolith.container.${decision}`)
  setDistrictAccess(state, 'residential_ring', 'operational', 'district.access.official_contact')
  state.districts.residential_ring.risk = rules.districtRisk

  const containerMission = state.missions.find(mission => mission.kind === 'police_contact')
  if (containerMission) {
    const squad = state.squads.find(candidate => candidate.id === state.firstShift.containerSquadId)
    if (squad) {
      const point = { x: containerMission.x, y: containerMission.y }
      detachSquadMissionFields(squad)
      squad.phase = 'field'
      squad.routeFrom = point
      squad.route = [point]
      squad.travel = 0
      squad.travelDuration = 0
    }
    removeMission(state, containerMission.id)
  }
  delete state.firstShift.containerSquadId

  const dutyRules = CONFIG.firstShift.residentialDuty
  state.missions.push({
    id: 'residential-duty-1',
    title: 'mission.residential_duty',
    kind: 'residential_duty',
    districtId: 'residential_ring',
    createdAt: state.time,
    deadline: state.firstShift.residentialDutyDeadline,
    x: dutyRules.x,
    y: dutyRules.y,
    priority: 3,
    status: 'available',
    progress: 0,
    interruptionPolicy: 'fail',
    squadIds: [],
    contributorSquadIds: [],
  })
  const filterRules = CONFIG.urgentOperations.waterFilters
  state.urgentOperation = {
    kind: 'water_filters',
    status: 'pending',
    x: filterRules.x,
    y: filterRules.y,
    availableAt: state.firstShift.filterWarningAt,
    deadline: state.firstShift.residentialOpenedAt + CONFIG.firstShift.southNodeDeadline,
    sampleApplied: rules.sample,
  }
  if (decision === 'police_handoff') dispatchExternalUnit(state, 'patrol_12', { x: 72, y: 29 }, 'container')
  if (decision === 'call_monolith') dispatchExternalUnit(state, 'guard_7', { x: 72, y: 29 }, 'container')
  state.speed = 0
  note(state, `log.first_shift.container.${decision}`, { risk: rules.districtRisk })
  return true
}

function maybeShowFirstShiftSummary(state: State) {
  if (state.firstShift.stage !== 'responsibilities'
    || !state.firstShift.residentialDutyOutcome
    || !state.firstShift.southNodeOutcome
    || state.finalSummaryVisible) return
  state.firstShift.stage = 'summary'
  state.firstShift.stageStartedAt = state.time
  state.finalSummaryVisible = true
  state.speed = 0
  note(state, 'log.first_shift.summary_ready')
  emitEvent(state, { type: 'final_summary_available' })
}

function updateFirstShift(state: State) {
  if (state.campaignPhase !== 'peace_first_shift') return
  if (state.firstShift.stage === 'monolith' && state.time + 1e-9 >= state.firstShift.monolithDeadline) {
    const mission = state.missions.find(candidate => candidate.kind === 'monolith_service')
    if (mission && mission.status !== 'completed') {
      adjustRelation(state, 'green_monolith', -10, 'relation.monolith.service_missed')
      releaseTimedOutMission(state, mission)
      note(state, 'log.first_shift.monolith_missed')
    }
    beginPoliceContainerContact(state)
  }
  if (state.firstShift.stage === 'container' && state.time + 1e-9 >= (state.firstShift.containerDeadline ?? Infinity)) {
    resolvePoliceContainer(state, 'ignore')
  }
  if (state.firstShift.stage !== 'responsibilities') return
  const duty = state.missions.find(candidate => candidate.kind === 'residential_duty')
  if (!state.firstShift.residentialDutyOutcome && state.time + 1e-9 >= (state.firstShift.residentialDutyDeadline ?? Infinity)) {
    if (duty) releaseTimedOutMission(state, duty)
    state.firstShift.residentialDutyOutcome = 'failed'
    state.districts.residential_ring.risk = Math.min(100, state.districts.residential_ring.risk + CONFIG.firstShift.residentialDuty.riskFailure)
    note(state, 'log.first_shift.residential_duty_failed')
  }
  maybeShowFirstShiftSummary(state)
}

const STORY_OUTCOMES: Record<NinthLifeDecision, Pick<StoryResolution, 'title' | 'branch' | 'outcome' | 'unlockedLocation' | 'locationKnowledge'>> = {
  shelter: {
    title: 'story.shelter.title',
    branch: 'story.shelter.branch',
    outcome: 'story.shelter.outcome',
    unlockedLocation: false,
    locationKnowledge: 'hidden',
  },
  interrogate: {
    title: 'story.interrogate.title',
    branch: 'story.interrogate.branch',
    outcome: 'story.interrogate.outcome',
    unlockedLocation: false,
    locationKnowledge: 'hidden',
  },
  escort: {
    title: 'story.escort.title',
    branch: 'story.escort.branch',
    outcome: 'story.escort.outcome',
    unlockedLocation: false,
    locationKnowledge: 'hidden',
  },
  exploit: {
    title: 'story.exploit.title',
    branch: 'story.exploit.branch',
    outcome: 'story.exploit.outcome',
    unlockedLocation: true,
    locationKnowledge: 'confirmed',
  },
}

export function getNinthLifeDispatchBlockReason(state: State, squadId: string) {
  const story = state.storyIncident
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!story || story.stage !== 'signal') return 'story.dispatch.reason.unavailable'
  if (!squad || !squad.members.length) return 'story.dispatch.reason.empty'
  if (squad.members.some(id => {
    const cat = state.cats.find(candidate => candidate.id === id)
    return !cat || cat.injuredRemaining > 0 || !canReceiveWorkOrder(cat)
  })) return 'story.dispatch.reason.unready'
  if (['incident', 'support', 'merging', 'returning'].includes(squad.phase)) return 'story.dispatch.reason.away'
  return undefined
}

export function dispatchNinthLife(state: State, squadId: string) {
  if (getNinthLifeDispatchBlockReason(state, squadId)) return false
  const story = state.storyIncident!
  const squad = state.squads.find(candidate => candidate.id === squadId)!
  const origin = getSquadMapPosition(squad)
  releaseSquadFromMission(state, squad)
  squad.phase = 'moving'
  squad.destination = { x: story.x, y: story.y }
  setSquadTravelRoute(state, squad, origin, story)
  delete squad.mergeTargetSquadId
  delete squad.mergePoint
  delete squad.missionArrivalTime
  story.stage = 'dispatch'
  story.stageStartedAt = state.time
  story.deadline = state.time + CONFIG.story.arrivalDeadline
  story.dispatchedSquadId = squad.id
  story.participantSquadIds = []
  note(state, 'log.story_dispatched', { squad: squad.name, seconds: Math.ceil(squad.travelDuration) })
  emitEvent(state, { type: 'story_dispatched', story: 'ninth_life', squadId: squad.id, seconds: squad.travelDuration })
  return true
}

function ninthLifeParticipantCats(state: State) {
  const participantIds = new Set(state.storyIncident?.participantSquadIds ?? [])
  return state.squads
    .filter(squad => participantIds.has(squad.id))
    .flatMap(squad => membersOf(state, squad))
}

export function getNinthLifeVerificationOptions(state: State) {
  const story = state.storyIncident
  const members = ninthLifeParticipantCats(state)
  const atContact = story?.stage === 'contact'
  const hasMarlowe = members.some(cat => cat.id === 'marlowe')
  const hasShorokh = members.some(cat => cat.id === 'shorokh')
  const hasScanner = members.some(cat => hasEquipped(cat, 'scanner'))
  const interviewDone = story?.facts.some(fact => fact.id === 'deserter_identity' && fact.source === 'marlowe') ?? false
  const reconDone = story?.facts.some(fact => fact.id === 'border_route' && ['shorokh', 'field_scan'].includes(fact.source)) ?? false
  return {
    interview: {
      available: Boolean(atContact && hasMarlowe && !interviewDone),
      reason: interviewDone ? 'story.verify.reason.complete' : hasMarlowe ? undefined : 'story.verify.reason.marlowe',
    },
    recon: {
      available: Boolean(atContact && (hasShorokh || hasScanner) && !reconDone),
      reason: reconDone ? 'story.verify.reason.complete' : hasShorokh || hasScanner ? undefined : 'story.verify.reason.recon',
    },
    deescalation: {
      available: Boolean(atContact && hasMarlowe && !story?.deescalated),
      reason: story?.deescalated ? 'story.verify.reason.deescalated' : hasMarlowe ? undefined : 'story.verify.reason.marlowe',
    },
  }
}

export function verifyNinthLife(state: State, verification: NinthLifeVerification) {
  const story = state.storyIncident
  if (!story || !getNinthLifeVerificationOptions(state)[verification].available) return false
  story.stage = 'verification'
  story.stageStartedAt = state.time
  story.deadline = state.time + (verification === 'deescalation' ? CONFIG.story.deescalationDuration : CONFIG.story.verificationDuration)
  story.verification = verification
  state.speed = 1
  note(state, verification === 'interview' ? 'log.story_verification_interview'
    : verification === 'recon' ? 'log.story_verification_recon' : 'log.story_deescalation')
  emitEvent(state, { type: 'story_stage_changed', story: 'ninth_life', stage: 'verification', reason: 'arrival' })
  return true
}

function setNinthLifeFact(story: StoryIncident, id: NinthLifeFactId, quality: IntelQuality, source: IntelSource) {
  const fact = story.facts.find(candidate => candidate.id === id)
  if (fact) Object.assign(fact, { quality, source })
  else story.facts.push({ id, quality, source })
}

function completeNinthLifeVerification(state: State, story: StoryIncident) {
  if (story.verification === 'interview') {
    const coordinates = story.facts.find(fact => fact.id === 'base_coordinates')
    setNinthLifeFact(story, 'deserter_identity', 'confirmed', 'marlowe')
    if (coordinates && ['shorokh', 'field_scan'].includes(coordinates.source)
      && ['estimate', 'stale'].includes(coordinates.quality)) {
      setNinthLifeFact(story, 'base_coordinates', 'confirmed', coordinates.source)
    } else if (coordinates?.quality !== 'confirmed') {
      setNinthLifeFact(story, 'base_coordinates', 'estimate', 'marlowe')
    }
  } else if (story.verification === 'recon') {
    const source: IntelSource = ninthLifeParticipantCats(state).some(cat => cat.id === 'shorokh') ? 'shorokh' : 'field_scan'
    const identityConfirmed = story.facts.some(fact => fact.id === 'deserter_identity' && fact.quality === 'confirmed')
    setNinthLifeFact(story, 'pursuit', 'confirmed', source)
    setNinthLifeFact(story, 'base_coordinates', identityConfirmed ? 'confirmed' : 'estimate', source)
    setNinthLifeFact(story, 'border_route', 'confirmed', source)
    if (state.storyObserver) state.storyObserver.status = 'revealed'
  } else {
    story.deescalated = true
  }
  const verification = story.verification
  story.stage = 'contact'
  story.stageStartedAt = state.time
  delete story.deadline
  delete story.verification
  state.speed = 0
  note(state, verification === 'interview' ? 'log.story_verification_interview_done'
    : verification === 'recon' ? 'log.story_verification_recon_done' : 'log.story_deescalation_done')
  emitEvent(state, { type: 'story_stage_changed', story: 'ninth_life', stage: 'contact', reason: 'deadline' })
}

function reachNinthLifeContact(state: State, squad?: Squad, reason: 'arrival' | 'deadline' = 'arrival') {
  const story = state.storyIncident
  if (!story || story.stage === 'contact') return
  story.stage = 'contact'
  story.stageStartedAt = state.time
  delete story.deadline
  if (squad && !story.participantSquadIds.includes(squad.id)) story.participantSquadIds.push(squad.id)
  if (!state.storyObserver) {
    const pursuitConfirmed = story.inaction === 'pursued' || story.facts.some(fact => fact.id === 'pursuit' && fact.quality === 'confirmed')
    const x = Math.min(94, story.x + CONFIG.story.observerOffset.x)
    const y = Math.max(6, story.y + CONFIG.story.observerOffset.y)
    state.storyObserver = { status: pursuitConfirmed ? 'revealed' : 'hidden', x, y, fromX: x, fromY: y, targetX: story.x, targetY: story.y, movementStartedAt: state.time, movementEndsAt: state.time }
  }
  state.speed = 0
  note(state, squad ? 'log.story_contact' : 'log.story_pursued', squad ? { squad: squad.name } : undefined)
  emitEvent(state, { type: 'story_stage_changed', story: 'ninth_life', stage: 'contact', reason })
}

function updateNinthLife(state: State) {
  const story = state.storyIncident
  if (!story?.deadline || state.time + 1e-9 < story.deadline) return
  if (story.stage === 'verification') {
    completeNinthLifeVerification(state, story)
    return
  }
  if (story.stage === 'intervention' && story.pendingDecision) {
    const decision = story.pendingDecision
    const intervention = story.intervention
    story.stage = 'contact'
    delete story.deadline
    delete story.pendingDecision
    delete story.intervention
    finishNinthLifeResolution(state, decision, intervention)
    return
  }
  if (story.stage === 'signal') {
    story.stage = 'dispatch'
    story.stageStartedAt = state.time
    story.deadline = state.time + CONFIG.story.arrivalDeadline
    story.inaction = 'self_evacuating'
    state.corporateThreat = Math.min(CONFIG.limits.corporateThreat, state.corporateThreat + CONFIG.story.unansweredThreat)
    note(state, 'log.story_unanswered', { threat: CONFIG.story.unansweredThreat })
    emitEvent(state, { type: 'story_stage_changed', story: 'ninth_life', stage: 'dispatch', reason: 'deadline' })
    return
  }
  if (story.stage === 'dispatch') {
    story.inaction = 'pursued'
    state.corporateThreat = Math.min(CONFIG.limits.corporateThreat, state.corporateThreat + CONFIG.story.pursuedThreat)
    reachNinthLifeContact(state, undefined, 'deadline')
  }
}

export function getWaterFiltersDispatchBlockReason(state: State, squadId: string) {
  const operation = state.urgentOperation
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!operation || operation.status !== 'available') return 'urgent.water_filters.reason.unavailable'
  if (!squad || !squad.members.length) return 'urgent.water_filters.reason.empty'
  if (squad.members.some(id => {
    const cat = state.cats.find(candidate => candidate.id === id)
    return !cat || cat.injuredRemaining > 0 || !canReceiveWorkOrder(cat)
  })) return 'urgent.water_filters.reason.unready'
  if (['incident', 'support', 'merging', 'returning', 'urgent'].includes(squad.phase)) return 'urgent.water_filters.reason.away'
  return undefined
}

export function dispatchWaterFilters(state: State, squadId: string) {
  if (getWaterFiltersDispatchBlockReason(state, squadId)) return false
  const operation = state.urgentOperation!
  const squad = state.squads.find(candidate => candidate.id === squadId)!
  const origin = getSquadMapPosition(squad)
  const members = membersOf(state, squad)
  const hasSpecialist = members.some(cat => cat.tech >= 8)
  releaseSquadFromMission(state, squad)
  squad.phase = 'moving'
  squad.destination = { x: operation.x, y: operation.y }
  setSquadTravelRoute(state, squad, origin, operation)
  delete squad.mergeTargetSquadId
  delete squad.mergePoint
  delete squad.missionArrivalTime
  operation.status = 'dispatch'
  operation.dispatchedSquadId = squad.id
  operation.fullReward = hasSpecialist
  note(state, 'log.water_filters_dispatched', { squad: squad.name, seconds: Math.ceil(squad.travelDuration) })
  emitEvent(state, { type: 'urgent_operation_dispatched', operation: 'water_filters', squadId: squad.id })
  return true
}

function startWaterFiltersWork(state: State, squad: Squad) {
  const operation = state.urgentOperation
  if (!operation || operation.status !== 'dispatch' || operation.dispatchedSquadId !== squad.id) return false
  const rules = CONFIG.urgentOperations.waterFilters
  operation.status = 'active'
  operation.workRemaining = operation.fullReward
    ? Math.max(1, rules.specialistWorkDuration - (operation.sampleApplied ? 5 : 0))
    : rules.standardWorkDuration
  squad.phase = 'urgent'
  note(state, 'log.water_filters_arrived', { squad: squad.name, seconds: operation.workRemaining })
  return true
}

function completeWaterFilters(state: State, squad: Squad) {
  const operation = state.urgentOperation
  if (!operation || operation.status !== 'active') return
  const rules = CONFIG.urgentOperations.waterFilters
  const fame = operation.fullReward ? rules.fullRewardFame : rules.partialRewardFame
  const scrap = operation.fullReward ? rules.fullRewardScrap : rules.partialRewardScrap
  state.fame = Math.min(CONFIG.limits.fame, state.fame + fame)
  state.scrap += scrap
  operation.status = 'completed'
  operation.workRemaining = 0
  if (state.campaignPhase === 'peace_first_shift') {
    state.firstShift.southNodeOutcome = operation.fullReward ? 'full' : 'partial'
  }
  squad.phase = 'field'
  squad.routeFrom = { x: operation.x, y: operation.y }
  note(state, operation.fullReward ? 'log.water_filters_completed_full' : 'log.water_filters_completed_partial', { squad: squad.name, fame, scrap })
  emitEvent(state, { type: 'urgent_operation_resolved', operation: 'water_filters', outcome: 'completed' })
  maybeShowFinalSummary(state)
}

function updateUrgentOperation(state: State) {
  const operation = state.urgentOperation
  if (!operation) return
  if (operation.status === 'pending' && state.time + 1e-9 >= operation.availableAt) {
    operation.status = 'available'
    note(state, 'log.water_filters_started', { seconds: Math.ceil(operation.deadline - state.time) })
    emitEvent(state, { type: 'urgent_operation_started', operation: 'water_filters', deadline: operation.deadline })
  }
  if (!['completed', 'failed'].includes(operation.status) && state.time + 1e-9 >= operation.deadline) {
    const squad = state.squads.find(candidate => candidate.id === operation.dispatchedSquadId)
    if (squad) {
      const position = getSquadMapPosition(squad)
      squad.phase = 'field'
      squad.routeFrom = position
      squad.route = [position]
      squad.travel = 0
      squad.travelDuration = 0
      delete squad.destination
    }
    operation.status = 'failed'
    operation.workRemaining = 0
    if (state.campaignPhase === 'peace_first_shift') state.firstShift.southNodeOutcome = 'lost'
    note(state, 'log.water_filters_failed')
    emitEvent(state, { type: 'urgent_operation_resolved', operation: 'water_filters', outcome: 'failed' })
    maybeShowFinalSummary(state)
  }
}

function ninthLifeLocationKnowledge(story: StoryIncident, decision: NinthLifeDecision): LocationKnowledge {
  const identity = story.facts.find(fact => fact.id === 'deserter_identity')
  const coordinates = story.facts.find(fact => fact.id === 'base_coordinates')
  if (identity?.quality === 'confirmed' && coordinates?.quality === 'confirmed') return 'confirmed'
  if (identity?.quality === 'confirmed' && coordinates?.quality === 'estimate') return 'search_area'
  if (decision === 'exploit') return 'false_lead'
  return 'hidden'
}

function ninthLifeFrontDecisionDelta(state: State, story: StoryIncident, decision: NinthLifeDecision) {
  const borderRouteConfirmed = story.facts.some(fact => fact.id === 'border_route' && fact.quality === 'confirmed')
  if (decision === 'escort' && borderRouteConfirmed && state.relations.needle_front >= 35) return 0
  return CONFIG.factions.needleFront.decisions[decision]
}

function ninthLifeNeedleTrustDelta(decision: NinthLifeDecision) {
  return decision === 'shelter' || decision === 'escort' ? 10 : -10
}

export function resolveNinthLife(state: State, decision: NinthLifeDecision) {
  if (!state.storyIncident || state.storyIncident.stage !== 'contact' || state.storyResolution
    || !getNinthLifeDecisionOptions(state)[decision].available) return false
  const intervention = getNinthLifeIntervention(state, decision)
  if (intervention?.kind === 'shorokh_false_alarm') {
    state.storyIncident.stage = 'intervention'
    state.storyIncident.stageStartedAt = state.time
    state.storyIncident.deadline = state.time + intervention.delay
    state.storyIncident.pendingDecision = decision
    state.storyIncident.intervention = intervention.kind
    state.speed = 1
    note(state, 'log.story_intervention.shorokh_false_alarm_started', { cat: state.cats.find(cat => cat.id === intervention.catId)?.name ?? intervention.catId, seconds: intervention.delay })
    return true
  }
  return finishNinthLifeResolution(state, decision, intervention?.kind)
}

function finishNinthLifeResolution(state: State, decision: NinthLifeDecision, forcedIntervention?: NinthLifeIntervention) {
  if (!state.storyIncident || state.storyResolution) return false
  const story = state.storyIncident
  const balance = CONFIG.story.decisions[decision]
  const decisionOption = getNinthLifeDecisionOptions(state)[decision]
  const decisionThreat = Math.max(0, balance.threat + decisionOption.threatAdjustment)
  const outcome = STORY_OUTCOMES[decision]
  const preview = forcedIntervention ? undefined : getNinthLifeIntervention(state, decision)
  const intervention = forcedIntervention ?? preview?.kind
  const interventionThreat = intervention === 'bastion_intercept' ? CONFIG.story.bastionInterventionThreat : 0
  const participantCatIds = ninthLifeParticipantCats(state).map(cat => cat.id)
  const locationKnowledge = ninthLifeLocationKnowledge(story, decision)
  const relationBefore = state.relations.needle_front
  const frontDecisionDelta = ninthLifeFrontDecisionDelta(state, story, decision)
  const decisionMemory: Record<NinthLifeDecision, FactionMemoryEvent['kind']> = {
    shelter: 'needle_sheltered', interrogate: 'needle_interrogated', escort: 'needle_escorted', exploit: 'needle_exploited',
  }
  rememberNeedleFront(state, decisionMemory[decision], 'residential_ring', 'needle')
  adjustRelation(state, 'needle_front', frontDecisionDelta, `relation.needle_front.story.${decision}`)
  if (decision === 'escort') {
    const truceKept = frontDecisionDelta === 0
    rememberNeedleFront(state, truceKept ? 'truce_kept' : 'truce_broken', 'residential_ring', 'needle')
  }
  if (locationKnowledge === 'confirmed') {
    adjustRelation(state, 'needle_front', CONFIG.factions.needleFront.exactHqDiscoveryRelation, 'relation.needle_front.hq_compromised')
    rememberNeedleFront(state, 'hq_compromised', 'residential_ring', 'needle-front-depot')
  }
  const frontRelationDelta = state.relations.needle_front - relationBefore
  const needleTrustDelta = ninthLifeNeedleTrustDelta(decision)
  state.needleTrust = Math.max(-100, Math.min(100, state.needleTrust + needleTrustDelta))
  state.hedgehogHqKnowledge = locationKnowledge
  state.fame = Math.min(CONFIG.limits.fame, state.fame + balance.fame)
  state.corporateThreat = Math.min(CONFIG.limits.corporateThreat, state.corporateThreat + decisionThreat + interventionThreat)
  state.storyResolution = {
    decision,
    title: outcome.title,
    fameDelta: balance.fame,
    threatDelta: decisionThreat + interventionThreat,
    branch: outcome.branch,
    outcome: outcome.outcome,
    unlockedLocation: locationKnowledge === 'confirmed',
    locationKnowledge,
    frontRelationDelta,
    needleTrustDelta,
    intervention,
    participantCatIds,
    facts: structuredClone(story.facts),
    deescalated: story.deescalated,
    inaction: story.inaction,
  }
  state.storyIncident = undefined
  scheduleStoryAftermath(state, decision, locationKnowledge)
  if (intervention) {
    const catId = intervention === 'myata_retreat' ? 'myata' : intervention === 'bastion_intercept' ? 'bastion' : 'shorokh'
    note(state, `log.story_intervention.${intervention}`, { cat: state.cats.find(cat => cat.id === catId)?.name ?? catId })
  }
  const totalThreat = decisionThreat + interventionThreat
  note(state, 'log.story_front_consequence', {
    delta: frontRelationDelta,
    relation: state.relations.needle_front,
    trust: state.needleTrust,
    knowledge: locationKnowledge,
  })
  note(state, totalThreat ? 'log.story_closed_threat' : 'log.story_closed', { decision: outcome.title, fame: balance.fame, threat: totalThreat })
  emitEvent(state, { type: 'story_resolved', story: 'ninth_life', decision })
  if (state.fame < CONFIG.goal.fame) note(state, 'log.fame_needed', { fame: CONFIG.goal.fame - state.fame })
  state.speed = 1
  syncAchievements(state)
  return true
}

function scheduleStoryAftermath(state: State, decision: NinthLifeDecision, locationKnowledge: LocationKnowledge) {
  const rules = CONFIG.story.aftermath
  const kindByDecision: Record<NinthLifeDecision, StoryAftermathKind> = {
    shelter: 'base_marked', interrogate: 'intercepted_transmission', escort: 'safe_route', exploit: 'false_entrance',
  }
  const targetByDecision: Record<NinthLifeDecision, MapPoint> = {
    shelter: CONFIG.map.base, interrogate: rules.interceptPoint, escort: rules.borderPoint, exploit: rules.falseEntrancePoint,
  }
  const delay = decision === 'interrogate' ? rules.interrogationDelay : rules.defaultDelay
  const target = targetByDecision[decision]
  const kind = decision === 'exploit'
    ? locationKnowledge === 'false_lead' ? 'false_entrance' : 'intercepted_transmission'
    : kindByDecision[decision]
  state.storyAftermath = { kind, status: 'pending', dueAt: state.time + delay, x: target.x, y: target.y }
  const observer = state.storyObserver
  if (observer) Object.assign(observer, {
    status: 'tracking', fromX: observer.x, fromY: observer.y, targetX: target.x, targetY: target.y,
    movementStartedAt: state.time, movementEndsAt: state.time + delay,
  })
  note(state, 'log.story_aftermath_scheduled', { seconds: delay })
}

function updateStoryAftermath(state: State) {
  const aftermath = state.storyAftermath
  if (!aftermath || aftermath.status === 'completed') return
  const observer = state.storyObserver
  if (observer?.status === 'tracking') {
    const duration = Math.max(SIMULATION_STEP_SECONDS, observer.movementEndsAt - observer.movementStartedAt)
    const progress = Math.max(0, Math.min(1, (state.time - observer.movementStartedAt) / duration))
    observer.x = observer.fromX + (observer.targetX - observer.fromX) * progress
    observer.y = observer.fromY + (observer.targetY - observer.fromY) * progress
  }
  if (state.time + 1e-9 < aftermath.dueAt) return
  aftermath.status = 'completed'
  if (observer) {
    observer.x = observer.targetX
    observer.y = observer.targetY
    observer.status = aftermath.kind === 'base_marked' ? 'revealed' : 'gone'
  }
  note(state, `log.story_aftermath.${aftermath.kind}`)
  maybeShowFinalSummary(state)
}

export function getNinthLifeDecisionOptions(state: State) {
  const story = state.storyIncident
  const atContact = story?.stage === 'contact'
  return {
    shelter: { available: Boolean(atContact), reason: undefined, threatAdjustment: story?.deescalated ? -CONFIG.story.deescalationShelterThreatReduction : 0 },
    interrogate: { available: Boolean(atContact), reason: undefined, threatAdjustment: 0 },
    escort: { available: Boolean(atContact), reason: undefined, threatAdjustment: 0 },
    exploit: {
      available: Boolean(atContact && !story?.deescalated),
      reason: story?.deescalated ? 'story.decision.reason.deescalated' : undefined,
      threatAdjustment: 0,
    },
  }
}

export const STORY_DECISION_PRESENTATION: Record<NinthLifeDecision, {
  title: string
  tag: string
  description: string
  tone: string
}> = {
  shelter: { title: 'Укрыть дезертира', tag: 'Гуманность', description: 'Дать убежище на базе. Слух укрепит имя корпорации, но приведёт преследователей к нашим воротам.', tone: 'danger' },
  interrogate: { title: 'Допросить', tag: 'Разведданные', description: 'Проверить показания и собрать полное досье на укрепление ежей. Без эскалации в секторе.', tone: 'intel' },
  escort: { title: 'Сопроводить к границе', tag: 'Безопасность', description: 'Вывести свидетеля из сектора по тихому маршруту. Надёжно, но без громкой победы.', tone: 'safe' },
  exploit: { title: 'Использовать данные сразу', tag: 'Инициатива', description: 'Не теряя времени, отправить разведку по координатам. Получим новую точку, но раскроем интерес к базе.', tone: 'action' },
}

export function getNinthLifeChoicePreviews(state: State) {
  const options = getNinthLifeDecisionOptions(state)
  return (Object.keys(STORY_DECISION_PRESENTATION) as NinthLifeDecision[]).map(id => {
    const intervention = getNinthLifeIntervention(state, id)
    const story = state.storyIncident
    const intendedFrontDelta = story
      ? ninthLifeFrontDecisionDelta(state, story, id)
        + (ninthLifeLocationKnowledge(story, id) === 'confirmed' ? CONFIG.factions.needleFront.exactHqDiscoveryRelation : 0)
      : 0
    const frontRelationDelta = Math.max(0, Math.min(CONFIG.factions.needleFront.maximumRelation,
      state.relations.needle_front + intendedFrontDelta)) - state.relations.needle_front
    return {
      id,
      ...STORY_DECISION_PRESENTATION[id],
      ...STORY_DECISION_BALANCE[id],
      ...options[id],
      intervention,
      totalThreatDelta: STORY_DECISION_BALANCE[id].threat + options[id].threatAdjustment + (intervention?.threatDelta ?? 0),
      frontRelationDelta,
      locationKnowledge: story ? ninthLifeLocationKnowledge(story, id) : 'hidden' as LocationKnowledge,
    }
  })
}

export function getNinthLifeIntervention(state: State, decision: NinthLifeDecision): NinthLifeInterventionPreview | undefined {
  if (state.storyIncident?.stage !== 'contact') return undefined
  const squads = state.storyIncident.participantSquadIds
    .map(id => state.squads.find(squad => squad.id === id))
    .filter((squad): squad is Squad => Boolean(squad))
  const members = squads.flatMap(squad => membersOf(state, squad))

  if (decision === 'exploit' && members.some(cat => cat.id === 'myata')
    && members.some(cat => cat.id !== 'myata' && (cat.energy < CONFIG.story.myataLowEnergyThreshold || cat.injuredRemaining > 0))) {
    return { kind: 'myata_retreat', catId: 'myata', reason: 'story.intervention.myata.warning', threatDelta: 0, delay: 0 }
  }
  if (decision === 'shelter' && members.some(cat => cat.id === 'bastion') && squads.some(squad => squad.style === 'risky')) {
    return { kind: 'bastion_intercept', catId: 'bastion', reason: 'story.intervention.bastion.warning', threatDelta: CONFIG.story.bastionInterventionThreat, delay: 0 }
  }
  const borderRoute = state.storyIncident.facts.find(fact => fact.id === 'border_route')
  if (decision === 'escort' && members.some(cat => cat.id === 'shorokh') && borderRoute?.quality !== 'confirmed') {
    return { kind: 'shorokh_false_alarm', catId: 'shorokh', reason: 'story.intervention.shorokh.warning', threatDelta: 0, delay: CONFIG.story.shorokhFalseAlarmDelay }
  }
  return undefined
}

export function continueAfterFinale(state: State) {
  if (!state.finalSummaryVisible) return false
  state.finalSummaryVisible = false
  state.finalSummarySeen = true
  if (state.campaignPhase === 'peace_first_shift' && state.firstShift.stage === 'summary') {
    state.firstShift.stage = 'complete'
    state.firstShift.stageStartedAt = state.time
    state.campaignPhase = 'peace_sandbox'
    state.raidTriggered = false
  }
  note(state, 'log.summary_archived')
  return true
}

function spawnMission(state: State): Mission {
  const label = templates[state.missionSerial % templates.length].title
  const generation = CONFIG.mission.generation
  const priority = state.missionSerial % generation.highPriorityEvery === generation.highPriorityOffset
    ? generation.highPriority
    : generation.normalPriority
  for (let attempt = 0; attempt < generation.maxPlacementAttempts; attempt++) {
    const serial = ++state.missionSerial
    const x = generation.x.minimum + (serial * generation.x.multiplier) % generation.x.range
    const y = generation.y.minimum + (serial * generation.y.multiplier) % generation.y.range
    const districtId = getDistrictAtPoint({ x, y })
    const clear = state.missions.every(mission => Math.hypot(mission.x - x, mission.y - y) > generation.minimumSeparation)
    if (state.districts[districtId].access === 'operational' && clear && !pointInCordon(state, { x, y })) return { id: `cleanup-${serial}`, title: label, kind: 'municipal', districtId, createdAt: state.time, x, y, priority, status: 'available', progress: 0, interruptionPolicy: 'preserve_progress', squadIds: [], contributorSquadIds: [] }
  }
  const serial = ++state.missionSerial
  const fallbackCandidates: MapPoint[] = [{ ...CONFIG.map.base }]
  for (let y = generation.y.minimum; y <= generation.y.minimum + generation.y.range; y += generation.minimumSeparation) {
    for (let x = generation.x.minimum; x <= generation.x.minimum + generation.x.range; x += generation.minimumSeparation) {
      if (state.districts[getDistrictAtPoint({ x, y })].access === 'operational') fallbackCandidates.push({ x, y })
    }
  }
  const fallback = fallbackCandidates.reduce((best, candidate) => {
    const separation = Math.min(...state.missions.map(mission => Math.hypot(mission.x - candidate.x, mission.y - candidate.y)), Number.POSITIVE_INFINITY)
    const bestSeparation = Math.min(...state.missions.map(mission => Math.hypot(mission.x - best.x, mission.y - best.y)), Number.POSITIVE_INFINITY)
    return separation > bestSeparation ? candidate : best
  })
  return { id: `cleanup-${serial}`, title: label, kind: 'municipal', districtId: getDistrictAtPoint(fallback), createdAt: state.time, ...fallback, priority, status: 'available', progress: 0, interruptionPolicy: 'preserve_progress', squadIds: [], contributorSquadIds: [] }
}

function desiredMissionCount(time: number) {
  const unlockedSteps = Math.min(Math.floor(time / CONFIG.mission.flowInterval) + 1, CONFIG.mission.flowCycle.length)
  return Math.max(...CONFIG.mission.flowCycle.slice(0, unlockedSteps))
}

function reconcileMissionFlow(state: State) {
  if (state.campaignPhase === 'peace_first_shift') return
  if (state.relations.green_monolith < 100 && state.time >= state.monolith.nextServiceAt
    && !state.missions.some(mission => mission.kind === 'monolith_service')) {
    state.missions.push({ id: `monolith-service-${++state.missionSerial}`, title: 'mission.monolith_service', kind: 'monolith_service', districtId: 'north_bastion', createdAt: state.time, x: 48, y: 17, priority: 1, status: 'available', progress: 0, interruptionPolicy: 'preserve_progress', squadIds: [], contributorSquadIds: [] })
  }
  const desired = desiredMissionCount(state.time)
  while (state.missions.filter(mission => mission.kind === 'municipal').length < desired) state.missions.push(spawnMission(state))
}

function randomPercent(state: State) {
  let value = state.rngSeed >>> 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  state.rngSeed = value >>> 0
  return (state.rngSeed % CONFIG.chance.maximum) + 1
}

function membersOf(state: State, squad: Squad) {
  return squad.members.map(id => state.cats.find(cat => cat.id === id)).filter((cat): cat is Cat => Boolean(cat))
}

function baseTeamChance(members: Cat[], baseChance: number, skillSum: number, styleBonus = 0, traitBonus = 0, equipmentBonus = 0) {
  const teamSkillBonus = Math.min(CONFIG.chance.teamSkillBonusCap, Math.floor(skillSum * CONFIG.chance.teamSkillMultiplier))
  const averageEnergy = members.reduce((sum, cat) => sum + cat.energy, 0) / Math.max(1, members.length)
  const fatiguePenalty = Math.min(
    CONFIG.chance.fatiguePenaltyCap,
    Math.floor(Math.max(0, CONFIG.chance.fatigueStartsBelowEnergy - averageEnergy) / CONFIG.chance.fatiguePenaltyEnergyStep),
  )
  return Math.max(
    CONFIG.chance.minimum,
    Math.min(CONFIG.chance.maximum, baseChance + teamSkillBonus + styleBonus + traitBonus + equipmentBonus - fatiguePenalty),
  )
}

export function getSquadCleanupEstimate(state: State, squad: Squad): CleanupEstimate {
  const members = membersOf(state, squad)
  if (!members.length) return { members: 0, baseRate: 0, traitRate: 0, equipmentRate: 0, totalRate: 0, seconds: 0, energyPerCat: 0 }
  const traitRate = members.reduce((sum, cat) => sum + cat.cleanupTrait / 100, 0)
  const equipmentRate = members.reduce((sum, cat) => sum
    + (hasEquipped(cat, 'toolkit') ? itemBonus('toolkit', 'cleanupBonus') : 0)
    + (hasEquipped(cat, 'scanner') ? itemBonus('scanner', 'cleanupBonus') : 0), 0) / 100
  const baseRate = members.length
  const totalRate = baseRate + traitRate + equipmentRate
  const seconds = CONFIG.mission.cleanupWork / totalRate
  return {
    members: members.length,
    baseRate,
    traitRate,
    equipmentRate,
    totalRate,
    seconds,
    energyPerCat: seconds * CONFIG.mission.energyCostPerBaseCleanup / CONFIG.mission.cleanupWork,
  }
}

function cleanupParticipants(state: State, missionId: string) {
  return missionWorkingSquads(state, missionId).filter(squad => squad.phase === 'cleanup')
}

function cleanupRate(state: State, missionId: string) {
  return cleanupParticipants(state, missionId)
    .reduce((total, squad) => total + getSquadCleanupEstimate(state, squad).totalRate, 0)
}

export function getCleanupSecondsRemaining(state: State, squad: Squad) {
  const mission = state.missions.find(candidate => candidate.id === squad.missionId)
  const rate = mission ? cleanupRate(state, mission.id) : 0
  return rate > 0 && mission ? Math.max(0, CONFIG.mission.cleanupWork - (mission.progress ?? 0)) / rate : 0
}

export function isSquadResting(state: State, squad: Squad) {
  return membersOf(state, squad).some(cat => cat.sleeping
    ? cat.energy < CONFIG.sleep.wakeForOrderEnergy
    : cat.energy <= CONFIG.sleep.sleepAtEnergy)
}

export function getSquadMinimumEnergy(state: State, squad: Squad) {
  const members = membersOf(state, squad)
  return members.length ? Math.round(Math.min(...members.map(cat => cat.energy))) : 0
}

export function isActiveAssignedMission(state: State, mission: Mission) {
  return mission.status === 'assigned'
    && mission.squadIds.some(id => state.squads.find(squad => squad.id === id)?.phase !== 'returning')
}

export function getMissionSquadRosters(state: State, mission: Mission): MissionSquadRoster[] {
  return mission.squadIds.flatMap(squadId => {
    const squad = state.squads.find(candidate => candidate.id === squadId)
    return squad ? [{ squad, members: membersOf(state, squad) }] : []
  })
}

export function getOperationalQueue(state: State): OperationalQueueItem[] {
  const missions: OperationalQueueItem[] = state.missions
    .filter(mission => mission.status === 'available' || isActiveAssignedMission(state, mission))
    .map(mission => {
      const incident = state.incident?.missionId === mission.id
      const assigned = mission.status === 'assigned'
      const workingSquad = assigned
        ? mission.squadIds.map(id => state.squads.find(squad => squad.id === id)).find(squad => squad?.phase === 'cleanup')
        : undefined
      return {
        id: `mission:${mission.id}`,
        kind: 'mission',
        title: mission.title,
        status: incident ? 'operations.status.incident'
          : assigned ? workingSquad ? 'missions.in_progress' : 'missions.en_route'
            : 'missions.available',
        priority: incident ? 100 : mission.priority * 10 + (assigned ? 2 : 0),
        createdAt: mission.createdAt,
        deadline: mission.deadline,
        districtId: mission.districtId,
        missionId: mission.id,
        progress: Math.max(0, Math.min(100, Math.round(mission.progress / CONFIG.mission.cleanupWork * 100))),
        remainingSeconds: workingSquad ? getCleanupSecondsRemaining(state, workingSquad) : undefined,
      }
    })
  const urgent: OperationalQueueItem[] = state.urgentOperation
    && ['available', 'dispatch', 'active'].includes(state.urgentOperation.status)
    ? [{
        id: 'urgent:water_filters',
        kind: 'urgent',
        title: 'urgent.water_filters.title',
        status: `urgent.status.${state.urgentOperation.status}`,
        priority: 80,
        createdAt: state.urgentOperation.availableAt,
        deadline: state.urgentOperation.deadline,
        districtId: getDistrictAtPoint(state.urgentOperation),
      }]
    : []
  const story: OperationalQueueItem[] = state.storyIncident
    ? [{
        id: 'story:ninth_life',
        kind: 'story',
        title: 'story.ninth_life.title',
        status: `story.status.${state.storyIncident.stage}`,
        priority: 90,
        createdAt: state.storyIncident.stageStartedAt,
        deadline: state.storyIncident.deadline,
        districtId: getDistrictAtPoint(state.storyIncident),
      }]
    : []
  return [...missions, ...urgent, ...story].sort((left, right) => right.priority - left.priority
    || (left.deadline ?? Infinity) - (right.deadline ?? Infinity)
    || left.createdAt - right.createdAt
    || left.id.localeCompare(right.id))
}

function actionChance(state: State, squad: Squad, action: 'support' | 'attack') {
  const members = membersOf(state, squad)
  const skillSum = members.reduce((sum, cat) => sum + (action === 'support' ? cat.scouting + cat.perception : cat.combat + cat.reaction), 0)
  const styleBonus = action === 'support'
    ? squad.style === 'careful' ? CONFIG.chance.styleBonus : squad.style === 'risky' ? -CONFIG.chance.styleBonus : 0
    : squad.style === 'careful' ? -CONFIG.chance.styleBonus : squad.style === 'risky' ? CONFIG.chance.styleBonus : 0
  const traitBonus = members.reduce((sum, cat) => sum + (action === 'support' ? cat.supportTrait : cat.attackTrait), 0)
  const equipmentBonus = members.reduce((sum, cat) => sum
    + (action === 'support' && hasEquipped(cat, 'headset') ? itemBonus('headset', 'supportBonus') : 0)
    + (action === 'attack' && hasEquipped(cat, 'nonlethal_weapon') ? itemBonus('nonlethal_weapon', 'attackBonus') : 0), 0)
  const baseChance = action === 'support' ? CONFIG.raid.supportBaseChance : CONFIG.raid.attackBaseChance
  return baseTeamChance(members, baseChance, skillSum, styleBonus, traitBonus, equipmentBonus)
}

function incidentCombinedSquad(state: State, participantIds: string[]): Squad {
  return {
    id: '__incident__',
    name: 'incident.participants',
    members: participantIds.flatMap(id => state.squads.find(squad => squad.id === id)?.members ?? []),
    style: 'balanced',
    autoDispatch: false,
    phase: 'incident',
    travel: 0,
    travelDuration: 0,
    completed: 0,
    routeFrom: { ...CONFIG.map.base },
    route: [{ ...CONFIG.map.base }],
    restAfterReturn: false,
  }
}

function eligibleSupportSquads(state: State, excludedIds: string[]) {
  return state.squads
    .filter(squad => {
      const members = membersOf(state, squad)
      return !excludedIds.includes(squad.id) && members.length > 0
        && !squad.missionId && ['base', 'field'].includes(squad.phase)
        && members.every(cat => cat.injuredRemaining <= 0 && canReceiveWorkOrder(cat))
    })
    .sort((a, b) => Number(a.phase !== 'base') - Number(b.phase !== 'base') || a.id.localeCompare(b.id))
}

export function getRaidSupportCandidates(state: State): RaidSupportCandidate[] {
  if (!state.incident || state.incident.stage !== 'decision') return []
  return eligibleSupportSquads(state, state.incident.participantSquadIds).map(squad => ({
    squadId: squad.id,
    squadName: getSquadDisplayName(squad),
    memberIds: [...squad.members],
    chance: actionChance(state, squad, 'support'),
    location: squad.phase === 'base' ? 'base' : 'field',
  }))
}

function startRaidIncident(state: State, mission: Mission) {
  state.raidTriggered = true
  state.speed = 0
  const participants = cleanupParticipants(state, mission.id)
  if (!participants.length) return
  const participantIds = participants.map(participant => participant.id)
  const combined = incidentCombinedSquad(state, participantIds)
  const threatRoll = randomPercent(state)
  const actualActor: RaidIncident['actualActor'] = state.campaignPhase === 'peace_sandbox' ? 'needle_front' : 'bandits'
  const threatClass: ContactThreat = actualActor === 'needle_front'
    ? threatRoll <= CONFIG.raid.contactThreatRolls.armedBelow ? 'armed' : 'heavy'
    : threatRoll <= CONFIG.raid.contactThreatRolls.harmlessBelow
      ? 'harmless' : threatRoll <= CONFIG.raid.contactThreatRolls.armedBelow ? 'armed' : 'heavy'
  for (const participant of participants) participant.phase = 'incident'
  state.incident = {
    kind: 'raiders',
    stage: 'decision',
    missionId: mission.id,
    supportChance: actionChance(state, combined, 'support'),
    attackChance: actionChance(state, combined, 'attack'),
    supportRoll: randomPercent(state),
    attackRoll: randomPercent(state),
    injuryRoll: randomPercent(state),
    injuredMemberRoll: randomPercent(state),
    participantSquadIds: participantIds,
    threatClass,
    threatRoll,
    monolithRoll: randomPercent(state),
    monolithRequested: false,
    intelConfirmed: false,
    clues: ['incident.clue.movement', 'incident.clue.unclear_numbers'],
    actualActor,
  }
  note(state, 'log.raid_started', { squad: participants.map(squad => getSquadDisplayName(squad)).join(', ') })
  emitEvent(state, { type: 'incident_started', incident: 'raiders', squadIds: participantIds, missionId: mission.id })
}

export function getIncidentCheckOptions(state: State) {
  const incident = state.incident
  const cats = incident ? incident.participantSquadIds.flatMap(id => membersOf(state, state.squads.find(s => s.id === id) ?? incidentCombinedSquad(state, []))) : []
  const hasScanner = cats.some(cat => hasEquipped(cat, 'scanner'))
  const hasMarlowe = cats.some(cat => cat.id === 'marlowe')
  const frontChannelOpen = incident?.knownActor === 'needle_front' && state.relations.needle_front >= 35
  return {
    observe: { available: incident?.stage === 'decision', seconds: CONFIG.raid.checks.observe, reason: undefined as string | undefined },
    recon: { available: incident?.stage === 'decision' && cats.some(cat => cat.id === 'shorokh'), seconds: CONFIG.raid.checks.recon, reason: 'incident.reason.shorokh' },
    scan: { available: incident?.stage === 'decision' && hasScanner, seconds: CONFIG.raid.checks.scan, reason: 'incident.reason.scanner' },
    contact: { available: incident?.stage === 'decision' && (hasMarlowe || frontChannelOpen), seconds: CONFIG.raid.checks.contact, reason: 'incident.reason.marlowe' },
  }
}

export function checkIncident(state: State, check: IncidentCheck) {
  const incident = state.incident
  const option = getIncidentCheckOptions(state)[check]
  if (!incident || !option.available || incident.stage !== 'decision') return false
  incident.stage = 'checking'; incident.check = check; incident.checkEndsAt = state.time + option.seconds
  state.speed = 1
  note(state, `log.incident_check.${check}`, { seconds: option.seconds })
  return true
}

export function getMonolithSupportOption(state: State) {
  const incident = state.incident
  const chance = Math.max(CONFIG.raid.monolith.minimumResponseChance, state.relations.green_monolith)
  const unit = state.externalUnits.guard_7
  return { available: Boolean(incident?.stage === 'decision' && !incident.monolithRequested && unit.status === 'available'), chance, seconds: CONFIG.raid.monolith.travelTime,
    reason: incident?.monolithRequested ? 'incident.reason.monolith_used' : unit.status !== 'available' ? 'incident.reason.monolith_busy' : undefined }
}

export function getPoliceSupportOption(state: State) {
  const incident = state.incident
  const unit = state.externalUnits.patrol_12
  return {
    available: Boolean(incident?.stage === 'decision' && unit.status === 'available'),
    seconds: policeTravelTime(state),
    reason: unit.status !== 'available' ? 'incident.reason.police_busy' : undefined,
  }
}

export function requestPoliceSupport(state: State) {
  const incident = state.incident
  const option = getPoliceSupportOption(state)
  if (!incident || !option.available) return false
  const mission = state.missions.find(candidate => candidate.id === incident.missionId)
  if (!mission || !dispatchExternalUnit(state, 'patrol_12', mission, 'support')) return false
  incident.stage = 'police_en_route'
  state.speed = 1
  return true
}

export function requestMonolithSupport(state: State) {
  const incident = state.incident
  const option = getMonolithSupportOption(state)
  if (!incident || !option.available) return false
  incident.monolithRequested = true
  const accepted = incident.monolithRoll <= option.chance
  emitEvent(state, { type: 'monolith_response', accepted, missionId: incident.missionId })
  if (!accepted) { note(state, 'log.monolith_declined', { chance: option.chance }); return true }
  const mission = state.missions.find(candidate => candidate.id === incident.missionId)
  if (!mission) return false
  incident.stage = 'monolith_en_route'
  if (!dispatchExternalUnit(state, 'guard_7', mission, 'support')) return false
  state.speed = 1
  return true
}

export function getRaidOptions(state: State) {
  if (!state.incident) return undefined
  const supportCandidates = getRaidSupportCandidates(state)
  const participantIds = state.incident.participantSquadIds
  const hasWeapon = membersOf(state, incidentCombinedSquad(state, participantIds))
    .some(cat => hasEquipped(cat, 'nonlethal_weapon'))
  const defenseReady = state.research.nodes.improvised_defense.completed
  return {
    escape: { available: true, chance: CONFIG.chance.maximum } satisfies RaidOption,
    attack: defenseReady && hasWeapon
      ? { available: true, chance: state.incident.attackChance } satisfies RaidOption
      : { available: false, reason: defenseReady ? 'raid.reason.equip_weapon' : 'raid.reason.research_defense' } satisfies RaidOption,
    support: supportCandidates.length
      ? { available: true, candidates: supportCandidates }
      : { available: false, reason: 'raid.reason.no_support_squad', candidates: [] },
  }
}

function removeMission(state: State, missionId?: string) {
  if (!missionId) return
  const mission = state.missions.find(candidate => candidate.id === missionId)
  if (mission) state.missions.splice(state.missions.indexOf(mission), 1)
}

export function getSquadMapPosition(squad: Squad, pendingTravel = 0): MapPoint {
  const travel = squad.travel + Math.max(0, pendingTravel)
  if (squad.phase === 'base') return { ...CONFIG.map.base }
  if (['returning', 'moving', 'outbound', 'support', 'merging'].includes(squad.phase) && squad.route?.length > 1) {
    return positionAlongRoute(squad.route, Math.min(1, travel / Math.max(squad.travelDuration, 1e-9)))
  }
  if (squad.phase === 'returning') {
    const ratio = Math.min(1, travel / Math.max(squad.travelDuration, 1e-9))
    return {
      x: squad.routeFrom.x + (CONFIG.map.base.x - squad.routeFrom.x) * ratio,
      y: squad.routeFrom.y + (CONFIG.map.base.y - squad.routeFrom.y) * ratio,
    }
  }
  if (squad.phase === 'moving' && squad.destination) {
    const ratio = Math.min(1, travel / Math.max(squad.travelDuration, 1e-9))
    return {
      x: squad.routeFrom.x + (squad.destination.x - squad.routeFrom.x) * ratio,
      y: squad.routeFrom.y + (squad.destination.y - squad.routeFrom.y) * ratio,
    }
  }
  if (squad.phase === 'merging' && squad.mergePoint) {
    const ratio = Math.min(1, travel / Math.max(squad.travelDuration, 1e-9))
    return {
      x: squad.routeFrom.x + (squad.mergePoint.x - squad.routeFrom.x) * ratio,
      y: squad.routeFrom.y + (squad.mergePoint.y - squad.routeFrom.y) * ratio,
    }
  }
  if (!squad.target) return { ...squad.routeFrom }
  if (!['outbound', 'support'].includes(squad.phase)) return { x: squad.target.x, y: squad.target.y }
  const destination = squad.target
  const ratio = Math.min(1, travel / Math.max(squad.travelDuration, 1e-9))
  return {
    x: squad.routeFrom.x + (destination.x - squad.routeFrom.x) * ratio,
    y: squad.routeFrom.y + (destination.y - squad.routeFrom.y) * ratio,
  }
}

function completeSquadMerge(state: State, source: Squad, target: Squad) {
  for (const memberId of source.members) {
    if (!target.members.includes(memberId)) target.members.push(memberId)
    const cat = state.cats.find(candidate => candidate.id === memberId)
    if (cat) cat.assignedTo = target.id
  }
  target.completed += source.completed
  for (const cat of state.cats) {
    if (cat.pendingAssignment === source.id) cat.pendingAssignment = target.id
  }
  for (const follower of state.squads) {
    if (follower.mergeTargetSquadId === source.id) follower.mergeTargetSquadId = target.id
  }
  for (const mission of state.missions) {
    mission.squadIds = [...new Set(mission.squadIds.map(id => id === source.id ? target.id : id))]
    mission.contributorSquadIds = [...new Set(mission.contributorSquadIds.map(id => id === source.id ? target.id : id))]
  }
  state.squads.splice(state.squads.indexOf(source), 1)
  note(state, 'log.squad_merged', { source: source.name, target: target.name })
  emitEvent(state, { type: 'squad_merged', sourceSquadId: source.id, targetSquadId: target.id })
}

function sendHome(squad: Squad, restAfterReturn = false, origin = getSquadMapPosition(squad)) {
  squad.phase = 'returning'
  delete squad.destination
  squad.routeFrom = origin
  squad.route = [{ ...origin }, { ...CONFIG.map.base }]
  squad.restAfterReturn = restAfterReturn
  squad.travel = 0
  squad.travelDuration = travelTimeBetween(origin, CONFIG.map.base)
  delete squad.destination
  delete squad.mergeTargetSquadId
  delete squad.mergePoint
  delete squad.missionArrivalTime
}

export function getReturnSquadBlockReason(state: State, squadId: string) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad || squad.phase === 'base' || squad.phase === 'incident' || squad.phase === 'support'
    || state.incident?.participantSquadIds.includes(squad.id)) return 'dispatch.reason.away'
  return undefined
}

export function returnSquadToBase(state: State, squadId: string) {
  if (getReturnSquadBlockReason(state, squadId)) return false
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return false
  const origin = getSquadMapPosition(squad)
  releaseSquadFromMission(state, squad)
  sendHome(squad, false, origin)
  note(state, 'log.squad_ordered_home', { squad: squad.name })
  return true
}

export function returnSquadsToBase(state: State, squadIds: string[]) {
  let accepted = false
  for (const squadId of [...new Set(squadIds)]) {
    if (returnSquadToBase(state, squadId)) accepted = true
  }
  return accepted
}

export function getCatTraitPresentation(cat: Cat): CatTraitPresentation | undefined {
  const definitions: Record<string, Omit<CatTraitPresentation, 'value'>> = {
    marlowe: { trait: 'Деэскалация', action: 'поддержке', format: 'bonus' },
    pixel: { trait: 'Самодиагностика', action: 'скорости уборки', format: 'bonus' },
    rust: { trait: 'Тяжёлая работа', action: 'скорости уборки', format: 'bonus' },
    shorokh: { trait: 'Паранойя', action: 'поддержке', format: 'bonus' },
    bastion: { trait: 'Силовой ответ', action: 'нападению', format: 'bonus' },
    myata: { trait: 'Бережёт команду', action: 'ранению', format: 'reduction' },
  }
  const definition = definitions[cat.id]
  if (!definition) return undefined
  const value = cat.cleanupTrait || cat.supportTrait || cat.attackTrait || cat.injuryTrait
  return { ...definition, value }
}

function injuryChance(state: State, squad: Squad) {
  const members = membersOf(state, squad)
  const traitReduction = members.reduce((sum, cat) => sum + cat.injuryTrait, 0)
  const armorReduction = members.reduce((sum, cat) => sum + (hasEquipped(cat, 'armor_vest') ? itemBonus('armor_vest', 'injuryReduction') : 0), 0)
  return Math.max(CONFIG.raid.minimumInjuryChance, CONFIG.raid.injuryBaseChance - traitReduction - armorReduction)
}

function maybeInjureCat(state: State, squad: Squad, incident: RaidIncident) {
  if (incident.injuryRoll > injuryChance(state, squad) || !squad.members.length) return
  const memberId = squad.members[(incident.injuredMemberRoll - 1) % squad.members.length]
  const cat = state.cats.find(candidate => candidate.id === memberId)
  if (!cat) return
  cat.injuredRemaining = hasEquipped(cat, 'medkit') ? CONFIG.raid.medkitRecoveryTime : CONFIG.raid.injuryRecoveryTime
  note(state, 'log.cat_injured', { cat: cat.name })
  emitEvent(state, { type: 'cat_injured', catId: cat.id, seconds: cat.injuredRemaining })
}

function incidentSquads(state: State, incident: RaidIncident) {
  return incident.participantSquadIds
    .map(id => state.squads.find(squad => squad.id === id))
    .filter((squad): squad is Squad => Boolean(squad))
}

function incidentSquadLabel(state: State, incident: RaidIncident) {
  return incidentSquads(state, incident).map(squad => getSquadDisplayName(squad)).join(', ')
}

function failRaid(state: State, incident: RaidIncident, messageKey: string) {
  const combined = incidentCombinedSquad(state, incident.participantSquadIds)
  maybeInjureCat(state, combined, incident)
  for (const participantId of incident.participantSquadIds) {
    const participant = state.squads.find(candidate => candidate.id === participantId)
    if (!participant) continue
    releaseSquadFromMission(state, participant)
    sendHome(participant)
  }
  state.incident = undefined
  note(state, messageKey, { squad: incidentSquadLabel(state, incident) })
  emitEvent(state, {
    type: 'mission_failed',
    squadIds: [...incident.participantSquadIds],
    missionId: incident.missionId,
    reason: messageKey === 'log.raid_attack_failed' ? 'attack' : 'support',
  })
}

export function resolveRaidDecision(state: State, action: 'escape' | 'attack' | 'support', supportSquadId?: string) {
  const incident = state.incident
  if (!incident || incident.stage !== 'decision') return false
  const participants = incidentSquads(state, incident)
  if (!participants.length) return false
  const mission = state.missions.find(candidate => candidate.id === incident.missionId)
  if (!mission) return false

  if (action === 'escape') {
    applyNeedleFrontEncounter(state, incident, 5, 'cell_spared', 'relation.needle_front.cell_spared')
    for (const participantId of incident.participantSquadIds) {
      const participant = state.squads.find(squad => squad.id === participantId)
      if (!participant) continue
      releaseSquadFromMission(state, participant)
      sendHome(participant)
    }
    state.incident = undefined
    note(state, 'log.raid_escape', { squad: incidentSquadLabel(state, incident) })
    emitEvent(state, { type: 'mission_failed', squadIds: [...incident.participantSquadIds], missionId: incident.missionId, reason: 'escape' })
    syncAchievements(state)
    return true
  }
  if (action === 'attack') {
    const attackAvailable = state.research.nodes.improvised_defense.completed
      && membersOf(state, incidentCombinedSquad(state, incident.participantSquadIds))
        .some(cat => hasEquipped(cat, 'nonlethal_weapon'))
    if (!attackAvailable) return false
    applyNeedleFrontEncounter(state, incident, -5, 'cell_suppressed', 'relation.needle_front.cell_suppressed')
    if (incident.attackRoll > incident.attackChance) {
      failRaid(state, incident, 'log.raid_attack_failed')
      syncAchievements(state)
      return true
    }
    for (const participant of participants) participant.phase = 'cleanup'
    state.incident = undefined
    note(state, 'log.raid_attack_won', { squad: incidentSquadLabel(state, incident) })
    syncAchievements(state)
    return true
  }

  if (!supportSquadId) return false
  const support = eligibleSupportSquads(state, incident.participantSquadIds).find(squad => squad.id === supportSquadId)
  if (!support) return false
  if (incident.supportRoll > actionChance(state, support, 'support')) {
    applyNeedleFrontEncounter(state, incident, -5, 'cell_suppressed', 'relation.needle_front.cell_suppressed')
    failRaid(state, incident, 'log.raid_support_failed')
    syncAchievements(state)
    return true
  }

  const supportOrigin = getSquadMapPosition(support)
  membersOf(state, support).forEach(cat => wakeForWorkOrder(state, cat))
  incident.stage = 'support_en_route'
  incident.supportSquadId = support.id
  support.phase = 'support'
  support.routeFrom = supportOrigin
  support.route = routeBetween(state, supportOrigin, mission).points
  support.restAfterReturn = false
  support.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
  support.travel = 0
  support.travelDuration = state.research.nodes.emergency_dispatch.completed
    ? CONFIG.raid.researchedSupportTravelTime
    : CONFIG.raid.supportTravelTime
  state.speed = 1
  note(state, 'log.support_dispatched', { squad: support.name, seconds: support.travelDuration })
  emitEvent(state, { type: 'support_requested', squadId: support.id, missionId: mission.id, seconds: support.travelDuration })
  return true
}

export function resolveRaidFollowup(state: State, action: 'retreat' | 'continue') {
  const incident = state.incident
  if (!incident || incident.stage !== 'support_decision') return false
  const support = state.squads.find(squad => squad.id === incident.supportSquadId)
  const mission = state.missions.find(candidate => candidate.id === incident.missionId)
  if (!support || !mission) return false

  applyNeedleFrontEncounter(
    state,
    incident,
    action === 'retreat' ? 5 : -5,
    action === 'retreat' ? 'cell_spared' : 'cell_suppressed',
    action === 'retreat' ? 'relation.needle_front.cell_spared' : 'relation.needle_front.cell_suppressed',
  )

  if (action === 'continue') {
    support.missionId = incident.missionId
    support.missionArrivalTime = state.time
    support.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
    if (!incident.participantSquadIds.includes(support.id)) incident.participantSquadIds.push(support.id)
    if (!mission.squadIds.includes(support.id)) mission.squadIds.push(support.id)
    for (const participantId of incident.participantSquadIds) {
      const participant = state.squads.find(squad => squad.id === participantId)
      if (!participant) continue
      participant.phase = 'cleanup'
      participant.missionId = incident.missionId
      participant.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
      participant.missionArrivalTime ??= state.time
    }
    note(state, 'log.raid_support_won')
  } else {
    for (const participantId of new Set([...incident.participantSquadIds, support.id])) {
      const participant = state.squads.find(squad => squad.id === participantId)
      if (!participant) continue
      releaseSquadFromMission(state, participant)
      sendHome(participant)
    }
    note(state, 'log.raid_retreat')
    emitEvent(state, { type: 'mission_failed', squadIds: [...incident.participantSquadIds], missionId: incident.missionId, reason: 'retreat' })
  }
  state.incident = undefined
  syncAchievements(state)
  return true
}

function arriveAtBase(state: State, squad: Squad) {
  const shouldRest = squad.restAfterReturn
  const returnedMembers = membersOf(state, squad)
  const mission = state.missions.find(candidate => candidate.id === squad.missionId)
  if (mission?.status === 'completed') removeMission(state, mission.id)
  else releaseSquadFromMission(state, squad)
  squad.phase = 'base'
  squad.missionId = undefined
  squad.target = undefined
  delete squad.destination
  squad.travel = 0
  squad.travelDuration = 0
  squad.routeFrom = { ...CONFIG.map.base }
  squad.route = [{ ...CONFIG.map.base }]
  squad.restAfterReturn = false
  delete squad.mergeTargetSquadId
  delete squad.mergePoint
  delete squad.missionArrivalTime
  note(state, 'log.squad_returned', { squad: squad.name })
  returnedMembers.forEach(cat => applyPendingEquipment(state, cat))
  if (shouldRest) returnedMembers.forEach(cat => putCatToSleep(state, cat))
  applyAvailablePendingAssignments(state)
}

function chooseResearchWorker(state: State) {
  const current = getResearchWorker(state)
  if (current && !current.assignedTo && current.injuredRemaining <= 0
    && current.energy > CONFIG.research.minimumContinueEnergy && canReceiveWorkOrder(current)) {
    wakeForWorkOrder(state, current)
    return current
  }
  const next = state.cats
    .filter(cat => !cat.assignedTo && cat.injuredRemaining <= 0
      && cat.energy >= CONFIG.research.minimumStartEnergy && canReceiveWorkOrder(cat))
    .sort((a, b) => b.tech - a.tech || a.id.localeCompare(b.id))[0]
  if (next) wakeForWorkOrder(state, next)
  state.research.workerCatId = next?.id
  return next
}

function completeResearch(state: State, researchId: ResearchId) {
  const node = state.research.nodes[researchId]
  const definition = CONFIG.research.nodes.find(candidate => candidate.id === researchId)
  node.progress = CONFIG.research.duration
  node.completed = true
  state.research.activeId = undefined
  state.research.workerCatId = undefined
  if (definition && 'rewardItemId' in definition) {
    const itemId = definition.rewardItemId as ItemId
    state.inventory[itemId] += definition.rewardCount
  }
  note(state, 'log.research_completed', { research: definition?.name ?? researchId })
  emitEvent(state, { type: 'research_completed', researchId })
}

function updateResearch(state: State, elapsed: number) {
  const researchId = state.research.activeId
  if (!researchId) {
    state.research.workerCatId = undefined
    return undefined
  }
  const node = state.research.nodes[researchId]
  if (node.completed) {
    state.research.activeId = undefined
    state.research.workerCatId = undefined
    return undefined
  }
  const worker = chooseResearchWorker(state)
  if (!worker || state.scrap <= 0) return undefined

  const remainingWork = CONFIG.research.duration - node.progress
  const fundedWork = state.scrap * CONFIG.research.scrapInterval - node.spendClock
  const energyWork = Math.max(0, (worker.energy - CONFIG.research.minimumContinueEnergy) * CONFIG.research.duration / CONFIG.research.energyCost)
  const work = Math.min(elapsed, remainingWork, fundedWork, energyWork)
  if (work <= 0) return undefined

  node.progress += work
  node.spendClock += work
  const spent = Math.min(state.scrap, Math.floor((node.spendClock + 1e-9) / CONFIG.research.scrapInterval))
  if (spent > 0) {
    state.scrap -= spent
    node.scrapSpent += spent
    node.spendClock -= spent * CONFIG.research.scrapInterval
  }
  worker.energy = Math.max(0, worker.energy - work * CONFIG.research.energyCost / CONFIG.research.duration)
  if (node.progress + 1e-9 >= CONFIG.research.duration) completeResearch(state, researchId)
  return worker.id
}

function updateRestAndRecovery(state: State, elapsed: number, workingCatId?: string) {
  state.cats.forEach(cat => {
    if (!catIsAtBase(state, cat)) return
    if (cat.id !== workingCatId) cat.energy = Math.min(CONFIG.limits.energy, cat.energy + elapsed * CONFIG.mission.restPerSecond)
    if (cat.injuredRemaining > 0) {
      cat.injuredRemaining = Math.max(0, cat.injuredRemaining - elapsed)
      if (cat.injuredRemaining === 0) note(state, 'log.cat_recovered', { cat: cat.name })
    }
  })
}

function spendTravelEnergy(state: State, squad: Squad, elapsed: number) {
  const travelElapsed = Math.min(elapsed, Math.max(0, squad.travelDuration - squad.travel))
  const energyCost = travelElapsed * CONFIG.mission.energyCostPerTravelSecond
  for (const cat of membersOf(state, squad)) cat.energy = Math.max(0, cat.energy - energyCost)
}

function adjustRelation(state: State, ownerId: RelationOwnerId, delta: number, event: string) {
  state.relations[ownerId] = Math.max(0, Math.min(relationMaximum(ownerId), state.relations[ownerId] + delta))
  state.relationLastEvent[ownerId] = event
}

export function getRelationPresentation(state: State, ownerId: RelationOwnerId) {
  const value = state.relations[ownerId]
  return {
    value,
    maximum: relationMaximum(ownerId),
    band: relationBand(ownerId, value),
    label: `relation.band.${relationBand(ownerId, value)}`,
  }
}

function rememberNeedleFront(state: State, kind: FactionMemoryEvent['kind'], districtId?: DistrictId, subjectId?: string) {
  state.factionMemory.push({ kind, time: state.time, districtId, subjectId })
}

function revealIncidentActor(state: State, incident: RaidIncident) {
  if (incident.knownActor) return
  incident.knownActor = incident.actualActor
  const clue = `incident.actor.${incident.actualActor}`
  if (!incident.clues.includes(clue)) incident.clues.push(clue)
  note(state, `log.incident_actor.${incident.actualActor}`)
}

function applyNeedleFrontEncounter(
  state: State,
  incident: RaidIncident,
  delta: number,
  memory: FactionMemoryEvent['kind'],
  event: string,
) {
  revealIncidentActor(state, incident)
  if (incident.actualActor !== 'needle_front') return
  const before = state.relations.needle_front
  adjustRelation(state, 'needle_front', delta, event)
  rememberNeedleFront(state, memory, state.missions.find(mission => mission.id === incident.missionId)?.districtId)
  note(state, 'log.needle_front_relation', {
    delta: state.relations.needle_front - before,
    relation: state.relations.needle_front,
  })
}

function createMonolithCordon(state: State, incident: RaidIncident, point: MapPoint) {
  const rules = incident.threatClass === 'heavy' ? { radius: 16, seconds: 60, territory: -1, trust: 5 }
    : incident.threatClass === 'armed' ? { radius: 16, seconds: 45, territory: -10, trust: -10 }
      : { radius: 10, seconds: 30, territory: -5, trust: -20 }
  adjustRelation(state, 'green_monolith', rules.trust, `relation.monolith.${incident.threatClass}`)
  const affectedOwnerIds = [...new Set(HEADQUARTERS.filter(hq => hq.ownerId !== 'green_monolith'
    && Math.hypot(hq.x - point.x, hq.y - point.y) <= rules.radius).map(hq => hq.ownerId))]
  for (const ownerId of affectedOwnerIds) adjustRelation(state, ownerId, rules.territory, `relation.cordon.${incident.threatClass}`)
  const cordon: Cordon = { id: `cordon-${Math.round(state.time * 1000)}`, ...point, radius: rules.radius, startedAt: state.time, endsAt: state.time + rules.seconds, threatClass: incident.threatClass, affectedOwnerIds }
  state.cordons.push(cordon)
  emitEvent(state, { type: 'cordon_started', cordonId: cordon.id })
  note(state, 'log.cordon_started', { seconds: rules.seconds, threat: incident.threatClass, affected: affectedOwnerIds.length })
}

function finishExternalSupportArrival(state: State, unit: ExternalUnitState) {
  const incident = state.incident
  if (!incident) return
  const expectedStage = unit.id === 'patrol_12' ? 'police_en_route' : 'monolith_en_route'
  if (incident.stage !== expectedStage) return
  if (unit.id === 'patrol_12') {
    applyNeedleFrontEncounter(state, incident, -5, 'cell_suppressed', 'relation.needle_front.police_intervention')
    for (const squad of incidentSquads(state, incident)) squad.phase = 'cleanup'
    state.incident = undefined
    note(state, 'log.police_support_resolved')
    syncAchievements(state)
    return
  }
  const point = { x: unit.x, y: unit.y }
  applyNeedleFrontEncounter(state, incident, -10, 'heavy_force_used', 'relation.needle_front.heavy_force_used')
  createMonolithCordon(state, incident, point)
  for (const squad of incidentSquads(state, incident)) {
    releaseSquadFromMission(state, squad)
    sendHome(squad)
  }
  removeMission(state, incident.missionId)
  state.incident = undefined
  state.speed = 0
  syncAchievements(state)
}

function finishMonolithArrival(state: State) {
  const incident = state.incident
  if (!incident || incident.stage !== 'monolith_en_route' || !state.monolith.target) return
  const point = { ...state.monolith.target }
  applyNeedleFrontEncounter(state, incident, -10, 'heavy_force_used', 'relation.needle_front.heavy_force_used')
  createMonolithCordon(state, incident, point)
  for (const squad of incidentSquads(state, incident)) { releaseSquadFromMission(state, squad); sendHome(squad) }
  removeMission(state, incident.missionId)
  state.monolith = { status: 'available', x: 18, y: 18, from: { x: 18, y: 18 }, travel: 0, travelDuration: 0, nextServiceAt: state.monolith.nextServiceAt }
  state.incident = undefined
  state.speed = 0
  syncAchievements(state)
}

function updateMonolithAndCordons(state: State, elapsed: number) {
  const expired = state.cordons.filter(cordon => state.time >= cordon.endsAt)
  state.cordons = state.cordons.filter(cordon => state.time < cordon.endsAt)
  for (const cordon of expired) { note(state, 'log.cordon_ended'); emitEvent(state, { type: 'cordon_ended', cordonId: cordon.id }) }
  if (state.monolith.status !== 'en_route' || !state.monolith.target) return
  state.monolith.travel += elapsed
  const ratio = Math.min(1, state.monolith.travel / state.monolith.travelDuration)
  state.monolith.x = state.monolith.from.x + (state.monolith.target.x - state.monolith.from.x) * ratio
  state.monolith.y = state.monolith.from.y + (state.monolith.target.y - state.monolith.from.y) * ratio
  if (ratio >= 1) finishMonolithArrival(state)
}

function updateIncidentCheck(state: State) {
  const incident = state.incident
  if (!incident || incident.stage !== 'checking' || state.time < (incident.checkEndsAt ?? Infinity)) return
  const check = incident.check ?? 'observe'
  if (check === 'observe') incident.clues.push(`incident.clue.observed.${incident.threatClass}`)
  else {
    incident.intelConfirmed = true
    incident.clues.push(`incident.clue.confirmed.${incident.threatClass}`)
    revealIncidentActor(state, incident)
  }
  emitEvent(state, { type: 'incident_checked', check, confirmed: incident.intelConfirmed })
  if (check === 'contact' && incident.actualActor === 'needle_front') {
    applyNeedleFrontEncounter(state, incident, 10, 'cell_negotiated', 'relation.needle_front.cell_negotiated')
    for (const squad of incidentSquads(state, incident)) squad.phase = 'cleanup'
    state.incident = undefined
    note(state, 'log.needle_front_contact_resolved')
  } else if (check === 'contact' && incident.threatClass === 'harmless') {
    for (const squad of incidentSquads(state, incident)) squad.phase = 'cleanup'
    state.incident = undefined
    note(state, 'log.incident_contact_resolved')
  } else incident.stage = 'decision'
  state.speed = 0
}

function advanceSimulation(state: State, elapsed: number) {
  for (const mission of state.missions) {
    mission.squadIds ??= []
    mission.contributorSquadIds ??= []
  }
  state.time += elapsed
  updateIncidentCheck(state)
  updateMonolithAndCordons(state, elapsed)
  updateExternalUnits(state, elapsed)
  reconcileMissionFlow(state)
  syncCatSleep(state)
  const workingCatId = updateResearch(state, elapsed)
  syncCatSleep(state)
  updateRestAndRecovery(state, elapsed, workingCatId)
  syncCatSleep(state)
  applyAvailablePendingAssignments(state)

  for (const squad of [...state.squads]) {
    if (!state.squads.includes(squad)) continue
    if (squad.phase === 'base') {
      if (squad.autoDispatch && !squadHasPendingChanges(state, squad)) startMission(state, squad)
      continue
    }
    if (squad.phase === 'field') {
      if (squadHasPendingChanges(state, squad)) {
        sendHome(squad)
        note(state, squadHasPendingAssignment(state, squad)
          ? 'log.squad_returning_for_roster'
          : 'log.squad_returning_for_equipment', { squad: squad.name })
        continue
      }
      const origin = getSquadMapPosition(squad)
      const availableMissions = state.missions.filter(mission => mission.status === 'available')
      if (squad.autoDispatch && startMission(state, squad, undefined, origin)) continue
      if (availableMissions.length > 0
        && !availableMissions.some(mission => hasEnergyForMissionFrom(state, squad, origin, mission))) {
        sendHome(squad, true)
        note(state, 'log.squad_returning_to_rest', { squad: squad.name })
      }
      continue
    }
    if (squad.phase === 'incident') continue
    if (squad.phase === 'merging') {
      const target = state.squads.find(candidate => candidate.id === squad.mergeTargetSquadId)
      if (!target) {
        sendHome(squad)
        continue
      }
      const origin = getSquadMapPosition(squad)
      const point = calculateMergePoint(squad, target)
      const required = mergeEnergyRequired(state, squad, target, point)
      if (membersOf(state, squad).some(cat => cat.energy + 1e-9 < required)) {
        sendHome(squad)
        note(state, 'log.squad_merge_canceled', { squad: squad.name })
        continue
      }
      squad.routeFrom = origin
      squad.mergePoint = point
      squad.travel = 0
      squad.travelDuration = travelTimeBetween(origin, point)
      spendTravelEnergy(state, squad, elapsed)
      squad.travel += elapsed
      if (squad.travel >= squad.travelDuration
        || distanceBetween(getSquadMapPosition(squad), getSquadMapPosition(target)) < 0.05) {
        completeSquadMerge(state, squad, target)
      }
      continue
    }
    if (squad.phase === 'moving') {
      spendTravelEnergy(state, squad, elapsed)
      squad.travel += elapsed
      if (squad.travel >= squad.travelDuration && squad.destination) {
        const reachedStoryContact = state.storyIncident?.stage === 'dispatch'
          && state.storyIncident.dispatchedSquadId === squad.id
        const reachedWaterFilters = state.urgentOperation?.status === 'dispatch'
          && state.urgentOperation.dispatchedSquadId === squad.id
        squad.travel = 0
        squad.travelDuration = 0
        squad.routeFrom = { ...squad.destination }
        squad.route = [{ ...squad.destination }]
        delete squad.destination
        squad.phase = 'field'
        if (reachedStoryContact) reachNinthLifeContact(state, squad)
        else if (reachedWaterFilters) startWaterFiltersWork(state, squad)
        else note(state, 'log.squad_arrived_at_point', { squad: squad.name })
      }
      continue
    }
    if (squad.phase === 'support') {
      spendTravelEnergy(state, squad, elapsed)
      squad.travel += elapsed
      if (squad.travel >= squad.travelDuration && state.incident?.stage === 'support_en_route') {
        squad.travel = squad.travelDuration
        squad.phase = 'incident'
        state.incident.stage = 'support_decision'
        if (!state.incident.participantSquadIds.includes(squad.id)) state.incident.participantSquadIds.push(squad.id)
        state.speed = 0
        note(state, 'log.support_arrived', { squad: squad.name })
        emitEvent(state, { type: 'support_arrived', squadId: squad.id, missionId: state.incident.missionId })
        break
      }
      continue
    }
    if (squad.phase === 'outbound' || squad.phase === 'returning') {
      spendTravelEnergy(state, squad, elapsed)
      squad.travel += elapsed
      if (squad.travel >= squad.travelDuration) {
        if (squad.phase === 'outbound') {
          const mission = state.missions.find(candidate => candidate.id === squad.missionId)
          if (mission?.status === 'assigned' && mission.squadIds.includes(squad.id)) {
            if (mission.kind === 'police_contact') {
              reachPoliceContainer(state, squad)
              break
            }
            squad.phase = 'cleanup'
          } else {
            detachSquadMissionFields(squad)
            squad.phase = 'field'
            continue
          }
          squad.missionArrivalTime = state.time
          squad.travel = squad.travelDuration
          note(state, 'log.mission_arrived', { squad: squad.name })
        } else {
          arriveAtBase(state, squad)
        }
      }
      continue
    }

    if (squad.phase === 'urgent') {
      const operation = state.urgentOperation
      if (!operation || operation.status !== 'active' || operation.dispatchedSquadId !== squad.id) {
        squad.phase = 'field'
        continue
      }
      operation.workRemaining = Math.max(0, (operation.workRemaining ?? 0) - elapsed)
      const workDuration = operation.fullReward
        ? CONFIG.urgentOperations.waterFilters.specialistWorkDuration
        : CONFIG.urgentOperations.waterFilters.standardWorkDuration
      for (const cat of membersOf(state, squad)) {
        cat.energy = Math.max(0, cat.energy - elapsed * 5 / workDuration)
      }
      if (operation.workRemaining <= 1e-9) completeWaterFilters(state, squad)
      continue
    }

    if (squad.phase === 'cleanup') continue
  }

  updateNinthLife(state)
  updateUrgentOperation(state)
  updateStoryAftermath(state)

  for (const mission of [...state.missions]) {
    if (mission.status !== 'assigned' || state.incident?.missionId === mission.id) continue
    const participants = cleanupParticipants(state, mission.id)
    if (!participants.length) continue
    const raidIsPending = mission.kind === 'municipal' && !state.raidTriggered
      && successfulCleanups(state) >= CONFIG.raid.successfulCleanupsBeforeTrigger
    const workLimit = raidIsPending ? CONFIG.mission.raidTriggerWork : CONFIG.mission.cleanupWork
    mission.progress ??= 0
    const rate = cleanupRate(state, mission.id)
    const workDone = Math.min(Math.max(0, workLimit - mission.progress), elapsed * rate)
    const workSeconds = rate > 0 ? workDone / rate : 0
    for (const participant of participants) {
      for (const cat of membersOf(state, participant)) {
        cat.energy = Math.max(0, cat.energy - workSeconds * CONFIG.mission.energyCostPerBaseCleanup / CONFIG.mission.cleanupWork)
      }
      if (workDone > 0 && !mission.contributorSquadIds.includes(participant.id)) mission.contributorSquadIds.push(participant.id)
    }
    mission.progress += workDone
    if (raidIsPending && mission.progress >= CONFIG.mission.raidTriggerWork) {
      mission.progress = CONFIG.mission.raidTriggerWork
      startRaidIncident(state, mission)
      break
    }
    if (mission.progress >= CONFIG.mission.cleanupWork) {
      const contributors = mission.contributorSquadIds
        .map(id => state.squads.find(squad => squad.id === id))
        .filter((squad): squad is Squad => Boolean(squad))
      const assignedSquads = missionSquads(state, mission.id)
      rewardMission(state, mission, contributors)
      if (mission.kind === 'municipal') afterSuccessfulCleanup(state, mission, contributors)
      for (const assigned of assignedSquads) {
        if (assigned.phase === 'incident' || assigned.phase === 'support') continue
        continueAfterSharedMission(state, assigned)
      }
    }
  }
  updateFirstShift(state)
  maybeShowFirstShiftSummary(state)
  syncAchievements(state)
}

export function tick(state: State, seconds: number) {
  if (!state.speed || !Number.isFinite(seconds) || seconds <= 0) return

  state.simulationRemainder += seconds * state.speed
  const steps = Math.floor((state.simulationRemainder + 1e-9) / SIMULATION_STEP_SECONDS)
  state.simulationRemainder -= steps * SIMULATION_STEP_SECONDS
  if (Math.abs(state.simulationRemainder) < 1e-9) state.simulationRemainder = 0

  for (let step = 0; step < steps; step++) {
    advanceSimulation(state, SIMULATION_STEP_SECONDS)
    if (!state.speed) {
      state.simulationRemainder = 0
      break
    }
  }
}

export type BlockingOverlay = 'first_shift_container' | 'incident' | 'story' | 'final'

export function getBlockingOverlay(state: State): BlockingOverlay | undefined {
  if (state.firstShift.containerSquadId && !state.firstShift.containerDecision) return 'first_shift_container'
  if (state.incident && !['support_en_route', 'checking', 'police_en_route', 'monolith_en_route'].includes(state.incident.stage)) return 'incident'
  if (state.storyIncident?.stage === 'contact') return 'story'
  if (state.finalSummaryVisible) return 'final'
  return undefined
}

export type GameCommand =
  | { type: 'set_speed'; speed: Speed }
  | { type: 'assign_cat'; catId: string; squadId: string }
  | { type: 'create_squad' }
  | { type: 'disband_squad'; squadId: string }
  | { type: 'rename_squad'; squadId: string; name: string }
  | { type: 'equip_item'; catId: string; slot: EquipmentSlot; itemId?: ItemId }
  | { type: 'set_squad_style'; squadId: string; style: SquadStyle }
  | { type: 'set_auto_dispatch'; squadId: string; enabled: boolean }
  | { type: 'assign_squad_to_mission'; squadId: string; missionId: string }
  | { type: 'assign_squads_to_mission'; squadIds: string[]; missionId: string }
  | { type: 'deploy_cats'; catIds: string[]; order: DeployOrder }
  | { type: 'split_squad'; squadId: string; memberIds: string[] }
  | { type: 'merge_squads'; sourceSquadId: string; targetSquadId: string }
  | { type: 'move_squad'; squadId: string; x: number; y: number }
  | { type: 'move_squads'; squadIds: string[]; x: number; y: number }
  | { type: 'return_squad'; squadId: string }
  | { type: 'return_squads'; squadIds: string[] }
  | { type: 'select_research'; researchId?: ResearchId }
  | { type: 'resolve_raid'; action: 'escape' | 'attack' | 'support'; supportSquadId?: string }
  | { type: 'resolve_raid_followup'; action: 'retreat' | 'continue' }
  | { type: 'observe_incident' }
  | { type: 'recon_incident' }
  | { type: 'scan_incident' }
  | { type: 'contact_incident' }
  | { type: 'request_police_support' }
  | { type: 'request_monolith_support' }
  | { type: 'resolve_police_container'; decision: ContainerDecision }
  | { type: 'dispatch_ninth_life'; squadId: string }
  | { type: 'verify_ninth_life'; verification: NinthLifeVerification }
  | { type: 'resolve_ninth_life'; decision: NinthLifeDecision }
  | { type: 'dispatch_water_filters'; squadId: string }
  | { type: 'continue_after_finale' }

/**
 * The only owner of the live world state.  UI code must use dispatch/tick and
 * receive copies through snapshot(); it never receives this mutable object.
 */
export class GameCore {
  private world: State

  constructor(initialState: State = createState()) {
    this.world = initialState
  }

  dispatch(command: GameCommand): boolean {
    switch (command.type) {
      case 'set_speed':
        if (command.speed !== 0 && getBlockingOverlay(this.world)) return false
        this.world.speed = command.speed
        return true
      case 'assign_cat': return assignCat(this.world, command.catId, command.squadId)
      case 'create_squad': return createSquad(this.world)
      case 'disband_squad': return disbandSquad(this.world, command.squadId)
      case 'rename_squad': return renameSquad(this.world, command.squadId, command.name)
      case 'equip_item': return equipItem(this.world, command.catId, command.slot, command.itemId)
      case 'set_squad_style': return setSquadStyle(this.world, command.squadId, command.style)
      case 'set_auto_dispatch': return setSquadAutoDispatch(this.world, command.squadId, command.enabled)
      case 'assign_squad_to_mission': return assignSquadToMission(this.world, command.squadId, command.missionId)
      case 'assign_squads_to_mission': return assignSquadsToMission(this.world, command.squadIds, command.missionId)
      case 'deploy_cats': return deployCats(this.world, command.catIds, command.order)
      case 'split_squad': return splitSquad(this.world, command.squadId, command.memberIds)
      case 'merge_squads': return mergeSquads(this.world, command.sourceSquadId, command.targetSquadId)
      case 'move_squad': return moveSquadToPoint(this.world, command.squadId, { x: command.x, y: command.y })
      case 'move_squads': return moveSquadsToPoint(this.world, command.squadIds, { x: command.x, y: command.y })
      case 'return_squad': return returnSquadToBase(this.world, command.squadId)
      case 'return_squads': return returnSquadsToBase(this.world, command.squadIds)
      case 'select_research': return selectResearch(this.world, command.researchId)
      case 'resolve_raid': return resolveRaidDecision(this.world, command.action, command.supportSquadId)
      case 'resolve_raid_followup': return resolveRaidFollowup(this.world, command.action)
      case 'observe_incident': return checkIncident(this.world, 'observe')
      case 'recon_incident': return checkIncident(this.world, 'recon')
      case 'scan_incident': return checkIncident(this.world, 'scan')
      case 'contact_incident': return checkIncident(this.world, 'contact')
      case 'request_police_support': return requestPoliceSupport(this.world)
      case 'request_monolith_support': return requestMonolithSupport(this.world)
      case 'resolve_police_container': return resolvePoliceContainer(this.world, command.decision)
      case 'dispatch_ninth_life': return dispatchNinthLife(this.world, command.squadId)
      case 'verify_ninth_life': return verifyNinthLife(this.world, command.verification)
      case 'resolve_ninth_life': return resolveNinthLife(this.world, command.decision)
      case 'dispatch_water_filters': return dispatchWaterFilters(this.world, command.squadId)
      case 'continue_after_finale': return continueAfterFinale(this.world)
    }
  }

  tick(seconds: number) {
    tick(this.world, seconds)
  }

  drainEvents() {
    return drainEvents(this.world)
  }

  snapshot(): State {
    return structuredClone(this.world)
  }

  replaceState(nextState: State) {
    this.world = structuredClone(nextState)
  }

  serialize(pretty = true) {
    return serializeState(this.world, pretty)
  }
}
