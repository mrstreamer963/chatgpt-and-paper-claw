import { SIMULATION_CONFIG as CONFIG } from './config.ts'

export type Speed = 0 | 1 | 5 | 10
export type SquadStyle = 'careful' | 'balanced' | 'risky'
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
  supportTrait: number
  injuryTrait: number
  assignedTo?: string
  injuredRemaining: number
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
  log: string[]
}
export type RaidOption = { available: boolean; chance?: number; reason?: string; supportSquadName?: string }

const templates: Mission[] = [
  { id: 'a', title: 'Свалка у эстакады', x: 23, y: 25, priority: 1, status: 'available' },
  { id: 'b', title: 'Складской квартал', x: 75, y: 24, priority: 1, status: 'available' },
  { id: 'c', title: 'Ржавый терминал', x: 76, y: 70, priority: 1, status: 'available' },
  { id: 'd', title: 'Старый коллектор', x: 22, y: 72, priority: 1, status: 'available' },
]

export function createState(): State {
  return {
    fame: CONFIG.initial.fame,
    scrap: CONFIG.initial.scrap,
    threat: CONFIG.initial.threat,
    speed: 0,
    time: 0,
    activeView: 'map',
    cats: CONFIG.cats.map(cat => ({ ...cat, injuredRemaining: 0 })),
    missions: structuredClone(templates.slice(0, 2)),
    missionSerial: 0,
    rngSeed: CONFIG.initial.rngSeed,
    raidTriggered: false,
    storyTriggered: false,
    finalSummaryVisible: false,
    finalSummarySeen: false,
    squads: [
      { id: 'alpha', name: 'Отряд «Альфа»', members: [], style: 'balanced', phase: 'base', travel: 0, travelDuration: 0, progress: 0, completed: 0 },
      { id: 'bravo', name: 'Отряд «Браво»', members: [], style: 'careful', phase: 'base', travel: 0, travelDuration: 0, progress: 0, completed: 0 },
    ],
    log: ['09:00 · База NINE LIVES CORP готова к работе'],
  }
}

