import { SIMULATION_CONFIG as CONFIG } from './config.ts'

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
}
export type MapPoint = { x: number; y: number }
export type DeployOrder = { type: 'mission'; missionId: string } | { type: 'move'; x: number; y: number }
export type Phase = 'base' | 'field' | 'moving' | 'outbound' | 'cleanup' | 'incident' | 'support' | 'returning' | 'merging'
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
  restAfterReturn: boolean
  missionId?: string
  target?: Pick<Mission, 'id' | 'title' | 'x' | 'y' | 'priority'>
  destination?: MapPoint
  mergeTargetSquadId?: string
  mergePoint?: MapPoint
  missionArrivalTime?: number
}
export type RaidStage = 'decision' | 'support_en_route' | 'support_decision'
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
}
export type NinthLifeDecision = 'shelter' | 'interrogate' | 'escort' | 'exploit'
export type StoryIncident = {
  kind: 'ninth_life'
  participantSquadIds: string[]
  x: number
  y: number
}
export type StoryResolution = {
  decision: NinthLifeDecision
  title: string
  fameDelta: number
  threatDelta: number
  branch: string
  outcome: string
  unlockedLocation: boolean
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
  | { type: 'story_resolved'; story: 'ninth_life'; decision: NinthLifeDecision }
  | { type: 'final_summary_available' }
  | { type: 'squad_split'; squadId: string; newSquadId: string; memberIds: string[] }
  | { type: 'squad_merge_started'; sourceSquadId: string; targetSquadId: string }
  | { type: 'squad_merged'; sourceSquadId: string; targetSquadId: string }
  | { type: 'mission_squad_assigned'; squadId: string; missionId: string }
export type State = {
  fame: number
  scrap: number
  threat: number
  speed: Speed
  time: number
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
export const SAVE_VERSION = 13
export const GAME_VERSION = '0.1.0'
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
  status: 'available',
  progress: 0,
  interruptionPolicy: 'preserve_progress',
  squadIds: [],
  contributorSquadIds: [],
}))
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
    threat: CONFIG.initial.threat,
    speed: 0,
    time: 0,
    cats: CONFIG.cats.map(cat => ({ ...cat, sleeping: false, injuredRemaining: 0, equipment: emptyEquipment(), pendingEquipment: {} })),
    squadSerial: 0,
    disbandedSquadCleanups: 0,
    completedMissionCount: 0,
    missions: structuredClone(templates.slice(0, CONFIG.mission.initialAvailableCount)),
    missionSerial: 0,
    rngSeed: CONFIG.initial.rngSeed,
    raidTriggered: false,
    storyTriggered: false,
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
  return ACHIEVEMENT_DEFINITIONS.map(achievement => ({
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
    || !['base', 'field', 'moving', 'outbound', 'cleanup', 'incident', 'support', 'returning', 'merging'].includes(value.phase as string)) return false
  if (typeof value.autoDispatch !== 'boolean') return false
  if (!isValidMapPoint(value.routeFrom) || typeof value.restAfterReturn !== 'boolean') return false
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
    && isFiniteNumber(value.progress)
    && ['preserve_progress', 'reset', 'fail', 'remove', 'scripted'].includes(value.interruptionPolicy as string)
    && ['available', 'assigned', 'completed'].includes(value.status as string)
    && Array.isArray(value.squadIds) && value.squadIds.every(id => typeof id === 'string')
    && Array.isArray(value.contributorSquadIds) && value.contributorSquadIds.every(id => typeof id === 'string')
}

function isValidIncident(value: unknown) {
  if (!isRecord(value)) return false
  const rolls = ['supportChance', 'attackChance', 'supportRoll', 'attackRoll', 'injuryRoll', 'injuredMemberRoll']
  return value.kind === 'raiders' && ['decision', 'support_en_route', 'support_decision'].includes(value.stage as string)
    && typeof value.missionId === 'string'
    && (value.supportSquadId === undefined || typeof value.supportSquadId === 'string')
    && Array.isArray(value.participantSquadIds) && value.participantSquadIds.every(id => typeof id === 'string')
    && rolls.every(field => isFiniteNumber(value[field]))
}

function isValidStoryIncident(value: unknown) {
  return isRecord(value) && value.kind === 'ninth_life'
    && Array.isArray(value.participantSquadIds) && value.participantSquadIds.every(id => typeof id === 'string')
    && isFiniteNumber(value.x) && isFiniteNumber(value.y)
}

function isValidStoryResolution(value: unknown) {
  return isRecord(value) && ['shelter', 'interrogate', 'escort', 'exploit'].includes(value.decision as string)
    && typeof value.title === 'string' && isFiniteNumber(value.fameDelta) && isFiniteNumber(value.threatDelta)
    && typeof value.branch === 'string' && typeof value.outcome === 'string' && typeof value.unlockedLocation === 'boolean'
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
  }
  if (isRecord(migrated.storyIncident)) {
    migrated.storyIncident.participantSquadIds = Array.isArray(migrated.storyIncident.participantSquadIds)
      ? migrated.storyIncident.participantSquadIds
      : typeof migrated.storyIncident.foundBySquadId === 'string' ? [migrated.storyIncident.foundBySquadId] : []
    delete migrated.storyIncident.foundBySquadId
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
  return migrated
}

function isValidState(value: unknown): value is State {
  if (!isRecord(value)) return false
  if (![0, 1, 5, 10].includes(value.speed as number)) return false
  if (![value.fame, value.scrap, value.threat, value.time, value.squadSerial, value.disbandedSquadCleanups, value.completedMissionCount, value.missionSerial, value.rngSeed].every(isFiniteNumber)) return false
  if (![value.raidTriggered, value.storyTriggered, value.finalSummaryVisible, value.finalSummarySeen].every(flag => typeof flag === 'boolean')) return false
  if (!Array.isArray(value.cats) || !value.cats.every(isValidCat)) return false
  if (!Array.isArray(value.squads) || !value.squads.every(isValidSquad)) return false
  if (!Array.isArray(value.missions) || !value.missions.every(isValidMission)) return false
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
  return true
}

export function serializeState(state: State, pretty = true) {
  // Vite HMR can preserve a pre-migration in-memory state while replacing this module.
  // Normalize it before autosaving so an already open tab does not write an invalid current save.
  state.cats.forEach(cat => { cat.pendingEquipment ??= {} })
  state.squadSerial ??= Math.max(2, state.squads.length)
  state.disbandedSquadCleanups ??= 0
  state.completedMissionCount ??= state.disbandedSquadCleanups + state.squads.reduce((total, squad) => total + squad.completed, 0)
  state.missions.forEach(mission => {
    const legacyMission = mission as Mission & { squadId?: string }
    mission.progress ??= 0
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
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, SAVE_VERSION].includes(envelope.version as number)) {
    throw new SaveError('save.error.unsupported_version', { version: String(envelope.version) })
  }
  if (typeof envelope.savedAt !== 'string') throw new SaveError('save.error.invalid_date')
  const legacyCandidate = envelope.version === 1 ? migrateV1State(envelope.state) : envelope.state
  const candidate = migrateLegacyState(legacyCandidate, envelope.version !== SAVE_VERSION)
  if (!isValidState(candidate)) throw new SaveError('save.error.corrupted')

  const restored = structuredClone(candidate)
  if (envelope.version !== SAVE_VERSION && restored.incident?.stage === 'support_en_route' && restored.speed === 0) {
    restored.speed = 1
  }
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

/** Current-format saves plus the immediately preceding compatible schema. */
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
  if (![10, 11, 12, SAVE_VERSION].includes(envelope.version as number)) {
    throw new SaveError('save.error.unsupported_version', { version: String(envelope.version) })
  }
  return deserializeState(payload)
}

export function successfulCleanups(state: State) {
  return state.completedMissionCount
}

function catIsAtBase(state: State, cat: Cat) {
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
    ? cat.energy >= CONFIG.sleep.wakeForOrderEnergy
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

function squadNameForSerial(serial: number) {
  return SQUAD_CALLSIGN_KEYS[serial - 1] ?? `squad.generated.${String(serial).padStart(2, '0')}`
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
    name: squadNameForSerial(serial),
    members: [],
    style: 'balanced',
    autoDispatch: true,
    phase: 'base',
    travel: 0,
    travelDuration: 0,
    completed: 0,
    routeFrom: { ...CONFIG.map.base },
    restAfterReturn: false,
  }
  state.squadSerial = serial
  state.squads.push(squad)
  note(state, 'log.squad_created', { squad: squad.name })
  return true
}

function createPersistentSquad(state: State, memberIds: string[]) {
  const serial = Math.max(0, state.squadSerial) + 1
  const squad: Squad = {
    id: `squad-${serial}`,
    name: squadNameForSerial(serial),
    members: [...memberIds],
    style: 'balanced',
    autoDispatch: false,
    phase: 'base',
    travel: 0,
    travelDuration: 0,
    completed: 0,
    routeFrom: { ...CONFIG.map.base },
    restAfterReturn: false,
  }
  state.squadSerial = serial
  state.squads.push(squad)
  for (const cat of state.cats) if (memberIds.includes(cat.id)) cat.assignedTo = squad.id
  note(state, 'log.squad_created', { squad: squad.name })
  syncAchievements(state)
  return squad
}

function removeEmptyBaseSquads(state: State, protectedSquadId?: string) {
  for (const squad of [...state.squads]) {
    if (squad.id === protectedSquadId || squad.phase !== 'base' || squad.members.length) continue
    state.disbandedSquadCleanups += squad.completed
    state.squads.splice(state.squads.indexOf(squad), 1)
    note(state, 'log.squad_disbanded', { squad: squad.name })
  }
}

export function getDeployCatsBlockReason(state: State, catIds: string[], order: DeployOrder) {
  const ids = [...new Set(catIds)]
  const cats = ids.map(id => state.cats.find(cat => cat.id === id)).filter((cat): cat is Cat => Boolean(cat))
  if (!ids.length || cats.length !== ids.length || cats.some(cat => !catIsAtBase(state, cat))) return 'dispatch.reason.away'
  if (cats.some(cat => cat.injuredRemaining > 0)) return 'dispatch.reason.injured'
  if (cats.some(cat => !canReceiveWorkOrder(cat))) return 'dispatch.reason.tired'
  const exactSquad = state.squads.find(squad => squad.phase === 'base' && squad.members.length === ids.length
    && squad.members.every(id => ids.includes(id)))
  const virtual: Squad = exactSquad ?? {
    id: '__deployment__', name: 'squad.alpha', members: ids, style: 'balanced', autoDispatch: false,
    phase: 'base', travel: 0, travelDuration: 0, completed: 0, routeFrom: { ...CONFIG.map.base }, restAfterReturn: false,
  }
  if (order.type === 'mission') {
    const mission = state.missions.find(candidate => candidate.id === order.missionId)
    if (!mission || mission.status === 'completed' || state.incident?.missionId === mission.id) return 'dispatch.reason.unavailable'
    if (!hasEnergyForMissionFrom(state, virtual, CONFIG.map.base, mission)) return 'dispatch.reason.tired'
    return undefined
  }
  return getMoveSquadBlockReason({ ...state, squads: exactSquad ? state.squads : [...state.squads, virtual] }, virtual.id, { x: order.x, y: order.y })
}

export function deployCats(state: State, catIds: string[], order: DeployOrder) {
  const ids = [...new Set(catIds)]
  if (getDeployCatsBlockReason(state, ids, order)) return false
  let squad = state.squads.find(candidate => candidate.phase === 'base' && candidate.members.length === ids.length
    && candidate.members.every(id => ids.includes(id)))
  if (!squad) {
    for (const cat of state.cats) {
      if (!ids.includes(cat.id)) continue
      const previous = state.squads.find(candidate => candidate.id === cat.assignedTo)
      if (previous) previous.members = previous.members.filter(id => id !== cat.id)
      cat.assignedTo = undefined
      delete cat.pendingAssignment
    }
    squad = createPersistentSquad(state, ids)
    removeEmptyBaseSquads(state, squad.id)
  }
  return order.type === 'mission'
    ? assignSquadToMission(state, squad.id, order.missionId)
    : moveSquadToPoint(state, squad.id, { x: order.x, y: order.y })
}

export function getDisbandSquadBlockReason(state: State, squadId: string) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad) return 'squad.manage.reason.missing'
  if (squad.members.length || state.cats.some(cat => cat.assignedTo === squadId)) return 'squad.manage.reason.members'
  if (squad.phase !== 'base' || squad.missionId || squad.target || squad.destination
    || state.missions.some(mission => mission.squadIds.includes(squadId))) return 'squad.manage.reason.away'
  if (state.cats.some(cat => cat.pendingAssignment === squadId)) return 'squad.manage.reason.pending'
  if (state.incident?.supportSquadId === squadId || state.incident?.participantSquadIds.includes(squadId)
    || state.storyIncident?.participantSquadIds.includes(squadId)) return 'squad.manage.reason.incident'
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
  if (!squad || squad.phase !== 'base' || squad.style === style) return false
  squad.style = style
  note(state, 'log.squad_style', { squad: squad.name, style })
  return true
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

