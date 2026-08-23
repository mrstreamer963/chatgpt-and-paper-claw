import { expect, test } from '@playwright/test'
import { readWorld } from './rts-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('the base can queue a field cat transfer between any squads', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()
  await page.getByRole('button', { name: 'Сформировать отряд', exact: true }).click()
  await page.getByRole('button', { name: 'Сформировать отряд', exact: true }).click()

  const pixelCard = page.locator('.cat-card').filter({ hasText: 'Пиксель' })
  const rustCard = page.locator('.cat-card').filter({ hasText: 'Ржа' })
  await pixelCard.getByText('Досье и экипировка').click()
  await rustCard.getByText('Досье и экипировка').click()
  const pixelAssignment = pixelCard.getByRole('combobox', { name: 'Назначение в отряд' })
  const rustAssignment = rustCard.getByRole('combobox', { name: 'Назначение в отряд' })
  await pixelAssignment.selectOption('squad-1')
  await rustAssignment.selectOption('squad-2')

  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await page.getByRole('button', { name: /^×1,/ }).click()
  await expect.poll(() => readWorld(page, state => state.squads.some((squad: any) => squad.phase !== 'base'))).toBe(true)

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await pixelCard.getByText('Досье и экипировка').click()
  await pixelAssignment.selectOption('squad-2')

  await expect(pixelAssignment).toHaveClass(/pending/)
  await expect.poll(() => readWorld(page, state => {
    const pixel = state.cats.find((cat: any) => cat.id === 'pixel')
    return { assignedTo: pixel?.assignedTo, pendingAssignment: pixel?.pendingAssignment }
  })).toEqual({ assignedTo: 'squad-1', pendingAssignment: 'squad-2' })
})

test('a queued field transfer can be canceled from the base', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()
  await page.getByRole('button', { name: 'Сформировать отряд', exact: true }).click()
  await page.getByRole('button', { name: 'Сформировать отряд', exact: true }).click()

  const pixelCard = page.locator('.cat-card').filter({ hasText: 'Пиксель' })
  await pixelCard.getByText('Досье и экипировка').click()
  const pixelAssignment = pixelCard.getByRole('combobox', { name: 'Назначение в отряд' })
  await pixelAssignment.selectOption('squad-1')
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await page.getByRole('button', { name: /^×1,/ }).click()
  await expect.poll(() => readWorld(page, state => state.squads[0]?.phase)).not.toBe('base')

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await pixelCard.getByText('Досье и экипировка').click()
  await pixelAssignment.selectOption('squad-2')
  await expect(pixelAssignment).toHaveClass(/pending/)
  await pixelAssignment.selectOption('squad-1')
  await expect(pixelAssignment).not.toHaveClass(/pending/)
  await expect.poll(() => readWorld(page, state => state.cats.find((cat: any) => cat.id === 'pixel')?.pendingAssignment)).toBeUndefined()
})
