import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer, type ViteDevServer } from 'vite'
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  assignCat,
  createSquad,
  createState as createFreshState,
  drainEvents,
  dispatchNinthLife,
  equipItem,
  getAchievements,
  resolvePoliceContainer,
  resolveNinthLife,
  resolveRaidDecision,
  resolveRaidFollowup,
  tick,
  verifyNinthLife,
} from '@nine-lives/game-core'

function createState() {
  const state = createFreshState()
  createSquad(state)
  createSquad(state)
  state.squads[0].id = 'alpha'
  state.squads[0].name = 'squad.alpha'
  state.squads[0].autoDispatch = true
  state.squads[1].id = 'bravo'
  state.squads[1].name = 'squad.bravo'
  state.squads[1].style = 'careful'
  state.squads[1].autoDispatch = true
  return state
}

let vite: ViteDevServer

test.before(async () => {
  vite = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' })
})

test.after(async () => {
  await vite.close()
})

async function loadComponent(path: string) {
  return (await vite.ssrLoadModule(path)).default as Component
}

async function render(component: Component, props: Record<string, unknown>) {
  return renderToString(createSSRApp({ render: () => h(component, props) }))
}

const acceptedAction = async () => true

test('active mission rail shows every assigned squad with its full cat roster', async () => {
  const ActiveMissionRail = await loadComponent('/src/components/ActiveMissionRail.vue')
  const state = createState()
  for (const catId of ['pixel', 'rust', 'bastion']) assignCat(state, catId, 'alpha')
  for (const catId of ['marlowe', 'shorokh', 'myata']) assignCat(state, catId, 'bravo')
  const mission = state.missions[0]
  mission.status = 'assigned'
  mission.squadIds = ['alpha', 'bravo']
  state.squads[0].phase = 'outbound'
  state.squads[1].phase = 'outbound'

  const html = await render(ActiveMissionRail, { state, locale: 'ru' })
  assert.match(html, /mission-squad-name[^>]*>Отряд «Альфа»/)
  assert.match(html, /mission-squad-members[^>]*>Пиксель · Ржа · Бастион/)
  assert.match(html, /mission-squad-name[^>]*>Отряд «Браво»/)
  assert.match(html, /mission-squad-members[^>]*>Марлоу · Шорох · Мята/)
})

test('First Shift renders the container choice and its causal summary', async () => {
  const GameOverlays = await loadComponent('/src/components/GameOverlays.vue')
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  state.firstShift.stage = 'container'
  state.firstShift.containerDeadline = 60
  state.firstShift.containerSquadId = 'alpha'

  let html = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 0 })
  assert.match(html, /Контейнер с муниципальной маркировкой/)
  assert.match(html, /Передать Полиции/)
  assert.match(html, /Взять образец/)
  assert.match(html, /Вызвать Монолит/)
  assert.match(html, /Не вмешиваться/)

  assert.equal(resolvePoliceContainer(state, 'independent_sample'), true)
  state.speed = 1
  tick(state, 0.25)
  const mapHtml = await render(OperationsMap, { state, locale: 'ru' })
  assert.match(mapHtml, /Жилое кольцо/)
  assert.match(mapHtml, /Авария в жилом дворе/)
  assert.match(mapHtml, /Фильтры для Южного узла/)

  state.firstShift.stage = 'summary'
  state.firstShift.residentialDutyOutcome = 'completed'
  state.firstShift.southNodeOutcome = 'full'
  state.finalSummaryVisible = true
  html = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 2 })
  assert.match(html, /ПРИЧИННАЯ СВОДКА/)
  assert.match(html, /Первая смена/)
  assert.match(html, /Образец сохранён/)
  assert.match(html, /Сохранённый образец сократил время ремонта/)
  assert.match(html, /Продолжить в песочнице/)
})

