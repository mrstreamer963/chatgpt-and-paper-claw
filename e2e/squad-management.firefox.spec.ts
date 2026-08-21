import { expect, test } from '@playwright/test'
import { formSquadAtPoint, readWorld, selectBaseCats, waitForSquadPhase } from './rts-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('the first map order forms a persistent squad and the same composition reuses its id', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.base-cat-marker')).toHaveCount(6)
  await expect(page.locator('.squad-marker')).toHaveCount(0)

  await formSquadAtPoint(page, ['Пиксель', 'Ржа'])
  await expect.poll(() => readWorld(page, state => state.squads.map((squad: any) => ({
    id: squad.id,
    members: squad.members,
    style: squad.style,
    autoDispatch: squad.autoDispatch,
  })))).toEqual([{ id: 'squad-1', members: ['pixel', 'rust'], style: 'balanced', autoDispatch: false }])

  await waitForSquadPhase(page, 'squad-1', ['moving', 'field'])
  await page.locator('.squad-marker.squad-1').click()
  await page.locator('.base-pin').click()
  await page.getByRole('button', { name: /×10/ }).click()
  await waitForSquadPhase(page, 'squad-1', ['base'])
  await page.getByRole('button', { name: /^Ⅱ/ }).click()

  await selectBaseCats(page, ['Пиксель', 'Ржа'])
  await page.locator('.cleanup-pin').first().click()
  await expect.poll(() => readWorld(page, state => state.squads.map((squad: any) => squad.id))).toEqual(['squad-1'])
})

test('a dynamically formed squad keeps its custom name across deployment and locales', async ({ page }) => {
  await page.goto('/')
  await formSquadAtPoint(page, ['Пиксель'])
  await page.getByRole('button', { name: 'База', exact: true }).click()

  await page.getByRole('button', { name: 'Переименовать отряд' }).click()
  const nameInput = page.getByRole('textbox', { name: 'Название отряда' })
  await nameInput.fill('  Ночные фонари  ')
  await nameInput.press('Enter')
  await expect(page.getByRole('button', { name: /Ночные фонари/ })).toBeVisible()

  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await expect(page.locator('.squad-marker.squad-1')).toContainText('Ночные фонари')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.locator('.squad-marker.squad-1')).toContainText('Ночные фонари')
  await expect.poll(() => readWorld(page, state => state.squads[0]?.customName)).toBe('Ночные фонари')
})
