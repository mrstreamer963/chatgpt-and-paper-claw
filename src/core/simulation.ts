import { SIMULATION_CONFIG as CONFIG } from './config.ts'

export type Speed = 0 | 1 | 5 | 10
export type SquadStyle = 'careful' | 'balanced' | 'risky'
export type EquipmentSlot = 'armor' | 'suit' | 'belt' | 'hands'
export type ItemId = 'armor_vest' | 'toolkit' | 'headset' | 'medkit' | 'scanner' | 'nonlethal_weapon'
export type ResearchId = 'field_scanners' | 'emergency_dispatch' | 'improvised_defense'
export type AchievementId = 'first_squad' | 'field_kit' | 'first_cleanup' | 'research_started' | 'raiders_resolved' | 'ninth_life_closed'
export type Equipment = Record<EquipmentSlot, ItemId | undefined>
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
  assignedTo?: string
  injuredRemaining: number
  equipment: Equipment
}
export type Mission = { id: string; title: string; x: number; y: number; priority: number; status: 'available' | 'assigned'; squadId?: string }
export type Phase = 'base' | 'outbound' | 'cleanup' | 'incident' | 'support' | 'returning'
export type Squad = {
  id: string
  name: string
  members: string[]
  style: SquadStyle
  phase: Phase
  travel: number
  travelDuration: number
  progress: number
  completed: number
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
export type State = {
  fame: number
  scrap: number
  threat: number
  speed: Speed
  time: number
  activeView: 'map' | 'base'
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
export type Achievement = {
  id: AchievementId
  title: string
  description: string
  hint: string
  completed: boolean
}

export const SAVE_FORMAT = 'nine-lives-corp-save'
export const SAVE_VERSION = 2
export type SaveEnvelope = {
  format: typeof SAVE_FORMAT
  version: typeof SAVE_VERSION
  savedAt: string
  state: State
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'completed'>[] = [
  { id: 'first_squad', title: 'Собрать звено', description: 'Назначить хотя бы одного кота в отряд.', hint: 'Откройте «База → Гараж и арсенал» и назначьте кота в любой отряд.' },
  { id: 'field_kit', title: 'Готовы к выезду', description: 'Выдать оперативнику первый предмет снаряжения.', hint: 'Раскройте карточку кота на базе и выдайте предмет со склада.' },
  { id: 'first_cleanup', title: 'Чистая работа', description: 'Успешно завершить первую уборку.', hint: 'Включите время: подготовленный отряд сам выберет уборку и отправится на место.' },
  { id: 'research_started', title: 'Лабораторная смена', description: 'Запустить первое исследование.', hint: 'Откройте лабораторию, выберите исследование и оставьте одного кота свободным.' },
  { id: 'raiders_resolved', title: 'Нештатная ситуация', description: 'Разрешить встречу с рейдерами.', hint: 'После двух уборок подготовьте второй отряд: он сможет прийти первому на поддержку.' },
  { id: 'ninth_life_closed', title: 'Девятая жизнь', description: 'Принять решение по делу 09.', hint: 'Добейтесь третьей успешной уборки и решите судьбу дезертира.' },
]

export const EQUIPMENT_SLOTS: { id: EquipmentSlot; name: string }[] = [
  { id: 'armor', name: 'Бронежилет' },
  { id: 'suit', name: 'Комбинезон' },
  { id: 'belt', name: 'Пояс' },
  { id: 'hands', name: 'Руки' },
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
  cleanupDuration: CONFIG.mission.cleanupDuration,
  raidTriggerProgress: CONFIG.mission.raidTriggerProgress,
  cleanupRewardScrap: CONFIG.mission.rewardScrap,
  guaranteedChance: CONFIG.chance.maximum,
  minimumResearchEnergy: CONFIG.research.minimumStartEnergy,
  elevatedThreat: CONFIG.threat.elevated,
  severeThreat: CONFIG.threat.severe,
}
export const STORY_DECISION_BALANCE = CONFIG.story.decisions

const templates: Mission[] = CONFIG.mission.templates.map(template => ({ ...template, status: 'available' }))

export function createState(): State {
  const emptyEquipment = (): Equipment => ({ armor: undefined, suit: undefined, belt: undefined, hands: undefined })
  return {
    fame: CONFIG.initial.fame,
    scrap: CONFIG.initial.scrap,
    threat: CONFIG.initial.threat,
    speed: 0,
    time: 0,
    activeView: 'map',
    cats: CONFIG.cats.map(cat => ({ ...cat, injuredRemaining: 0, equipment: emptyEquipment() })),
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
      { id: 'alpha', name: 'Отряд «Альфа»', members: [], style: 'balanced', phase: 'base', travel: 0, travelDuration: 0, progress: 0, completed: 0 },
      { id: 'bravo', name: 'Отряд «Браво»', members: [], style: 'careful', phase: 'base', travel: 0, travelDuration: 0, progress: 0, completed: 0 },
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

function isValidCat(value: unknown) {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.role !== 'string') return false
  const numericFields = ['energy', 'reaction', 'combat', 'tech', 'perception', 'scouting', 'cleanupTrait', 'supportTrait', 'attackTrait', 'injuryTrait', 'injuredRemaining']
  return numericFields.every(field => isFiniteNumber(value[field]))
    && (value.assignedTo === undefined || typeof value.assignedTo === 'string')
    && isValidEquipment(value.equipment)
}

function isValidTarget(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string'
    && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.priority)
}

function isValidSquad(value: unknown) {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return false
  if (!Array.isArray(value.members) || !value.members.every(member => typeof member === 'string')) return false
  if (!['careful', 'balanced', 'risky'].includes(value.style as string)
    || !['base', 'outbound', 'cleanup', 'incident', 'support', 'returning'].includes(value.phase as string)) return false
  if (![value.travel, value.travelDuration, value.progress, value.completed].every(isFiniteNumber)) return false
  return (value.missionId === undefined || typeof value.missionId === 'string')
    && (value.target === undefined || isValidTarget(value.target))
}

function isValidMission(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string'
    && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.priority)
    && ['available', 'assigned'].includes(value.status as string)
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

function isValidState(value: unknown): value is State {
  if (!isRecord(value)) return false
  if (![0, 1, 5, 10].includes(value.speed as number) || !['map', 'base'].includes(value.activeView as string)) return false
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

export function serializeState(state: State) {
  const envelope: SaveEnvelope = {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  }
  return JSON.stringify(envelope, null, 2)
}

export function deserializeState(payload: string): State {
  let envelope: unknown
  try {
    envelope = JSON.parse(payload)
  } catch {
    throw new Error('Файл не является корректным JSON-сохранением.')
  }
  if (!isRecord(envelope) || envelope.format !== SAVE_FORMAT) throw new Error('Неизвестный формат сохранения.')
  if (envelope.version !== 1 && envelope.version !== SAVE_VERSION) throw new Error(`Версия сохранения ${String(envelope.version)} не поддерживается.`)
  if (typeof envelope.savedAt !== 'string') throw new Error('Сохранение не содержит корректную дату.')
  const candidate = envelope.version === 1 ? migrateV1State(envelope.state) : envelope.state
  if (!isValidState(candidate)) throw new Error('Сохранение повреждено или содержит неполные данные.')

  const restored = structuredClone(candidate)
  restored.cats.forEach(cat => {
    cat.equipment = {
      armor: cat.equipment.armor,
      suit: cat.equipment.suit,
      belt: cat.equipment.belt,
      hands: cat.equipment.hands,
    }
  })
  return restored
}

export function successfulCleanups(state: State) {
  return state.squads.reduce((total, squad) => total + squad.completed, 0)
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

  state.speed = 0
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
  state.speed = 0
  squad.style = style
  note(state, 'log.squad_style', { squad: squad.name, style })
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
  return canEditCat(state, catId)
}

export function equipItem(state: State, catId: string, slot: EquipmentSlot, itemId?: ItemId) {
  const cat = state.cats.find(candidate => candidate.id === catId)
  if (!cat || !canEditEquipment(state, catId)) return false
  const currentItemId = cat.equipment[slot]
  if (currentItemId === itemId) return false
  if (itemId) {
    const definition = itemDefinition(itemId)
    if (!definition || definition.slot !== slot || state.inventory[itemId] <= 0) return false
  }

  state.speed = 0
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

export function selectResearch(state: State, researchId?: ResearchId) {
  if (researchId && state.research.nodes[researchId].completed) return false
  if (state.research.activeId === researchId) return false
  state.research.activeId = researchId
  state.research.workerCatId = undefined
  if (researchId) {
    chooseResearchWorker(state)
    const definition = CONFIG.research.nodes.find(node => node.id === researchId)
    note(state, 'log.research_selected', { research: definition?.name ?? researchId })
  } else {
    note(state, 'log.research_paused')
  }
  syncAchievements(state)
  return true
}

export function getResearchWorker(state: State) {
  return state.cats.find(cat => cat.id === state.research.workerCatId)
}

function distanceFromBase(target: Pick<Mission, 'x' | 'y'>) {
  return Math.hypot(target.x - CONFIG.map.base.x, target.y - CONFIG.map.base.y)
}

function travelTime(target: Pick<Mission, 'x' | 'y'>) {
  return Math.max(CONFIG.mission.minimumTravelTime, distanceFromBase(target) / CONFIG.mission.mapSpeed)
}

function startMission(state: State, squad: Squad) {
  const mission = state.missions
    .filter(candidate => candidate.status === 'available')
    .sort((a, b) => b.priority - a.priority || distanceFromBase(a) - distanceFromBase(b))[0]
  if (!mission) return
  mission.status = 'assigned'
  mission.squadId = squad.id
  squad.missionId = mission.id
  squad.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
  squad.phase = 'outbound'
  squad.travel = 0
  squad.travelDuration = travelTime(mission)
  note(state, 'log.mission_started', { squad: squad.name, mission: mission.title })
}

function rewardMission(state: State, squad: Squad) {
  squad.completed++
  state.scrap += CONFIG.mission.rewardScrap
  state.fame = Math.min(CONFIG.limits.fame, state.fame + CONFIG.mission.rewardFame)
  squad.members.forEach(id => {
    const cat = state.cats.find(candidate => candidate.id === id)
    if (cat) cat.energy = Math.max(0, cat.energy - CONFIG.mission.energyCost)
  })
  squad.phase = 'returning'
  squad.travel = 0
  squad.progress = 0
  note(state, 'log.cleanup_completed', { squad: squad.name, scrap: CONFIG.mission.rewardScrap, fame: CONFIG.mission.rewardFame })
}

function maybeShowFinalSummary(state: State) {
  if (!state.storyResolution || state.fame < CONFIG.goal.fame || state.finalSummarySeen || state.finalSummaryVisible) return
  state.speed = 0
  state.finalSummaryVisible = true
  note(state, 'log.goal_reached')
}

function startNinthLife(state: State, squad: Squad) {
  if (state.storyTriggered || successfulCleanups(state) < CONFIG.story.successfulCleanupsBeforeTrigger) return
  state.storyTriggered = true
  state.speed = 0
  state.activeView = 'map'
  state.storyIncident = {
    kind: 'ninth_life',
    foundBySquadId: squad.id,
    x: squad.target?.x ?? 68,
    y: squad.target?.y ?? 36,
  }
  note(state, 'log.story_found', { squad: squad.name })
}

function afterSuccessfulCleanup(state: State, squad: Squad) {
  startNinthLife(state, squad)
  maybeShowFinalSummary(state)
}

const STORY_OUTCOMES: Record<NinthLifeDecision, Omit<StoryResolution, 'decision' | 'fameDelta' | 'threatDelta'>> = {
  shelter: {
    title: 'Укрыть дезертира',
    branch: 'Защита свидетеля',
    outcome: 'Дезертир остаётся под защитой корпорации. По району расходится слух: NINE LIVES своих не выдаёт.',
    unlockedLocation: false,
  },
  interrogate: {
    title: 'Допросить',
    branch: 'Архив «Иглы»',
    outcome: 'Аналитики получают полную схему базы ежей, маршруты патрулей и позывные командиров.',
    unlockedLocation: false,
  },
  escort: {
    title: 'Сопроводить к границе',
    branch: 'Тихий коридор',
    outcome: 'Дезертир безопасно покидает сектор. Корпорация сохраняет нейтралитет и не привлекает лишнего внимания.',
    unlockedLocation: false,
  },
  exploit: {
    title: 'Использовать данные сразу',
    branch: 'Координаты «Девятки»',
    outcome: 'Оперативники подтверждают координаты укрепления ежей. Новая цель нанесена на карту, но противник замечает разведку.',
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
  return { id: `cleanup-${serial}`, title: label, ...generation.fallback, priority, status: 'available' }
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

export function getSquadCleanupChance(state: State, squad: Squad) {
  const members = membersOf(state, squad)
  if (!members.length) return 0
  const skillSum = members.reduce((sum, cat) => sum + cat.tech + cat.perception, 0)
  const traitBonus = members.reduce((sum, cat) => sum + cat.cleanupTrait, 0)
  const equipmentBonus = members.reduce((sum, cat) => sum
    + (hasEquipped(cat, 'toolkit') ? itemBonus('toolkit', 'cleanupBonus') : 0)
    + (hasEquipped(cat, 'scanner') ? itemBonus('scanner', 'cleanupBonus') : 0), 0)
  return baseTeamChance(members, CONFIG.chance.cleanupBase, skillSum, 0, traitBonus, equipmentBonus)
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
    .filter(squad => squad.id !== primarySquadId && membersOf(state, squad).some(cat => cat.injuredRemaining <= 0))
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

function sendHome(squad: Squad) {
  squad.phase = 'returning'
  squad.travel = 0
  squad.progress = 0
  if (squad.target) squad.travelDuration = travelTime(squad.target)
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
}

function failRaid(state: State, squad: Squad, incident: RaidIncident, messageKey: string) {
  maybeInjureCat(state, squad, incident)
  sendHome(squad)
  state.incident = undefined
  note(state, messageKey, { squad: squad.name })
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
    rewardMission(state, primary)
    state.incident = undefined
    note(state, 'log.raid_attack_won', { squad: primary.name })
    afterSuccessfulCleanup(state, primary)
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

  if (support.phase !== 'base') {
    cancelSquadMission(state, support)
    note(state, 'log.support_recalled', { squad: support.name })
  }
  incident.stage = 'support_en_route'
  incident.supportSquadId = support.id
  support.phase = 'support'
  support.target = primary.target ? { ...primary.target } : undefined
  support.travel = 0
  support.travelDuration = state.research.nodes.emergency_dispatch.completed
    ? CONFIG.raid.researchedSupportTravelTime
    : CONFIG.raid.supportTravelTime
  support.progress = 0
  note(state, 'log.support_dispatched', { squad: support.name, seconds: support.travelDuration })
  return true
}

export function resolveRaidFollowup(state: State, action: 'retreat' | 'continue') {
  const incident = state.incident
  if (!incident || incident.stage !== 'support_decision') return false
  const primary = state.squads.find(squad => squad.id === incident.primarySquadId)
  const support = state.squads.find(squad => squad.id === incident.supportSquadId)
  if (!primary || !support) return false

  if (action === 'continue') {
    rewardMission(state, primary)
    note(state, 'log.raid_support_won')
  } else {
    sendHome(primary)
    note(state, 'log.raid_retreat')
  }
  sendHome(support)
  state.incident = undefined
  if (action === 'continue') afterSuccessfulCleanup(state, primary)
  syncAchievements(state)
  return true
}

function arriveAtBase(state: State, squad: Squad) {
  removeMission(state, squad.missionId)
  squad.phase = 'base'
  squad.missionId = undefined
  squad.target = undefined
  squad.travel = 0
  squad.travelDuration = 0
  note(state, 'log.squad_returned', { squad: squad.name })
}

function chooseResearchWorker(state: State) {
  const current = getResearchWorker(state)
  if (current && !current.assignedTo && current.injuredRemaining <= 0 && current.energy >= CONFIG.research.minimumContinueEnergy) return current
  const next = state.cats
    .filter(cat => !cat.assignedTo && cat.injuredRemaining <= 0 && cat.energy >= CONFIG.research.minimumStartEnergy)
    .sort((a, b) => b.tech - a.tech || a.id.localeCompare(b.id))[0]
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
    const squad = state.squads.find(candidate => candidate.id === cat.assignedTo)
    const isAtBase = !squad || squad.phase === 'base'
    if (!isAtBase) return
    if (cat.id !== workingCatId) cat.energy = Math.min(CONFIG.limits.energy, cat.energy + elapsed * CONFIG.mission.restPerSecond)
    if (cat.injuredRemaining > 0) {
      cat.injuredRemaining = Math.max(0, cat.injuredRemaining - elapsed)
      if (cat.injuredRemaining === 0) note(state, 'log.cat_recovered', { cat: cat.name })
    }
  })
}

export function tick(state: State, seconds: number) {
  if (!state.speed) return
  const elapsed = seconds * state.speed
  state.time += elapsed
  reconcileMissionFlow(state)
  const workingCatId = updateResearch(state, elapsed)
  updateRestAndRecovery(state, elapsed, workingCatId)

  for (const squad of state.squads) {
    if (squad.phase === 'base') {
      const members = membersOf(state, squad)
      if (members.length && members.every(cat => cat.energy >= CONFIG.mission.minimumDepartureEnergy && cat.injuredRemaining <= 0)) startMission(state, squad)
      continue
    }
    if (squad.phase === 'incident') continue
    if (squad.phase === 'support') {
      squad.travel += elapsed
      if (squad.travel >= squad.travelDuration && state.incident?.stage === 'support_en_route') {
        squad.travel = squad.travelDuration
        squad.phase = 'incident'
        state.incident.stage = 'support_decision'
        state.speed = 0
        note(state, 'log.support_arrived', { squad: squad.name })
        break
      }
      continue
    }
    if (squad.phase === 'outbound' || squad.phase === 'returning') {
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

    squad.progress += elapsed
    const raidIsDue = !state.raidTriggered
      && successfulCleanups(state) >= CONFIG.raid.successfulCleanupsBeforeTrigger
      && squad.progress >= CONFIG.mission.raidTriggerProgress
    if (raidIsDue) {
      squad.progress = CONFIG.mission.raidTriggerProgress
      startRaidIncident(state, squad)
      break
    }
    if (squad.progress >= CONFIG.mission.cleanupDuration) {
      rewardMission(state, squad)
      afterSuccessfulCleanup(state, squad)
    }
  }
  syncAchievements(state)
}
