import { expect, test } from '@playwright/test'
import { formSquadAtPoint, readWorld, waitForSquadPhase } from './rts-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('a field squad cannot split or merge', async ({ page }) => {
  await page.goto('/')
  await formSquadAtPoint(page, ['Марлоу', 'Пиксель'])
  await waitForSquadPhase(page, 'squad-1', ['moving', 'field'])

  await page.locator('.squad-formation.squad-1 .field-cat-marker').first().click()
  await expect(page.getByRole('button', { name: 'Разделить отряд', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Объединить', exact: true })).toHaveCount(0)
  await expect.poll(() => readWorld(page, state => state.squads.map((squad: any) => ({ id: squad.id, members: squad.members })))).toEqual([
    { id: 'squad-1', members: ['marlowe', 'pixel'] },
  ])
})
