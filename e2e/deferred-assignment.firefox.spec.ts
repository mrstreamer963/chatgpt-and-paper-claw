import { expect, test } from '@playwright/test'
import { orderSelectedToPoint, readWorld } from './rts-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('click, Shift, Escape and drag rectangle control RTS selection', async ({ page }) => {
  await page.goto('/')
  const pixel = page.getByRole('button', { name: 'Пиксель', exact: true })
  const rust = page.getByRole('button', { name: 'Ржа', exact: true })

  await pixel.click()
  await rust.click({ modifiers: ['Shift'] })
  await expect(page.locator('.base-cat-marker.selected')).toHaveCount(2)
  await page.keyboard.press('Escape')
  await expect(page.locator('.base-cat-marker.selected')).toHaveCount(0)

  const tokenBounds = await page.locator('.base-cat-marker').evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect()
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }
  }))
  const selectionBounds = {
    left: Math.min(...tokenBounds.map(bounds => bounds.left)) - 12,
    right: Math.max(...tokenBounds.map(bounds => bounds.right)) + 12,
    top: Math.min(...tokenBounds.map(bounds => bounds.top)) - 12,
    bottom: Math.max(...tokenBounds.map(bounds => bounds.bottom)) + 12,
  }
  await page.mouse.move(selectionBounds.left, selectionBounds.top)
  await page.mouse.down()
  await page.mouse.move(selectionBounds.right, selectionBounds.bottom)
  await page.mouse.up()
  await expect(page.locator('.base-cat-marker.selected')).toHaveCount(6)

  await page.getByRole('button', { name: 'Мята', exact: true }).click({ modifiers: ['Shift'] })
  await expect(page.locator('.base-cat-marker.selected')).toHaveCount(5)
  await page.locator('.cleanup-pin').first().click()

  await expect.poll(() => readWorld(page, state => ({
    squads: state.squads.length,
    members: state.squads[0]?.members.length,
    assigned: state.missions.find((mission: any) => mission.status === 'assigned')?.squadIds,
  }))).toEqual({ squads: 1, members: 5, assigned: ['squad-1'] })
})

test('a mass order skips an injured base cat and keeps it selected with an explanation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^×1,/ }).click()
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('nine-lives-corp-autosave-v1')))
    .not.toBeNull()
  const payload = await page.evaluate(() => window.localStorage.getItem('nine-lives-corp-autosave-v1'))
  const save = JSON.parse(payload!)
  save.state.speed = 0
  save.state.cats.find((cat: { id: string }) => cat.id === 'myata').injuredRemaining = 30

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await page.getByRole('button', { name: 'Достижения', exact: true }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'injured-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  })
  await page.getByRole('button', { name: 'Карта', exact: true }).click()

  await page.getByRole('button', { name: 'Пиксель', exact: true }).click()
  await page.getByRole('button', { name: 'Мята', exact: true }).click({ modifiers: ['Shift'] })
  await orderSelectedToPoint(page)

  await expect.poll(() => readWorld(page, state => state.squads[0]?.members)).toEqual(['pixel'])
  await expect(page.getByRole('button', { name: 'Мята', exact: true })).toHaveClass(/selected/)
  await expect(page.locator('.command-hint')).toContainText('В составе есть раненый кот')
})
