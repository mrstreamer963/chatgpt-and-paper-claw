import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('a field squad can split and merge again through the map controls', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()

  for (const catName of ['Марлоу', 'Пиксель']) {
    await page.locator('.cat-card').filter({ hasText: catName }).getByLabel('Назначение в отряд').selectOption('alpha')
  }

  await page.getByRole('button', { name: /^×1,/ }).click()
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await expect(page.locator('.squad-marker.alpha')).toBeVisible()
  await page.getByRole('button', { name: /^Ⅱ/ }).click()

  const squadList = page.locator('.map-squad-list')
  await squadList.getByRole('button').filter({ hasText: 'Отряд «Альфа»' }).click()
  await page.getByRole('button', { name: 'Разделить отряд', exact: true }).click()
  await page.getByRole('button', { name: 'Сформировать новый отряд', exact: true }).click()

  await expect.poll(async () => page.evaluate(() => {
    const payload = window.localStorage.getItem('nine-lives-corp-autosave-v1')
    if (!payload) return null
    const state = JSON.parse(payload).state
    return state.squads.map((squad: { name: string; members: string[]; autoDispatch: boolean }) => ({
      name: squad.name,
      members: squad.members.length,
      autoDispatch: squad.autoDispatch,
    }))
  })).toEqual([
    { name: 'squad.alpha', members: 1, autoDispatch: true },
    { name: 'squad.bravo', members: 0, autoDispatch: true },
    { name: 'squad.charlie', members: 1, autoDispatch: false },
  ])

  await squadList.getByRole('button').filter({ hasText: 'Отряд «Чарли»' }).click()
  await squadList.getByRole('button').filter({ hasText: 'Отряд «Альфа»' }).click()
  await page.getByRole('button', { name: /^×1,/ }).click()

  await expect.poll(async () => page.evaluate(() => {
    const payload = window.localStorage.getItem('nine-lives-corp-autosave-v1')
    if (!payload) return null
    const state = JSON.parse(payload).state
    return state.squads.map((squad: { name: string; members: string[] }) => ({ name: squad.name, members: squad.members.length }))
  })).toEqual([
    { name: 'squad.alpha', members: 2 },
    { name: 'squad.bravo', members: 0 },
  ])
})