test('UI smoke: a prepared operation renders every blocking stage through the final report', async () => {
  const BaseOperations = await loadComponent('/src/components/BaseOperations.vue')
  const GameOverlays = await loadComponent('/src/components/GameOverlays.vue')
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  for (const catId of ['pixel', 'rust', 'bastion']) assignCat(state, catId, 'alpha')
  for (const catId of ['marlowe', 'shorokh', 'myata']) assignCat(state, catId, 'bravo')
  state.squads.find(squad => squad.id === 'bravo')!.autoDispatch = false
  drainEvents(state)

  const achievements = getAchievements(state)
  const baseHtml = await render(BaseOperations, {
    state,
    locale: 'ru',
    panel: 'teams',
    achievements,
    completedAchievementCount: achievements.filter(item => item.completed).length,
    nextAchievement: achievements.find(item => !item.completed),
    hintsVisible: true,
    totalRuns: 0,
    saveStatus: { key: 'save.ready' },
    assignCat: acceptedAction,
    createSquad: acceptedAction,
    disbandSquad: acceptedAction,
    renameSquad: acceptedAction,
    equipItem: acceptedAction,
    setSquadStyle: acceptedAction,
  })
  assert.match(baseHtml, /уборка за/)
  assert.match(baseHtml, /Состав: Пиксель, Ржа, Бастион/)
  assert.match(baseHtml, /class="cat-squad-name">Отряд «Альфа»<\/small>/)
  assert.match(baseHtml, /class="cat-squad-name">Отряд «Браво»<\/small>/)
  assert.match(baseHtml, /Пиксель/)

  state.campaignPhase = 'peace_sandbox'
  state.firstShift.stage = 'complete'
  const raidMission = state.missions[0]
  raidMission.kind = 'municipal'
  raidMission.status = 'assigned'
  raidMission.progress = 14
  raidMission.squadIds = ['alpha']
  raidMission.contributorSquadIds = []
  const alpha = state.squads[0]
  alpha.phase = 'cleanup'
  alpha.missionId = raidMission.id
  alpha.target = { id: raidMission.id, title: raidMission.title, x: raidMission.x, y: raidMission.y, priority: raidMission.priority }
  state.squads[0].completed = 2
  state.completedMissionCount = 2
  state.fame = 30
  state.speed = 10
  for (let step = 0; step < 100 && !state.incident; step++) tick(state, 0.25)
  assert.ok(state.incident)
  state.incident.supportRoll = 1

  let overlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 2 })
  assert.match(overlayHtml, /Подозрительная активность/)
  assert.match(overlayHtml, /Вызвать «Караул-7»/)
  assert.match(overlayHtml, /Укрыться и запросить поддержку/)

  assert.equal(resolveRaidDecision(state, 'support', 'bravo'), true)
  assert.equal(state.speed, 1)
  tick(state, 8)
  overlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 2 })
  assert.match(overlayHtml, /Поддержка прибыла/)

  assert.equal(resolveRaidFollowup(state, 'continue'), true)
  state.campaignPhase = 'post_cataclysm'
  state.speed = 1
  tick(state, 3)
  assert.ok(state.storyIncident)
  assert.equal(dispatchNinthLife(state, 'bravo'), true)
  for (let step = 0; step < 100 && state.storyIncident?.stage !== 'contact'; step++) tick(state, 0.25)
  assert.equal(state.storyIncident?.stage, 'contact')
  overlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 3 })
  assert.match(overlayHtml, /Девятая жизнь/)
  assert.match(overlayHtml, /Укрыть дезертира/)
  assert.match(overlayHtml, /Личность дезертира/)
  assert.match(overlayHtml, /Проверить показания/)
  assert.match(overlayHtml, /Новая игра \/ сброс прогресса/)

  assert.equal(verifyNinthLife(state, 'recon'), true)
  tick(state, 30)
  assert.equal(state.storyIncident?.stage, 'contact')

  const resetOverlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: true, totalRuns: 3 })
  assert.match(resetOverlayHtml, /Начать новую операцию/)
  assert.doesNotMatch(resetOverlayHtml, /Укрыть дезертира/)

  assert.equal(resolveNinthLife(state, 'shelter'), true)
  const trackingMapHtml = await render(OperationsMap, { state, locale: 'ru' })
  assert.match(trackingMapHtml, /Наблюдатель ежей/)
  for (let step = 0; step < 500 && !state.finalSummaryVisible; step++) tick(state, 0.25)
  assert.equal(state.storyAftermath?.status, 'completed')
  overlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 3 })
  assert.match(overlayHtml, /ДЕЛО ЗАКРЫТО/)
  assert.match(overlayHtml, /КОНТАКТ/)
  assert.match(overlayHtml, /ПРОВЕРКА СВЕДЕНИЙ/)
  assert.match(overlayHtml, /ПОВЕДЕНИЕ ОТРЯДА/)
  assert.match(overlayHtml, /ЗНАНИЕ О HQ/)
  assert.match(overlayHtml, /ПОЛИТИЧЕСКИЙ ИТОГ/)
  assert.match(overlayHtml, /Продолжить в песочнице/)
})

