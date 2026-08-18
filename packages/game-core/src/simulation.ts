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
  injuredRemaining: number
  equipment: Equipment
  pendingEquipment: PendingEquipment
}
export type Mission = { id: string; title: string; x: number; y: number; priority: number; status: 'available' | 'assigned' | 'completed'; squadId?: string }
export type MapPoint = { x: number; y: number }
export type Phase = 'base' | 'field' | 'outbound' | 'cleanup' | 'assisting' | 'incident' | 'support' | 'returning'
export type Squad = {
  id: string
  name: string
  members: string[]
  style: SquadStyle
  autoDispatch: boolean
  phase: Phase
  travel: number
  travelDuration: number
  progress: number
  completed: number
  routeFrom: MapPoint
  restAfterReturn: boolean
  missionId?: string
  target?: Pick<Mission, 'id' | 'title' | 'x' | 'y' | 'priority'>
}
export type RaidStage = 'decision' | 'support_en_route' | 'support_decision'
export type RaidIncident = {
  kind: 'raiders'
  stage: RaidStage
  primarySquadId: string
  missionId: string
  supportSquadId?: string
  supportChance: number
  attackChance: number
  supportRoll: number
  attackRoll: number
  injuryRoll: number
  injuredMemberRoll: number
}
export type NinthLifeDecision = 'shelter' | 'interrogate' | 'escort' | 'exploit'
export type StoryIncident = {
  kind: 'ninth_life'
  foundBySquadId: string
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
  | { type: 'mission_completed'; squadId: string; missionId: string }
  | { type: 'mission_failed'; squadId: string; missionId?: string; reason: 'escape' | 'attack' | 'support' | 'recalled' | 'retreat' }
  | { type: 'incident_started'; incident: 'raiders'; squadId: string; missionId: string }
  | { type: 'support_requested'; squadId: string; primarySquadId: string; seconds: number }
  | { type: 'support_arrived'; squadId: string; primarySquadId: string }
  | { type: 'cat_injured'; catId: string; seconds: number }
  | { type: 'research_started'; researchId: ResearchId }
  | { type: 'research_completed'; researchId: ResearchId }
  | { type: 'achievement_unlocked'; achievementId: AchievementId }
  | { type: 'story_started'; story: 'ninth_life'; squadId: string }
  | { type: 'story_resolved'; story: 'ninth_life'; decision: NinthLifeDecision }
  | { type: 'final_summary_available' }
export type State = {
  fame: number
  scrap: number
  threat: number
  speed: Speed
  time: number
  cats: Cat[]
  squads: Squad[]
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
export type RaidOption = { available: boolean; chance?: number; reason?: string; supportSquadName?: string }
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
export const SAVE_VERSION = 9
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

const templates: Mission[] = CONFIG.mission.templates.map(template => ({ ...template, status: 'available' }))
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
    squads: [
      { id: 'alpha', name: 'squad.alpha', members: [], style: 'balanced', autoDispatch: true, phase: 'base', travel: 0, travelDuration: 0, progress: 0, completed: 0, routeFrom: { ...CONFIG.map.base }, restAfterReturn: false },
      { id: 'bravo', name: 'squad.bravo', members: [], style: 'careful', autoDispatch: true, phase: 'base', travel: 0, travelDuration: 0, progress: 0, completed: 0, routeFrom: { ...CONFIG.map.base }, restAfterReturn: false },
    ],
    log: [{ time: 0, key: 'log.base_ready' }],
  }
}

function note(state: State, key: string, params?: Record<string, string | number>) {
  state.log = [{ time: state.time, key, params }, ...state.log].slice(0, CONFIG.mission.eventLogLimit)
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
  if (!Array.isArray(value.members) || !value.members.every(member => typeof member === 'string')) return false
  if (!['careful', 'balanced', 'risky'].includes(value.style as string)
    || !['base', 'field', 'outbound', 'cleanup', 'assisting', 'incident', 'support', 'returning'].includes(value.phase as string)) return false
  if (typeof value.autoDispatch !== 'boolean') return false
  if (!isValidMapPoint(value.routeFrom) || typeof value.restAfterReturn !== 'boolean') return false
  if (![value.travel, value.travelDuration, value.progress, value.completed].every(isFiniteNumber)) return false
  return (value.missionId === undefined || typeof value.missionId === 'string')
    && (value.target === undefined || isValidTarget(value.target))
}

