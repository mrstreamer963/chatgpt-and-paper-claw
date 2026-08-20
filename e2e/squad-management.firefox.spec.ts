import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('the player forms and disbands an empty squad from the compact roster', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()

  await expect(page.getByText('Отряды: 2/6', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Сформировать отряд/ }).click()

  await expect(page.getByText('Отряды: 3/6', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Отряд «Чарли»/ })).toBeVisible()
  const pixelAssignment = page.locator('.cat-card').filter({ hasText: 'Пиксель' }).getByLabel('Назначение в отряд')
  await expect(pixelAssignment.locator('option[value="squad-3"]')).toHaveText('Отряд «Чарли»')

  await page.getByRole('button', { name: 'Расформировать отряд', exact: true }).click()
  await expect(page.getByText('Отряды: 2/6', { exact: true })).toBeVisible()
  await expect(pixelAssignment.locator('option[value="squad-3"]')).toHaveCount(0)
})

test('a renamed squad keeps its custom name on deployment and across locales', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()

  await page.getByRole('button', { name: 'Переименовать отряд' }).first().click()
  const nameInput = page.getByRole('textbox', { name: 'Название отряда' })
  await nameInput.fill('  Ночные фонари  ')
  await nameInput.press('Enter')
  await expect(page.getByRole('button', { name: /Ночные фонари/ })).toBeVisible()

  await page.locator('.cat-card').filter({ hasText: 'Пиксель' }).getByLabel('Назначение в отряд').selectOption('alpha')
  await page.getByRole('button', { name: /^×1,/ }).click()
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await expect(page.locator('.squad-marker.alpha')).toContainText('Ночные фонари')

  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.locator('.squad-marker.alpha')).toContainText('Ночные фонари')
  await expect.poll(async () => page.evaluate(() => {
    const payload = window.localStorage.getItem('nine-lives-corp-autosave-v1')
    return payload ? JSON.parse(payload).state.squads[0].customName : null
  })).toBe('Ночные фонари')
})