test('completed mission disappears while its squad route continues from the squad to base', async () => {
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  const mission = state.missions[0]
  state.missions = [mission]
  mission.status = 'completed'
  mission.squadIds = ['alpha']
  mission.contributorSquadIds = ['alpha']

  const squad = state.squads[0]
  squad.members = ['pixel']
  squad.phase = 'returning'
  squad.missionId = mission.id
  squad.target = { id: mission.id, title: mission.title, x: mission.x, y: mission.y, priority: mission.priority }
  squad.routeFrom = { x: mission.x, y: mission.y }
  squad.travel = 0
  squad.travelDuration = 10

  const html = await render(OperationsMap, { state, locale: 'ru' })
  assert.doesNotMatch(html, /cleanup-pin/)
  assert.match(html, new RegExp(`<polyline[^>]*points="${mission.x},${mission.y} 46,51"`))
  assert.match(html, new RegExp(`class="[^"]*squad-formation"[^>]*style="left:${mission.x}%;top:${mission.y}%`))

  mission.status = 'assigned'
  const legacyHtml = await render(OperationsMap, { state, locale: 'ru' })
  assert.doesNotMatch(legacyHtml, /cleanup-pin/)
})

test('an idle field squad draws its return route without a mission target', async () => {
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  const squad = state.squads[0]
  squad.members = ['pixel']
  squad.phase = 'returning'
  squad.target = undefined
  squad.routeFrom = { x: 30, y: 35 }
  squad.travel = 0
  squad.travelDuration = 10

  const html = await render(OperationsMap, { state, locale: 'ru' })

  assert.match(html, /<polyline[^>]*points="30,35 46,51"/)
})

test('queued equipment remains visible in its orange slot without extra status text', async () => {
  const BaseOperations = await loadComponent('/src/components/BaseOperations.vue')
  const state = createState()
  assignCat(state, 'pixel', 'alpha')
  assert.equal(equipItem(state, 'pixel', 'hands', 'toolkit'), true)
  state.squads[0].phase = 'cleanup'
  state.speed = 10
  assert.equal(equipItem(state, 'pixel', 'belt', 'medkit'), true)

  const achievements = getAchievements(state)
  const html = await render(BaseOperations, {
    state,
    locale: 'ru',
    panel: 'teams',
    achievements,
    completedAchievementCount: achievements.filter(item => item.completed).length,
    nextAchievement: achievements.find(item => !item.completed),
    hintsVisible: true,
    totalRuns: 0,
    saveStatus: { key: 'save.ready' },
    assignCat: acceptedAction,
    createSquad: acceptedAction,
    disbandSquad: acceptedAction,
    renameSquad: acceptedAction,
    equipItem: acceptedAction,
    setSquadStyle: acceptedAction,
  })

  assert.equal(html.match(/<label class="pending">/g)?.length, 1)
  assert.match(html, /<label class="pending"><span>Пояс<\/span><select value="medkit">.*?<option value="medkit">Аптечка/s)
  assert.match(html, /<label class=""><span>Руки<\/span><select value="toolkit">.*?<option value="toolkit">Инструментальный набор/s)
  assert.doesNotMatch(html, /Оснащение запланировано|после возвращения/)
  assert.equal(state.speed, 10)
})