function travelTimeBetween(origin: MapPoint, target: Pick<Mission, 'x' | 'y'>) {
  return Math.max(CONFIG.mission.minimumTravelTime, distanceBetween(origin, target) / CONFIG.mission.mapSpeed)
}

function missionEnergyCostFrom(state: State, squad: Squad, origin: MapPoint, mission: Mission) {
  const travelToMission = travelTimeBetween(origin, mission)
  const estimate = getSquadCleanupEstimate(state, squad)
  const remainingRatio = Math.max(0, CONFIG.mission.cleanupWork - (mission.progress ?? 0)) / CONFIG.mission.cleanupWork
  const cleanup = estimate.energyPerCat * remainingRatio
  const travelHome = travelTimeBetween(mission, CONFIG.map.base)
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
  if (getSplitSquadBlockReason(state, squadId, memberIds)) return false
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
    restAfterReturn: false,
  }
  squad.members = squad.members.filter(id => !selected.includes(id))
  for (const cat of membersOf(state, newSquad)) cat.assignedTo = newSquad.id
  state.squadSerial = serial
  state.squads.push(newSquad)
  note(state, 'log.squad_split', { squad: squad.name, created: newSquad.name })
  emitEvent(state, { type: 'squad_split', squadId, newSquadId: newSquad.id, memberIds: selected })
  return true
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
  if (getMergeSquadsBlockReason(state, sourceSquadId, targetSquadId)) return false
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
}