function isValidMission(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string'
    && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.priority)
    && ['available', 'assigned', 'completed'].includes(value.status as string)
    && (value.squadId === undefined || typeof value.squadId === 'string')
}

function isValidIncident(value: unknown) {
  if (!isRecord(value)) return false
  const rolls = ['supportChance', 'attackChance', 'supportRoll', 'attackRoll', 'injuryRoll', 'injuredMemberRoll']
  return value.kind === 'raiders' && ['decision', 'support_en_route', 'support_decision'].includes(value.stage as string)
    && typeof value.primarySquadId === 'string' && typeof value.missionId === 'string'
    && (value.supportSquadId === undefined || typeof value.supportSquadId === 'string')
    && rolls.every(field => isFiniteNumber(value[field]))
}

function isValidStoryIncident(value: unknown) {
  return isRecord(value) && value.kind === 'ninth_life' && typeof value.foundBySquadId === 'string'
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

function migrateLegacyState(value: unknown) {
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
      if (typeof squad.autoDispatch !== 'boolean') squad.autoDispatch = true
      if (!isValidMapPoint(squad.routeFrom)) {
        const legacyTarget = squad.target
        squad.routeFrom = squad.phase === 'returning' && isValidTarget(legacyTarget)
          ? { x: legacyTarget.x, y: legacyTarget.y }
          : { ...CONFIG.map.base }
      }
      if (typeof squad.restAfterReturn !== 'boolean') squad.restAfterReturn = false
    }
  }
  return migrated
}

function isValidState(value: unknown): value is State {
  if (!isRecord(value)) return false
  if (![0, 1, 5, 10].includes(value.speed as number)) return false
  if (![value.fame, value.scrap, value.threat, value.time, value.missionSerial, value.rngSeed].every(isFiniteNumber)) return false
  if (![value.raidTriggered, value.storyTriggered, value.finalSummaryVisible, value.finalSummarySeen].every(flag => typeof flag === 'boolean')) return false
  if (!Array.isArray(value.cats) || !value.cats.every(isValidCat)) return false
  if (!Array.isArray(value.squads) || !value.squads.every(isValidSquad)) return false
  if (!Array.isArray(value.missions) || !value.missions.every(isValidMission)) return false
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
  // Normalize it before autosaving so an already open tab does not write an invalid v9 save.
  state.cats.forEach(cat => { cat.pendingEquipment ??= {} })
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
  if (![1, 2, 3, 4, 5, 6, 7, 8, SAVE_VERSION].includes(envelope.version as number)) {
    throw new SaveError('save.error.unsupported_version', { version: String(envelope.version) })
  }
  if (typeof envelope.savedAt !== 'string') throw new SaveError('save.error.invalid_date')
  const legacyCandidate = envelope.version === 1 ? migrateV1State(envelope.state) : envelope.state
  const candidate = migrateLegacyState(legacyCandidate)
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

/** Current-format saves only. Legacy migrations remain available to old
 * low-level tests/tools, but the application must never load or import them. */
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
  return state.squads.reduce((total, squad) => total + squad.completed, 0)
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
  const cat = state.cats.find(candidate => candidate.id === catId)
  if (!cat?.assignedTo) return true
  return state.squads.find(squad => squad.id === cat.assignedTo)?.phase === 'base'
}

