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

  const movementTransition = await formation.evaluate(element => {
    const style = getComputedStyle(element)
    return { properties: style.transitionProperty, durations: style.transitionDuration }
  })
  expect(movementTransition.properties).toContain('left')
  expect(movementTransition.properties).toContain('top')
  expect(movementTransition.durations).toContain('0.25s')

  await formation.locator('.field-cat-marker[data-cat-id="pixel"]').click()
  await expect(formation).toHaveClass(/selected/)
  await expect(members).toHaveCount(3)

  const animationName = await members.first().evaluate(element => getComputedStyle(element.querySelector('svg')!).animationName)
  expect(animationName).toBe('field-cat-march')
})

test('a selection box touching one field cat selects its whole squad once', async ({ page }) => {
  await page.goto('/')
  await formSquadAtPoint(page, ['Марлоу', 'Пиксель', 'Ржа'], 78, 76)
  await waitForSquadPhase(page, 'squad-1', ['moving', 'field'])

  const member = page.locator('.squad-formation.squad-1 .field-cat-marker').first()
  const bounds = await member.boundingBox()
  if (!bounds) throw new Error('Field cat has no bounds')

  await page.mouse.move(bounds.x - 5, bounds.y - 5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 8, bounds.y + 8)
  await page.mouse.up()

  const formation = page.locator('.squad-formation.squad-1')
  await expect(formation).toHaveClass(/selected/)
  await expect(page.locator('.map-squad-list > button.selected')).toHaveCount(1)
})

test('equal squads at one mission keep separate colored formations and support mass selection', async ({ page }) => {
  await page.goto('/')
  await formSquadOnMission(page, ['Марлоу', 'Пиксель', 'Ржа'])
  await selectBaseCats(page, ['Шорох', 'Бастион', 'Мята'])
  await page.locator('.cleanup-pin.assigned').click()
  await expect.poll(() => readWorld(page, state => state.squads.length)).toBe(2)

  const formations = page.locator('.squad-formation')
  await expect(formations).toHaveCount(2)
  await expect(page.locator('.field-cat-marker')).toHaveCount(6)

  const footprints = await formations.evaluateAll(elements => elements.map(element => {
    const rectangles = [...element.querySelectorAll('.field-cat-marker')].map(member => member.getBoundingClientRect())
    return {
      left: Math.min(...rectangles.map(rectangle => rectangle.left)),
      right: Math.max(...rectangles.map(rectangle => rectangle.right)),
      top: Math.min(...rectangles.map(rectangle => rectangle.top)),
      bottom: Math.max(...rectangles.map(rectangle => rectangle.bottom)),
      color: getComputedStyle(element).getPropertyValue('--squad-color'),
    }
  }))
  expect(footprints[0].right <= footprints[1].left || footprints[1].right <= footprints[0].left
    || footprints[0].bottom <= footprints[1].top || footprints[1].bottom <= footprints[0].top).toBe(true)
  expect(footprints[0].color).not.toBe(footprints[1].color)

  await formations.nth(0).locator('.field-cat-marker').first().click()
  await formations.nth(1).locator('.field-cat-marker').first().click({ modifiers: ['Shift'] })
  await expect(page.locator('.squad-formation.selected')).toHaveCount(2)
})
