import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer, type ViteDevServer } from 'vite'
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  assignCat,
  createState,
  drainEvents,
  getAchievements,
  resolveNinthLife,
  resolveRaidDecision,
  resolveRaidFollowup,
  tick,
} from './core/simulation.ts'

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

test('UI smoke: a prepared operation renders every blocking stage through the final report', async () => {
  const BaseOperations = await loadComponent('/src/components/BaseOperations.vue')
  const GameOverlays = await loadComponent('/src/components/GameOverlays.vue')
  const state = createState()
  for (const catId of ['pixel', 'rust', 'bastion']) assignCat(state, catId, 'alpha')
  for (const catId of ['marlowe', 'shorokh', 'myata']) assignCat(state, catId, 'bravo')
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
  })
  assert.match(baseHtml, /уборка за/)
  assert.match(baseHtml, /Расчёт производительности/)
  assert.match(baseHtml, /Пиксель/)

  state.squads[0].completed = 2
  state.fame = 30
  state.speed = 10
  for (let step = 0; step < 100 && !state.incident; step++) tick(state, 0.25)
  assert.ok(state.incident)
  state.incident.supportRoll = 1

  let overlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 2 })
  assert.match(overlayHtml, /Встреча с рейдерами/)
  assert.match(overlayHtml, /Укрыться и запросить поддержку/)

  assert.equal(resolveRaidDecision(state, 'support'), true)
  assert.equal(state.speed, 1)
  tick(state, 8)
  overlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 2 })
  assert.match(overlayHtml, /Поддержка прибыла/)

  assert.equal(resolveRaidFollowup(state, 'continue'), true)
  state.speed = 1
  tick(state, 3)
  assert.ok(state.storyIncident)
  overlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 3 })
  assert.match(overlayHtml, /Девятая жизнь/)
  assert.match(overlayHtml, /Укрыть дезертира/)
  assert.match(overlayHtml, /Новая игра \/ сброс прогресса/)
  const resetOverlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: true, totalRuns: 3 })
  assert.match(resetOverlayHtml, /Начать новую операцию/)
  assert.doesNotMatch(resetOverlayHtml, /Укрыть дезертира/)

  assert.equal(resolveNinthLife(state, 'shelter'), true)
  overlayHtml = await render(GameOverlays, { state, locale: 'ru', newGameConfirmOpen: false, totalRuns: 3 })
  assert.match(overlayHtml, /ДЕЛО ЗАКРЫТО/)
  assert.match(overlayHtml, /Продолжить в песочнице/)
})

test('completed mission disappears while its squad route continues from the squad to base', async () => {
  const OperationsMap = await loadComponent('/src/components/OperationsMap.vue')
  const state = createState()
  const mission = state.missions[0]
  state.missions = [mission]
  mission.status = 'completed'
  mission.squadId = 'alpha'

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
  assert.match(html, new RegExp(`<line[^>]*x1="${mission.x}"[^>]*y1="${mission.y}"[^>]*x2="46"[^>]*y2="51"`))

  mission.status = 'assigned'
  const legacyHtml = await render(OperationsMap, { state, locale: 'ru' })
  assert.doesNotMatch(legacyHtml, /cleanup-pin/)
})