export function assignCat(state: State, catId: string, squadId: string) {
  const cat = state.cats.find(candidate => candidate.id === catId)
  if (!cat || !canEditCat(state, catId)) return false
  const currentSquad = state.squads.find(squad => squad.id === cat.assignedTo)
  const targetSquad = squadId ? state.squads.find(squad => squad.id === squadId) : undefined
  if (squadId && (!targetSquad || targetSquad.phase !== 'base')) return false
  if (currentSquad?.id === targetSquad?.id || (!currentSquad && !targetSquad)) return false
  if (targetSquad) {
    if (cat.energy <= CONFIG.sleep.sleepAtEnergy) putCatToSleep(state, cat)
    if (!wakeForWorkOrder(state, cat)) return false
  }

  if (currentSquad) currentSquad.members = currentSquad.members.filter(id => id !== catId)
  if (targetSquad) {
    targetSquad.members.push(catId)
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
  const cleanup = getSquadCleanupEstimate(state, squad).energyPerCat
  const travelHome = travelTimeBetween(mission, CONFIG.map.base)
  return (travelToMission + travelHome) * CONFIG.mission.energyCostPerTravelSecond + cleanup
}

function hasEnergyForMissionFrom(state: State, squad: Squad, origin: MapPoint, mission: Mission) {
  const requiredEnergy = missionEnergyCostFrom(state, squad, origin, mission)
  return membersOf(state, squad).every(cat => cat.energy + 1e-9 >= requiredEnergy)
}

function startMission(state: State, squad: Squad, requestedMissionId?: string, origin: MapPoint = CONFIG.map.base) {
  const availableMissions = state.missions
    .filter(candidate => candidate.status === 'available' && hasEnergyForMissionFrom(state, squad, origin, candidate))
  const mission = requestedMissionId
    ? availableMissions.find(candidate => candidate.id === requestedMissionId)
    : availableMissions.sort((a, b) => b.priority - a.priority || distanceBetween(origin, a) - distanceBetween(origin, b))[0]
  if (!mission) return false
  const members = membersOf(state, squad)
  if (!members.length || !members.every(cat => cat.injuredRemaining <= 0 && canReceiveWorkOrder(cat))) return false
  members.forEach(cat => wakeForWorkOrder(state, cat))
  mission.status = 'assigned'
  mission.squadId = squad.id
  squad.missionId = mission.id
  squad.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
  squad.phase = 'outbound'
  squad.routeFrom = { ...origin }
  squad.restAfterReturn = false
  squad.travel = 0
  squad.travelDuration = travelTimeBetween(origin, mission)
  note(state, 'log.mission_started', { squad: squad.name, mission: mission.title })
  emitEvent(state, { type: 'mission_started', squadId: squad.id, missionId: mission.id })
  return true
}

export function getManualDispatchBlockReason(state: State, squadId: string, missionId: string) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  const mission = state.missions.find(candidate => candidate.id === missionId)
  if (!squad || !mission || mission.status !== 'available') return 'dispatch.reason.unavailable'
  if (squad.autoDispatch) return 'dispatch.reason.auto_enabled'
  if (!['base', 'field'].includes(squad.phase)) return 'dispatch.reason.away'
  if (squadHasPendingEquipment(state, squad)) return 'dispatch.reason.pending_equipment'
  const members = membersOf(state, squad)
  if (!members.length) return 'dispatch.reason.empty'
  if (members.some(cat => cat.injuredRemaining > 0)) return 'dispatch.reason.injured'
  if (members.some(cat => !canReceiveWorkOrder(cat))) return 'dispatch.reason.tired'
  const origin = squad.phase === 'field' ? getSquadMapPosition(squad) : CONFIG.map.base
  if (!hasEnergyForMissionFrom(state, squad, origin, mission)) return 'dispatch.reason.tired'
  return undefined
}

export function dispatchSquadToMission(state: State, squadId: string, missionId: string) {
  if (getManualDispatchBlockReason(state, squadId, missionId)) return false
  const squad = state.squads.find(candidate => candidate.id === squadId)
  const origin = squad?.phase === 'field' ? getSquadMapPosition(squad) : CONFIG.map.base
  return squad ? startMission(state, squad, missionId, origin) : false
}

