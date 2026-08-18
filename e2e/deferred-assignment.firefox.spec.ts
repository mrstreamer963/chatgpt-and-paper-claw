import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('field cat transfer is queued and applied after the current squad returns', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()

  const pixelCard = page.locator('.cat-card').filter({ hasText: 'Пиксель' })
  const assignment = pixelCard.getByLabel('Назначение в отряд')
  await assignment.selectOption('alpha')

  await page.getByRole('button', { name: /^×1,/ }).click()
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await expect(page.locator('.squad-marker.alpha small')).toContainText(/Выезд|Уборка/)
  await page.getByRole('button', { name: /^Ⅱ/ }).click()

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await expect(assignment).toBeEnabled()
  await assignment.selectOption('bravo')
  await assignment.blur()
  await expect.poll(async () => page.evaluate(() => {
    const payload = window.localStorage.getItem('nine-lives-corp-autosave-v1')
    if (!payload) return null
    const state = JSON.parse(payload).state
    const pixel = state.cats.find((cat: { id: string }) => cat.id === 'pixel')
    const alpha = state.squads.find((squad: { id: string }) => squad.id === 'alpha')
    return { assignedTo: pixel.assignedTo, pendingAssignment: pixel.pendingAssignment, phase: alpha.phase }
  })).toEqual({ assignedTo: 'alpha', pendingAssignment: 'bravo', phase: 'outbound' })
  await expect(assignment).toHaveClass(/pending/)
  await expect(assignment).toHaveValue('bravo')

  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  const operationLog = page.locator('.map-view aside')
  await expect(operationLog).toContainText('Пиксель будет назначен в Отряд «Браво»')
  await page.getByRole('button', { name: /×10/ }).click()
  await expect(operationLog).toContainText('Пиксель назначен в Отряд «Браво»')

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await expect(assignment).not.toHaveClass(/pending/)
  await expect(assignment).toHaveValue('bravo')
})
