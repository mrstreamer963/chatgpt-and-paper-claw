import { expect, type Page } from '@playwright/test'

export async function selectBaseCats(page: Page, names: string[]) {
  await page.getByRole('button', { name: 'База', exact: true }).click()
  const previousCount = await readWorld(page, state => state.squads.length) ?? 0
  await page.getByRole('button', { name: 'Сформировать отряд', exact: true }).click()
  await expect.poll(() => readWorld(page, state => state.squads.length)).toBe(previousCount + 1)
  await expect(page.locator('.squad-config')).toHaveCount(previousCount + 1)
  const squad = await readWorld(page, state => state.squads.at(-1))
  if (!squad) throw new Error('Squad was not created at base')
  const squadConfig = page.locator('.squad-config').last()
  const autoDispatch = squadConfig.locator('.auto-dispatch-toggle input')
  if (!await autoDispatch.isVisible()) await squadConfig.locator('.squad-config-summary').click()
  await expect(autoDispatch).toBeVisible()
  if (await autoDispatch.isChecked()) await autoDispatch.uncheck()
  for (const name of names) {
    const card = page.locator('.cat-card').filter({ hasText: name })
    await card.getByText('Досье и экипировка').click()
    await card.getByRole('combobox', { name: 'Назначение в отряд' }).selectOption(squad.id)
  }
  const squadIndex = await readWorld(page, state => state.squads.findIndex((candidate: any) => candidate.id === squad.id))
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await page.locator('.map-squad-list > button').nth(squadIndex ?? -1).click()
}

export async function orderSelectedToPoint(page: Page, x = 72, y = 72) {
  const map = page.locator('.map-grid')
  const bounds = await map.boundingBox()
  if (!bounds) throw new Error('Map has no bounds')
  await page.mouse.click(bounds.x + bounds.width * x / 100, bounds.y + bounds.height * y / 100)
}

export async function formSquadAtPoint(page: Page, names: string[], x = 52, y = 58) {
  await selectBaseCats(page, names)
  await orderSelectedToPoint(page, x, y)
  await expect.poll(() => readWorld(page, state => state.squads.length)).toBeGreaterThan(0)
}

export async function formSquadOnMission(page: Page, names: string[]) {
  await selectBaseCats(page, names)
  await page.locator('.cleanup-pin').first().click()
  await expect.poll(() => readWorld(page, state => state.squads.length)).toBeGreaterThan(0)
}

export async function readWorld<T>(page: Page, select: (state: any) => T): Promise<T | null> {
  const state = await page.evaluate(() => {
    const payload = window.localStorage.getItem('nine-lives-corp-autosave-v1')
    if (!payload) return null
    return JSON.parse(payload).state
  })
  return state ? select(state) : null
}

export async function waitForSquadPhase(page: Page, squadId: string, phases: string[]) {
  await expect.poll(async () => {
    const phase = await readWorld(page, state => state.squads.find((squad: any) => squad.id === squadId)?.phase)
    return typeof phase === 'string' && phases.includes(phase)
  }).toBe(true)
}