function rewardMission(state: State, squad: Squad) {
  const missionId = squad.missionId
  const mission = state.missions.find(candidate => candidate.id === missionId)
  if (mission) mission.status = 'completed'
  squad.completed++
  state.scrap += CONFIG.mission.rewardScrap
  state.fame = Math.min(CONFIG.limits.fame, state.fame + CONFIG.mission.rewardFame)
  squad.progress = 0
  note(state, 'log.cleanup_completed', { squad: squad.name, scrap: CONFIG.mission.rewardScrap, fame: CONFIG.mission.rewardFame })
  if (missionId) emitEvent(state, { type: 'mission_completed', squadId: squad.id, missionId })
}

function dispatchNextMissionOrReturn(state: State, squad: Squad) {
  const previousMissionId = squad.missionId
  const origin = squad.target ? { x: squad.target.x, y: squad.target.y } : { ...CONFIG.map.base }
  if (squadHasPendingEquipment(state, squad)) {
    sendHome(squad)
    note(state, 'log.squad_returning_for_equipment', { squad: squad.name })
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

function maybeShowFinalSummary(state: State) {
  if (!state.storyResolution || state.fame < CONFIG.goal.fame || state.finalSummarySeen || state.finalSummaryVisible) return
  state.speed = 0
  state.finalSummaryVisible = true
  note(state, 'log.goal_reached')
  emitEvent(state, { type: 'final_summary_available' })
}

function startNinthLife(state: State, squad: Squad) {
  if (state.storyTriggered || successfulCleanups(state) < CONFIG.story.successfulCleanupsBeforeTrigger) return
  state.storyTriggered = true
  state.speed = 0
  state.storyIncident = {
    kind: 'ninth_life',
    foundBySquadId: squad.id,
    x: squad.target?.x ?? 68,
    y: squad.target?.y ?? 36,
  }
  note(state, 'log.story_found', { squad: squad.name })
  emitEvent(state, { type: 'story_started', story: 'ninth_life', squadId: squad.id })
}

function afterSuccessfulCleanup(state: State, squad: Squad) {
  startNinthLife(state, squad)
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
    if (clear) return { id: `cleanup-${serial}`, title: label, x, y, priority, status: 'available' }
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
  return { id: `cleanup-${serial}`, title: label, ...fallback, priority, status: 'available' }
}

function desiredMissionCount(time: number) {
  const index = Math.floor(time / CONFIG.mission.flowInterval) % CONFIG.mission.flowCycle.length
  return CONFIG.mission.flowCycle[index]
}

function reconcileMissionFlow(state: State) {
  const desired = desiredMissionCount(state.time)
  while (state.missions.length < desired) state.missions.push(spawnMission(state))
  while (state.missions.length > desired) {
    const mission = state.missions.find(candidate => candidate.status === 'available')
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

function assistingSquads(state: State, primary: Squad) {
  return state.squads.filter(squad => squad.phase === 'assisting' && squad.target?.id === primary.target?.id)
}

function cleanupParticipants(state: State, primary: Squad) {
  return [primary, ...assistingSquads(state, primary)]
}

function cleanupRate(state: State, primary: Squad) {
  return cleanupParticipants(state, primary)
    .reduce((total, squad) => total + getSquadCleanupEstimate(state, squad).totalRate, 0)
}

export function getCleanupSecondsRemaining(state: State, squad: Squad) {
  const rate = cleanupRate(state, squad)
  return rate > 0 ? Math.max(0, CONFIG.mission.cleanupWork - squad.progress) / rate : 0
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

function eligibleSupportSquad(state: State, primarySquadId: string) {
  return state.squads
    .filter(squad => {
      const members = membersOf(state, squad)
      return squad.id !== primarySquadId && members.length > 0
        && members.every(cat => cat.injuredRemaining <= 0 && canReceiveWorkOrder(cat))
    })
    .sort((a, b) => Number(a.phase !== 'base') - Number(b.phase !== 'base') || a.id.localeCompare(b.id))[0]
}

function startRaidIncident(state: State, squad: Squad) {
  if (!squad.missionId) return
  state.raidTriggered = true
  state.speed = 0
  squad.phase = 'incident'
  state.incident = {
    kind: 'raiders',
    stage: 'decision',
    primarySquadId: squad.id,
    missionId: squad.missionId,
    supportChance: actionChance(state, squad, 'support'),
    attackChance: actionChance(state, squad, 'attack'),
    supportRoll: randomPercent(state),
    attackRoll: randomPercent(state),
    injuryRoll: randomPercent(state),
    injuredMemberRoll: randomPercent(state),
  }
  note(state, 'log.raid_started', { squad: squad.name })
  emitEvent(state, { type: 'incident_started', incident: 'raiders', squadId: squad.id, missionId: squad.missionId })
}

export function getRaidOptions(state: State) {
  if (!state.incident) return undefined
  const supportSquad = eligibleSupportSquad(state, state.incident.primarySquadId)
  const primarySquad = state.squads.find(squad => squad.id === state.incident?.primarySquadId)
  const hasWeapon = Boolean(primarySquad && membersOf(state, primarySquad).some(cat => hasEquipped(cat, 'nonlethal_weapon')))
  const defenseReady = state.research.nodes.improvised_defense.completed
  return {
    escape: { available: true, chance: CONFIG.chance.maximum } satisfies RaidOption,
    attack: defenseReady && hasWeapon
      ? { available: true, chance: state.incident.attackChance } satisfies RaidOption
      : { available: false, reason: defenseReady ? 'raid.reason.equip_weapon' : 'raid.reason.research_defense' } satisfies RaidOption,
    support: supportSquad
      ? { available: true, chance: state.incident.supportChance, supportSquadName: supportSquad.name }
      : { available: false, reason: 'raid.reason.no_support_squad' } satisfies RaidOption,
  }
}

function removeMission(state: State, missionId?: string) {
  if (!missionId) return
  const mission = state.missions.find(candidate => candidate.id === missionId)
  if (mission) state.missions.splice(state.missions.indexOf(mission), 1)
}

export function getSquadMapPosition(squad: Squad): MapPoint {
  if (squad.phase === 'base') return { ...CONFIG.map.base }
  if (!squad.target) return { ...squad.routeFrom }
  if (!['outbound', 'support', 'returning'].includes(squad.phase)) return { x: squad.target.x, y: squad.target.y }
  const destination = squad.phase === 'returning' ? CONFIG.map.base : squad.target
  const ratio = Math.min(1, squad.travel / Math.max(squad.travelDuration, 1e-9))
  return {
    x: squad.routeFrom.x + (destination.x - squad.routeFrom.x) * ratio,
    y: squad.routeFrom.y + (destination.y - squad.routeFrom.y) * ratio,
  }
}

function sendHome(squad: Squad, restAfterReturn = false) {
  const origin = getSquadMapPosition(squad)
  squad.phase = 'returning'
  squad.routeFrom = origin
  squad.restAfterReturn = restAfterReturn
  squad.travel = 0
  squad.progress = 0
  squad.travelDuration = travelTimeBetween(origin, CONFIG.map.base)
}

export function returnSquadToBase(state: State, squadId: string) {
  const squad = state.squads.find(candidate => candidate.id === squadId)
  if (!squad || squad.phase !== 'field') return false
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

function failRaid(state: State, squad: Squad, incident: RaidIncident, messageKey: string) {
  maybeInjureCat(state, squad, incident)
  sendHome(squad)
  state.incident = undefined
  note(state, messageKey, { squad: squad.name })
  emitEvent(state, {
    type: 'mission_failed',
    squadId: squad.id,
    missionId: incident.missionId,
    reason: messageKey === 'log.raid_attack_failed' ? 'attack' : 'support',
  })
}

function cancelSquadMission(state: State, squad: Squad) {
  removeMission(state, squad.missionId)
  squad.missionId = undefined
  squad.progress = 0
  squad.travel = 0
}

export function resolveRaidDecision(state: State, action: 'escape' | 'attack' | 'support') {
  const incident = state.incident
  if (!incident || incident.stage !== 'decision') return false
  const primary = state.squads.find(squad => squad.id === incident.primarySquadId)
  if (!primary) return false

  if (action === 'escape') {
    sendHome(primary)
    state.incident = undefined
    note(state, 'log.raid_escape', { squad: primary.name })
    emitEvent(state, { type: 'mission_failed', squadId: primary.id, missionId: incident.missionId, reason: 'escape' })
    syncAchievements(state)
    return true
  }
  if (action === 'attack') {
    const attackAvailable = state.research.nodes.improvised_defense.completed
      && membersOf(state, primary).some(cat => hasEquipped(cat, 'nonlethal_weapon'))
    if (!attackAvailable) return false
    if (incident.attackRoll > incident.attackChance) {
      failRaid(state, primary, incident, 'log.raid_attack_failed')
      syncAchievements(state)
      return true
    }
    primary.phase = 'cleanup'
    state.incident = undefined
    note(state, 'log.raid_attack_won', { squad: primary.name })
    syncAchievements(state)
    return true
  }

  const support = eligibleSupportSquad(state, primary.id)
  if (!support) return false
  if (incident.supportRoll > incident.supportChance) {
    failRaid(state, primary, incident, 'log.raid_support_failed')
    syncAchievements(state)
    return true
  }

  const supportOrigin = getSquadMapPosition(support)
  if (support.phase !== 'base' && support.phase !== 'field') {
    const recalledMissionId = support.missionId
    cancelSquadMission(state, support)
    note(state, 'log.support_recalled', { squad: support.name })
    emitEvent(state, { type: 'mission_failed', squadId: support.id, missionId: recalledMissionId, reason: 'recalled' })
  }
  membersOf(state, support).forEach(cat => wakeForWorkOrder(state, cat))
  incident.stage = 'support_en_route'
  incident.supportSquadId = support.id
  support.phase = 'support'
  support.routeFrom = supportOrigin
  support.restAfterReturn = false
  support.target = primary.target ? { ...primary.target } : undefined
  support.travel = 0
  support.travelDuration = state.research.nodes.emergency_dispatch.completed
    ? CONFIG.raid.researchedSupportTravelTime
    : CONFIG.raid.supportTravelTime
  support.progress = 0
  state.speed = 1
  note(state, 'log.support_dispatched', { squad: support.name, seconds: support.travelDuration })
  emitEvent(state, { type: 'support_requested', squadId: support.id, primarySquadId: primary.id, seconds: support.travelDuration })
  return true
}

export function resolveRaidFollowup(state: State, action: 'retreat' | 'continue') {
  const incident = state.incident
  if (!incident || incident.stage !== 'support_decision') return false
  const primary = state.squads.find(squad => squad.id === incident.primarySquadId)
  const support = state.squads.find(squad => squad.id === incident.supportSquadId)
  if (!primary || !support) return false

  if (action === 'continue') {
    primary.phase = 'cleanup'
    support.phase = 'assisting'
    support.target = primary.target ? { ...primary.target } : undefined
    note(state, 'log.raid_support_won')
  } else {
    sendHome(primary)
    sendHome(support)
    note(state, 'log.raid_retreat')
    emitEvent(state, { type: 'mission_failed', squadId: primary.id, missionId: incident.missionId, reason: 'retreat' })
  }
  state.incident = undefined
  syncAchievements(state)
  return true
}

function arriveAtBase(state: State, squad: Squad) {
  const shouldRest = squad.restAfterReturn
  removeMission(state, squad.missionId)
  squad.phase = 'base'
  squad.missionId = undefined
  squad.target = undefined
  squad.travel = 0
  squad.travelDuration = 0
  squad.routeFrom = { ...CONFIG.map.base }
  squad.restAfterReturn = false
  note(state, 'log.squad_returned', { squad: squad.name })
  membersOf(state, squad).forEach(cat => applyPendingEquipment(state, cat))
  if (shouldRest) membersOf(state, squad).forEach(cat => putCatToSleep(state, cat))
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
  const elapsed = seconds * state.speed
  state.time += elapsed
  reconcileMissionFlow(state)
  syncCatSleep(state)
  const workingCatId = updateResearch(state, elapsed)
  syncCatSleep(state)
  updateRestAndRecovery(state, elapsed, workingCatId)
  syncCatSleep(state)

  for (const squad of state.squads) {
    if (squad.phase === 'base') {
      if (squad.autoDispatch) startMission(state, squad)
      continue
    }
    if (squad.phase === 'field') {
      if (squadHasPendingEquipment(state, squad)) {
        sendHome(squad)
        note(state, 'log.squad_returning_for_equipment', { squad: squad.name })
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
    if (squad.phase === 'assisting') continue
    if (squad.phase === 'support') {
      spendTravelEnergy(state, squad, elapsed)
      squad.travel += elapsed
      if (squad.travel >= squad.travelDuration && state.incident?.stage === 'support_en_route') {
        squad.travel = squad.travelDuration
        squad.phase = 'incident'
        state.incident.stage = 'support_decision'
        state.speed = 0
        note(state, 'log.support_arrived', { squad: squad.name })
        emitEvent(state, { type: 'support_arrived', squadId: squad.id, primarySquadId: state.incident.primarySquadId })
        break
      }
      continue
    }
    if (squad.phase === 'outbound' || squad.phase === 'returning') {
      spendTravelEnergy(state, squad, elapsed)
      squad.travel += elapsed
      if (squad.travel >= squad.travelDuration) {
        if (squad.phase === 'outbound') {
          squad.phase = 'cleanup'
          squad.progress = 0
          note(state, 'log.mission_arrived', { squad: squad.name })
        } else {
          arriveAtBase(state, squad)
        }
      }
      continue
    }

    const raidIsPending = !state.raidTriggered
      && successfulCleanups(state) >= CONFIG.raid.successfulCleanupsBeforeTrigger
    const workLimit = raidIsPending ? CONFIG.mission.raidTriggerWork : CONFIG.mission.cleanupWork
    const rate = cleanupRate(state, squad)
    const workDone = Math.min(Math.max(0, workLimit - squad.progress), elapsed * rate)
    const workSeconds = rate > 0 ? workDone / rate : 0
    for (const participant of cleanupParticipants(state, squad)) {
      for (const cat of membersOf(state, participant)) {
        cat.energy = Math.max(0, cat.energy - workSeconds * CONFIG.mission.energyCostPerBaseCleanup / CONFIG.mission.cleanupWork)
      }
    }
    squad.progress += workDone

    if (raidIsPending && squad.progress >= CONFIG.mission.raidTriggerWork) {
      squad.progress = CONFIG.mission.raidTriggerWork
      startRaidIncident(state, squad)
      break
    }
    if (squad.progress >= CONFIG.mission.cleanupWork) {
      for (const assistant of assistingSquads(state, squad)) sendHome(assistant)
      rewardMission(state, squad)
      afterSuccessfulCleanup(state, squad)
      dispatchNextMissionOrReturn(state, squad)
    }
  }
  syncAchievements(state)
}

export type GameCommand =
  | { type: 'set_speed'; speed: Speed }
  | { type: 'assign_cat'; catId: string; squadId: string }
  | { type: 'equip_item'; catId: string; slot: EquipmentSlot; itemId?: ItemId }
  | { type: 'set_squad_style'; squadId: string; style: SquadStyle }
  | { type: 'set_auto_dispatch'; squadId: string; enabled: boolean }
  | { type: 'dispatch_squad'; squadId: string; missionId: string }
  | { type: 'return_squad'; squadId: string }
  | { type: 'select_research'; researchId?: ResearchId }
  | { type: 'resolve_raid'; action: 'escape' | 'attack' | 'support' }
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
      case 'equip_item': return equipItem(this.world, command.catId, command.slot, command.itemId)
      case 'set_squad_style': return setSquadStyle(this.world, command.squadId, command.style)
      case 'set_auto_dispatch': return setSquadAutoDispatch(this.world, command.squadId, command.enabled)
      case 'dispatch_squad': return dispatchSquadToMission(this.world, command.squadId, command.missionId)
      case 'return_squad': return returnSquadToBase(this.world, command.squadId)
      case 'select_research': return selectResearch(this.world, command.researchId)
      case 'resolve_raid': return resolveRaidDecision(this.world, command.action)
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