function clock(t: number) {
  const minutes = 540 + Math.floor(t / 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function note(state: State, text: string) {
  state.log = [`${clock(state.time)} · ${text}`, ...state.log].slice(0, 20)
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
    note(state, `${cat.name} назначен в ${targetSquad.name}`)
  } else {
    cat.assignedTo = undefined
    note(state, `${cat.name} выведен из состава ${currentSquad?.name ?? ''}`.trim())
  }
  return true
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
  note(state, `${squad.name} выехал: ${mission.title}`)
}

function rewardMission(state: State, squad: Squad) {
  squad.completed++
  state.scrap += CONFIG.mission.rewardScrap
  state.fame = Math.min(100, state.fame + CONFIG.mission.rewardFame)
  squad.members.forEach(id => {
    const cat = state.cats.find(candidate => candidate.id === id)
    if (cat) cat.energy = Math.max(0, cat.energy - CONFIG.mission.energyCost)
  })
  squad.phase = 'returning'
  squad.travel = 0
  squad.progress = 0
  note(state, `${squad.name} закончил уборку: +${CONFIG.mission.rewardScrap} лома, +${CONFIG.mission.rewardFame} известности`)
}

function maybeShowFinalSummary(state: State) {
  if (!state.storyResolution || state.fame < 50 || state.finalSummarySeen || state.finalSummaryVisible) return
  state.speed = 0
  state.finalSummaryVisible = true
  note(state, 'ЦЕЛЬ ДОСТИГНУТА: дело «Девятая жизнь» закрыто')
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
  note(state, `РАССЛЕДОВАНИЕ: ${squad.name} обнаружил дезертира с данными о базе ежей`)
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
  state.fame = Math.min(100, state.fame + balance.fame)
  state.threat = Math.min(100, state.threat + balance.threat)
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
  note(state, `ДЕЛО ЗАКРЫТО: ${outcome.title} · +${balance.fame} известности${balance.threat ? ` · +${balance.threat} угрозы` : ''}`)
  if (state.fame < 50) note(state, `Для финальной сводки нужно ещё ${50 - state.fame} известности`)
  maybeShowFinalSummary(state)
  return true
}

export function continueAfterFinale(state: State) {
  if (!state.finalSummaryVisible) return false
  state.finalSummaryVisible = false
  state.finalSummarySeen = true
  note(state, 'Сводка архивирована. Корпорация продолжает работу')
  return true
}

function spawnMission(state: State): Mission {
  const label = templates[state.missionSerial % templates.length].title
  const priority = state.missionSerial % 3 === 2 ? 2 : 1
  for (let attempt = 0; attempt < 20; attempt++) {
    const serial = ++state.missionSerial
    const x = 14 + (serial * 37) % 72
    const y = 16 + (serial * 53) % 65
    const clear = state.missions.every(mission => Math.hypot(mission.x - x, mission.y - y) > 18)
    if (clear) return { id: `cleanup-${serial}`, title: label, x, y, priority, status: 'available' }
  }
  const serial = ++state.missionSerial
  return { id: `cleanup-${serial}`, title: label, x: 50, y: 20, priority, status: 'available' }
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
  return (state.rngSeed % 100) + 1
}

function membersOf(state: State, squad: Squad) {
  return squad.members.map(id => state.cats.find(cat => cat.id === id)).filter((cat): cat is Cat => Boolean(cat))
}

function actionChance(state: State, squad: Squad, action: 'support' | 'attack') {
  const members = membersOf(state, squad)
  const skillSum = members.reduce((sum, cat) => sum + (action === 'support' ? cat.scouting + cat.perception : cat.combat + cat.reaction), 0)
  const teamSkillBonus = Math.min(45, Math.floor(skillSum * 1.5))
  const averageEnergy = members.reduce((sum, cat) => sum + cat.energy, 0) / Math.max(1, members.length)
  const fatiguePenalty = Math.min(10, Math.floor(Math.max(0, 70 - averageEnergy) / 5))
  const styleBonus = action === 'support'
    ? squad.style === 'careful' ? 10 : squad.style === 'risky' ? -10 : 0
    : squad.style === 'careful' ? -10 : squad.style === 'risky' ? 10 : 0
  const traitBonus = action === 'support' ? members.reduce((sum, cat) => sum + cat.supportTrait, 0) : 0
  const baseChance = action === 'support' ? CONFIG.raid.supportBaseChance : CONFIG.raid.attackBaseChance
  return Math.max(5, Math.min(100, baseChance + teamSkillBonus + styleBonus + traitBonus - fatiguePenalty))
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
  note(state, `ТРЕВОГА: ${squad.name} столкнулся с рейдерами`)
}

export function getRaidOptions(state: State) {
  if (!state.incident) return undefined
  const supportSquad = eligibleSupportSquad(state, state.incident.primarySquadId)
  return {
    escape: { available: true, chance: 100 } satisfies RaidOption,
    attack: { available: false, reason: 'Нужно исследовать защиту и выдать нелетальное оружие.' } satisfies RaidOption,
    support: supportSquad
      ? { available: true, chance: state.incident.supportChance, supportSquadName: supportSquad.name }
      : { available: false, reason: 'Во втором отряде нет готовых к выезду котов.' } satisfies RaidOption,
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
  const traitReduction = membersOf(state, squad).reduce((sum, cat) => sum + cat.injuryTrait, 0)
  return Math.max(CONFIG.raid.minimumInjuryChance, CONFIG.raid.injuryBaseChance - traitReduction)
}

function maybeInjureCat(state: State, squad: Squad, incident: RaidIncident) {
  if (incident.injuryRoll > injuryChance(state, squad) || !squad.members.length) return
  const memberId = squad.members[(incident.injuredMemberRoll - 1) % squad.members.length]
  const cat = state.cats.find(candidate => candidate.id === memberId)
  if (!cat) return
  cat.injuredRemaining = CONFIG.raid.injuryRecoveryTime
  note(state, `${cat.name} ранен. Восстановление начнётся после возвращения на базу`)
}

function failRaid(state: State, squad: Squad, incident: RaidIncident, message: string) {
  maybeInjureCat(state, squad, incident)
  sendHome(squad)
  state.incident = undefined
  note(state, message)
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
    note(state, `${primary.name} отступает без добычи`)
    return true
  }
  if (action === 'attack') return false

  const support = eligibleSupportSquad(state, primary.id)
  if (!support) return false
  if (incident.supportRoll > incident.supportChance) {
    failRaid(state, primary, incident, `Запрос поддержки сорван. ${primary.name} отступает`)
    return true
  }

  if (support.phase !== 'base') {
    cancelSquadMission(state, support)
    note(state, `${support.name} отозван с текущей уборки без награды`)
  }
  incident.stage = 'support_en_route'
  incident.supportSquadId = support.id
  support.phase = 'support'
  support.target = primary.target ? { ...primary.target } : undefined
  support.travel = 0
  support.travelDuration = CONFIG.raid.supportTravelTime
  support.progress = 0
  note(state, `${support.name} направлен на поддержку. Прибытие через ${CONFIG.raid.supportTravelTime} с`)
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
    note(state, 'Два отряда вытеснили рейдеров и закончили уборку')
  } else {
    sendHome(primary)
    note(state, 'Оба отряда безопасно отходят без добычи')
  }
  sendHome(support)
  state.incident = undefined
  if (action === 'continue') afterSuccessfulCleanup(state, primary)
  return true
}

function arriveAtBase(state: State, squad: Squad) {
  removeMission(state, squad.missionId)
  squad.phase = 'base'
  squad.missionId = undefined
  squad.target = undefined
  squad.travel = 0
  squad.travelDuration = 0
  note(state, `${squad.name} вернулся на базу`)
}

function updateRestAndRecovery(state: State, elapsed: number) {
  state.cats.forEach(cat => {
    const squad = state.squads.find(candidate => candidate.id === cat.assignedTo)
    const isAtBase = !squad || squad.phase === 'base'
    if (!isAtBase) return
    cat.energy = Math.min(100, cat.energy + elapsed * CONFIG.mission.restPerSecond)
    if (cat.injuredRemaining > 0) {
      cat.injuredRemaining = Math.max(0, cat.injuredRemaining - elapsed)
      if (cat.injuredRemaining === 0) note(state, `${cat.name} восстановился после ранения`)
    }
  })
}

export function tick(state: State, seconds: number) {
  if (!state.speed) return
  const elapsed = seconds * state.speed
  state.time += elapsed
  reconcileMissionFlow(state)
  updateRestAndRecovery(state, elapsed)

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
        note(state, `${squad.name} прибыл на поддержку`)
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
          note(state, `${squad.name} прибыл на место уборки`)
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
}
