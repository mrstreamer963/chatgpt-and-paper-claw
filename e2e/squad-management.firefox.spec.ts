import { expect, test } from '@playwright/test'

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

