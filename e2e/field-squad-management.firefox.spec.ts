import { expect, test } from '@playwright/test'
import { formSquadAtPoint, readWorld, waitForSquadPhase } from './rts-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('a dynamically formed field squad can split and merge again', async ({ page }) => {
  await page.goto('/')
  await formSquadAtPoint(page, ['Марлоу', 'Пиксель'])
  await waitForSquadPhase(page, 'squad-1', ['moving', 'field'])

  await page.locator('.squad-formation.squad-1 .field-cat-marker').first().click()
  await page.getByRole('button', { name: 'Разделить отряд', exact: true }).click()
  await page.getByRole('button', { name: 'Сформировать новый отряд', exact: true }).click()

  await expect.poll(() => readWorld(page, state => state.squads.map((squad: any) => ({
    id: squad.id,
    members: squad.members.length,
    autoDispatch: squad.autoDispatch,
  })))).toEqual([
    { id: 'squad-1', members: 1, autoDispatch: false },
    { id: 'squad-2', members: 1, autoDispatch: false },
  ])

  await page.locator('.squad-formation.squad-2 .field-cat-marker').first().click()
  await page.getByRole('button', { name: 'Объединить', exact: true }).click()
  await page.locator('.squad-formation.squad-1 .field-cat-marker').first().click()
  await page.getByRole('button', { name: /^×1,/ }).click()

  await expect.poll(() => readWorld(page, state => state.squads.map((squad: any) => ({
    id: squad.id,
    members: squad.members.length,
  })))).toEqual([{ id: 'squad-1', members: 2 }])
})
