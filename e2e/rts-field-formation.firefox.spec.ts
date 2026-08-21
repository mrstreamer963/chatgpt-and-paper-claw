import { expect, test } from '@playwright/test'
import { formSquadAtPoint, formSquadOnMission, readWorld, selectBaseCats, waitForSquadPhase } from './rts-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('field cats render separately but select and move as one squad', async ({ page }) => {
  await page.goto('/')
  await formSquadAtPoint(page, ['Марлоу', 'Пиксель', 'Ржа'], 82, 78)
  await waitForSquadPhase(page, 'squad-1', ['moving'])

  const formation = page.locator('.squad-formation.squad-1')
  const members = formation.locator('.field-cat-marker')
  await expect(formation).toHaveCount(1)
  await expect(members).toHaveCount(3)
  await expect.poll(async () => members.evaluateAll(elements => elements.map(element => element.getAttribute('data-cat-id')).sort())).toEqual(['marlowe', 'pixel', 'rust'])
  const memberCenters = await members.evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect()
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  }))
  expect(new Set(memberCenters.map(({ x, y }) => `${x}:${y}`)).size).toBe(1)

  await members.last().click()
  await expect(formation).toHaveClass(/selected/)
  await expect(members).toHaveCount(3)

  const animationName = await members.first().evaluate(element => getComputedStyle(element.querySelector('svg')!).animationName)
  expect(animationName).toBe('none')
  await expect(page.locator('.squad-marker-origin')).toHaveCount(1)
})

test('a selection box touching one field cat selects its whole squad once', async ({ page }) => {
  await page.goto('/')
  await formSquadAtPoint(page, ['Марлоу', 'Пиксель', 'Ржа'], 78, 76)
  await waitForSquadPhase(page, 'squad-1', ['moving', 'field'])

  const member = page.locator('.squad-formation.squad-1 .field-cat-marker').first()
  const bounds = await member.boundingBox()
  if (!bounds) throw new Error('Field cat has no bounds')

  await page.mouse.move(bounds.x - 30, bounds.y - 30)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width + 30, bounds.y + bounds.height + 30)
  await page.mouse.up()

  const formation = page.locator('.squad-formation.squad-1')
  await expect(formation).toHaveClass(/selected/)
  await expect(page.locator('.map-squad-list > button.selected')).toHaveCount(1)
})

test('equal squads at one mission overlap at their physical point and support mass selection', async ({ page }) => {
  await page.goto('/')
  await formSquadOnMission(page, ['Марлоу', 'Пиксель', 'Ржа'])
  await selectBaseCats(page, ['Шорох', 'Бастион', 'Мята'])
  await page.locator('.cleanup-pin.assigned').click()
  await expect.poll(() => readWorld(page, state => state.squads.length)).toBe(2)

  const formations = page.locator('.squad-formation')
  await expect(formations).toHaveCount(2)
  await expect(page.locator('.field-cat-marker')).toHaveCount(6)

  const centers = await formations.evaluateAll(elements => elements.map(element => {
    const bounds = element.querySelector('.field-cat-marker')!.getBoundingClientRect()
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  }))
  expect(centers[0]).toEqual(centers[1])

  await formations.nth(0).locator('.field-cat-marker').first().dispatchEvent('click')
  await formations.nth(1).locator('.field-cat-marker').last().dispatchEvent('click', { shiftKey: true })
  await expect(page.locator('.squad-formation.selected')).toHaveCount(2)
  await expect(page.locator('.squad-marker-origin')).toHaveCount(2)
})