function startMission(state: State, squad: Squad, requestedMissionId?: string, origin: MapPoint = CONFIG.map.base) {
  const assignableMissions = state.missions
    .filter(candidate => candidate.status !== 'completed'
      && (!requestedMissionId ? candidate.status === 'available' : candidate.id === requestedMissionId)
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
  squad.routeFrom = { ...origin }
  squad.restAfterReturn = false
  squad.travel = 0
  squad.travelDuration = travelTimeBetween(origin, mission)
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

function isMapCommandPoint(point: MapPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 5 && point.x <= 95 && point.y >= 7 && point.y <= 93
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
  const origin = squad.phase === 'field' ? getSquadMapPosition(squad) : CONFIG.map.base
  const energyCost = (travelTimeBetween(origin, destination) + travelTimeBetween(destination, CONFIG.map.base))
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
  squad.routeFrom = { ...origin }
  squad.destination = { ...destination }
  squad.target = undefined
  squad.missionId = undefined
  squad.restAfterReturn = false
  squad.travel = 0
  squad.travelDuration = travelTimeBetween(origin, destination)
  note(state, 'log.squad_moving', { squad: squad.name })
  return true
}

function rewardMission(state: State, mission: Mission, contributors: Squad[]) {
  mission.status = 'completed'
  mission.progress = CONFIG.mission.cleanupWork
  for (const squad of contributors) squad.completed++
  state.completedMissionCount++
  state.scrap += CONFIG.mission.rewardScrap
  state.fame = Math.min(CONFIG.limits.fame, state.fame + CONFIG.mission.rewardFame)
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
  if (!state.storyResolution || state.fame < CONFIG.goal.fame || state.finalSummarySeen || state.finalSummaryVisible) return
  state.speed = 0
  state.finalSummaryVisible = true
  note(state, 'log.goal_reached')
  emitEvent(state, { type: 'final_summary_available' })
}

function startNinthLife(state: State, mission: Mission, participants: Squad[]) {
  if (state.storyTriggered || successfulCleanups(state) < CONFIG.story.successfulCleanupsBeforeTrigger) return
  state.storyTriggered = true
  state.speed = 0
  state.storyIncident = {
    kind: 'ninth_life',
    participantSquadIds: participants.map(squad => squad.id),
    x: mission.x,
    y: mission.y,
  }
  note(state, 'log.story_found', { squad: participants.map(squad => getSquadDisplayName(squad)).join(', ') })
  emitEvent(state, { type: 'story_started', story: 'ninth_life', squadIds: participants.map(squad => squad.id) })
}

function afterSuccessfulCleanup(state: State, mission: Mission, participants: Squad[]) {
  startNinthLife(state, mission, participants)
  maybeShowFinalSummary(state)
}

const STORY_OUTCOMES: Record<NinthLifeDecision, Omit<StoryResolution, 'decision' | 'fameDelta' | 'threatDelta'>> = {
  shelter: {
    title: 'story.shelter.title',
    branch: 'story.shelter.branch',
    outcome: 'story.shelter.outcome',
    unlockedLocation: false,
  },
  interrogate: {
    title: 'story.interrogate.title',
    branch: 'story.interrogate.branch',
    outcome: 'story.interrogate.outcome',
    unlockedLocation: false,
  },
  escort: {
    title: 'story.escort.title',
    branch: 'story.escort.branch',
    outcome: 'story.escort.outcome',
    unlockedLocation: false,
  },
  exploit: {
    title: 'story.exploit.title',
    branch: 'story.exploit.branch',
    outcome: 'story.exploit.outcome',
    unlockedLocation: true,
  },
}

export function resolveNinthLife(state: State, decision: NinthLifeDecision) {
  if (!state.storyIncident || state.storyResolution) return false
  const balance = CONFIG.story.decisions[decision]
  const outcome = STORY_OUTCOMES[decision]
  state.fame = Math.min(CONFIG.limits.fame, state.fame + balance.fame)
  state.threat = Math.min(CONFIG.limits.threat, state.threat + balance.threat)
  state.storyResolution = {
    decision,
    title: outcome.title,
    fameDelta: balance.fame,
    threatDelta: balance.threat,
    branch: outcome.branch,
    outcome: outcome.outcome,
    unlockedLocation: outcome.unlockedLocation,
  }
  state.storyIncident = undefined
  note(state, balance.threat ? 'log.story_closed_threat' : 'log.story_closed', { decision: outcome.title, fame: balance.fame, threat: balance.threat })
  emitEvent(state, { type: 'story_resolved', story: 'ninth_life', decision })
  if (state.fame < CONFIG.goal.fame) note(state, 'log.fame_needed', { fame: CONFIG.goal.fame - state.fame })
  maybeShowFinalSummary(state)
  syncAchievements(state)
  return true
}

export function continueAfterFinale(state: State) {
  if (!state.finalSummaryVisible) return false
  state.finalSummaryVisible = false
  state.finalSummarySeen = true
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
    const clear = state.missions.every(mission => Math.hypot(mission.x - x, mission.y - y) > generation.minimumSeparation)
    if (clear) return { id: `cleanup-${serial}`, title: label, x, y, priority, status: 'available', progress: 0, interruptionPolicy: 'preserve_progress', squadIds: [], contributorSquadIds: [] }
  }
  const serial = ++state.missionSerial
  const fallbackCandidates: MapPoint[] = [{ ...generation.fallback }]
  for (let y = generation.y.minimum; y <= generation.y.minimum + generation.y.range; y += generation.minimumSeparation) {
    for (let x = generation.x.minimum; x <= generation.x.minimum + generation.x.range; x += generation.minimumSeparation) {
      fallbackCandidates.push({ x, y })
    }
  }
  const fallback = fallbackCandidates.reduce((best, candidate) => {
    const separation = Math.min(...state.missions.map(mission => Math.hypot(mission.x - candidate.x, mission.y - candidate.y)), Number.POSITIVE_INFINITY)
    const bestSeparation = Math.min(...state.missions.map(mission => Math.hypot(mission.x - best.x, mission.y - best.y)), Number.POSITIVE_INFINITY)
    return separation > bestSeparation ? candidate : best
  })
  return { id: `cleanup-${serial}`, title: label, ...fallback, priority, status: 'available', progress: 0, interruptionPolicy: 'preserve_progress', squadIds: [], contributorSquadIds: [] }
}

function desiredMissionCount(time: number) {
  const index = Math.floor(time / CONFIG.mission.flowInterval) % CONFIG.mission.flowCycle.length
  return CONFIG.mission.flowCycle[index]
}

function reconcileMissionFlow(state: State) {
  const desired = desiredMissionCount(state.time)
  while (state.missions.length < desired) state.missions.push(spawnMission(state))
  while (state.missions.length > desired) {
    const mission = state.missions.find(candidate => candidate.status === 'available' && (candidate.progress ?? 0) <= 0)
    if (!mission) break
    state.missions.splice(state.missions.indexOf(mission), 1)
  }
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
  }
  note(state, 'log.raid_started', { squad: participants.map(squad => getSquadDisplayName(squad)).join(', ') })
  emitEvent(state, { type: 'incident_started', incident: 'raiders', squadIds: participantIds, missionId: mission.id })
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

export function getSquadMapPosition(squad: Squad): MapPoint {
  if (squad.phase === 'base') return { ...CONFIG.map.base }
  if (squad.phase === 'returning') {
    const ratio = Math.min(1, squad.travel / Math.max(squad.travelDuration, 1e-9))
    return {
      x: squad.routeFrom.x + (CONFIG.map.base.x - squad.routeFrom.x) * ratio,
      y: squad.routeFrom.y + (CONFIG.map.base.y - squad.routeFrom.y) * ratio,
    }
  }
  if (squad.phase === 'moving' && squad.destination) {
    const ratio = Math.min(1, squad.travel / Math.max(squad.travelDuration, 1e-9))
    return {
      x: squad.routeFrom.x + (squad.destination.x - squad.routeFrom.x) * ratio,
      y: squad.routeFrom.y + (squad.destination.y - squad.routeFrom.y) * ratio,
    }
  }
  if (squad.phase === 'merging' && squad.mergePoint) {
    const ratio = Math.min(1, squad.travel / Math.max(squad.travelDuration, 1e-9))
    return {
      x: squad.routeFrom.x + (squad.mergePoint.x - squad.routeFrom.x) * ratio,
      y: squad.routeFrom.y + (squad.mergePoint.y - squad.routeFrom.y) * ratio,
    }
  }
  if (!squad.target) return { ...squad.routeFrom }
  if (!['outbound', 'support'].includes(squad.phase)) return { x: squad.target.x, y: squad.target.y }
  const destination = squad.target
  const ratio = Math.min(1, squad.travel / Math.max(squad.travelDuration, 1e-9))
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

function sendHome(squad: Squad, restAfterReturn = false) {
  const origin = getSquadMapPosition(squad)
  squad.phase = 'returning'
  delete squad.destination
  squad.routeFrom = origin
  squad.restAfterReturn = restAfterReturn
  squad.travel = 0
  squad.travelDuration = travelTimeBetween(origin, CONFIG.map.base)
  delete squad.destination
  delete squad.mergeTargetSquadId
  delete squad.mergePoint
  delete squad.missionArrivalTime
}

export function returnSquadToBase(state: State, squadId: string) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad || squad.phase === 'base' || squad.phase === 'incident' || squad.phase === 'support'
    || state.incident?.participantSquadIds.includes(squad.id)) return false
  releaseSquadFromMission(state, squad)
  sendHome(squad)
  note(state, 'log.squad_ordered_home', { squad: squad.name })
  return true
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

export function tick(state: State, seconds: number) {
  if (!state.speed) return
  for (const mission of state.missions) {
    mission.squadIds ??= []
    mission.contributorSquadIds ??= []
  }
  const elapsed = seconds * state.speed
  state.time += elapsed
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
        squad.travel = 0
        squad.travelDuration = 0
        squad.routeFrom = { ...squad.destination }
        delete squad.destination
        squad.phase = 'field'
        note(state, 'log.squad_arrived_at_point', { squad: squad.name })
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

    if (squad.phase === 'cleanup') continue
  }

  for (const mission of [...state.missions]) {
    if (mission.status !== 'assigned' || state.incident?.missionId === mission.id) continue
    const participants = cleanupParticipants(state, mission.id)
    if (!participants.length) continue
    const raidIsPending = !state.raidTriggered
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
      afterSuccessfulCleanup(state, mission, contributors)
      for (const assigned of assignedSquads) {
        if (assigned.phase === 'incident' || assigned.phase === 'support') continue
        continueAfterSharedMission(state, assigned)
      }
    }
  }
  syncAchievements(state)
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
  | { type: 'deploy_cats'; catIds: string[]; order: DeployOrder }
  | { type: 'split_squad'; squadId: string; memberIds: string[] }
  | { type: 'merge_squads'; sourceSquadId: string; targetSquadId: string }
  | { type: 'move_squad'; squadId: string; x: number; y: number }
  | { type: 'return_squad'; squadId: string }
  | { type: 'select_research'; researchId?: ResearchId }
  | { type: 'resolve_raid'; action: 'escape' | 'attack' | 'support'; supportSquadId?: string }
  | { type: 'resolve_raid_followup'; action: 'retreat' | 'continue' }
  | { type: 'resolve_ninth_life'; decision: NinthLifeDecision }
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
        if (command.speed !== 0 && (
          this.world.storyIncident
          || this.world.finalSummaryVisible
          || (this.world.incident && this.world.incident.stage !== 'support_en_route')
        )) return false
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
      case 'deploy_cats': return deployCats(this.world, command.catIds, command.order)
      case 'split_squad': return splitSquad(this.world, command.squadId, command.memberIds)
      case 'merge_squads': return mergeSquads(this.world, command.sourceSquadId, command.targetSquadId)
      case 'move_squad': return moveSquadToPoint(this.world, command.squadId, { x: command.x, y: command.y })
      case 'return_squad': return returnSquadToBase(this.world, command.squadId)
      case 'select_research': return selectResearch(this.world, command.researchId)
      case 'resolve_raid': return resolveRaidDecision(this.world, command.action, command.supportSquadId)
      case 'resolve_raid_followup': return resolveRaidFollowup(this.world, command.action)
      case 'resolve_ninth_life': return resolveNinthLife(this.world, command.decision)
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