test('queued reassignment from a field squad is marked pending in the roster', async () => {
  const BaseOperations = await loadComponent('/src/components/BaseOperations.vue')
  const state = createState()
  createSquad(state)
  state.squads[2].id = 'echo'
  state.squads[2].name = 'squad.echo'
  assignCat(state, 'rust', 'alpha')
  state.squads[0].phase = 'cleanup'

  assert.equal(assignCat(state, 'rust', 'echo'), true)
  assert.equal(state.cats.find(cat => cat.id === 'rust')?.pendingAssignment, 'echo')

  const achievements = getAchievements(state)
  const html = await render(BaseOperations, {
    state,
    locale: 'ru',
    panel: 'teams',
    achievements,
    completedAchievementCount: achievements.filter(item => item.completed).length,
    nextAchievement: achievements.find(item => !item.completed),
    hintsVisible: true,
    totalRuns: 0,
    saveStatus: { key: 'save.ready' },
    assignCat: acceptedAction,
    createSquad: acceptedAction,
    disbandSquad: acceptedAction,
    renameSquad: acceptedAction,
    equipItem: acceptedAction,
    setSquadStyle: acceptedAction,
  })

  assert.match(html, /<select class="pending"[^>]*>.*?<option value="echo" selected>Отряд «Эхо»<\/option>/s)
})

test('a manual field squad shows its waiting state only in the command list', async () => {
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  const squad = state.squads[0]
  squad.members = ['pixel']
  squad.autoDispatch = false
  squad.phase = 'field'
  squad.routeFrom = { x: 30, y: 35 }

  const html = await render(OperationsMap, { state, locale: 'ru' })

  assert.equal(html.match(/В поле \/ ожидает приказа/g)?.length, 1)
  assert.doesNotMatch(html, /squad-callout/)
  assert.match(html, /ОТРЯДЫ/)
  assert.match(html, /СВОБОДЕН/)
  assert.match(html, /class="available"/)
  assert.match(html, /бодрость 92%/)
  assert.match(html, /class="squad-member-names">Пиксель<\/small>/)
  assert.match(html, /left:30%;top:35%/)
})

test('the command list summarizes long squad rosters', async () => {
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  state.squads[0].members = ['marlowe', 'pixel', 'rust', 'shorokh', 'bastion']

  const html = await render(OperationsMap, { state, locale: 'ru' })
  assert.match(html, /class="squad-member-names">Марлоу · Пиксель · Ржа \+2<\/small>/)
})

test('forming squads does not automatically expand the first squad', async () => {
  const BaseOperations = await loadComponent('/src/components/BaseOperations.vue')
  const state = createState()
  const achievements = getAchievements(state)
  const html = await render(BaseOperations, {
    state,
    locale: 'ru',
    panel: 'teams',
    achievements,
    completedAchievementCount: 0,
    hintsVisible: true,
    totalRuns: 0,
    saveStatus: { key: 'save.ready' },
    assignCat: acceptedAction,
    createSquad: acceptedAction,
    disbandSquad: acceptedAction,
    renameSquad: acceptedAction,
    equipItem: acceptedAction,
    setSquadStyle: acceptedAction,
  })
  assert.doesNotMatch(html, /squad-config-details/)
  assert.doesNotMatch(html, /class="disband-squad"/)
  assert.equal(html.match(/<strong>\+<\/strong>/g)?.length, state.squads.length)
})

test('an arbitrary march renders its route and destination status', async () => {
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  const squad = state.squads[0]
  squad.autoDispatch = false
  squad.members = ['pixel']
  squad.phase = 'moving'
  squad.routeFrom = { x: 20, y: 20 }
  squad.destination = { x: 70, y: 60 }
  squad.travel = 5
  squad.travelDuration = 10

  const html = await render(OperationsMap, { state, locale: 'ru' })
  assert.match(html, /<polyline[^>]*points="45,40 70,60"/)
  assert.match(html, /Следует к точке · 5 с/)
})

test('a tired squad highlights energy instead of repeating a text reason', async () => {
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  const squad = state.squads[0]
  squad.autoDispatch = false
  squad.members = ['pixel']
  state.cats.find(cat => cat.id === 'pixel')!.energy = 13

  const html = await render(OperationsMap, { state, locale: 'ru' })
  assert.match(html, /class="[^"]*tired[^"]*squad-energy[^"]*">бодрость 13%/)
  assert.match(html, /На базе \/ отдыхает/)
  assert.doesNotMatch(html, /На базе \/ ожидает назначения/)
  assert.doesNotMatch(html, /Не все коты готовы принять приказ/)
})
