import { expect, type Page } from '@playwright/test'

export async function selectBaseCats(page: Page, names: string[]) {
  for (const [index, name] of names.entries()) {
    await page.getByRole('button', { name, exact: true }).click(index ? { modifiers: ['Shift'] } : undefined)
  }
}

export async function orderSelectedToPoint(page: Page, x = 72, y = 72) {
  const map = page.locator('.map-grid')
  const bounds = await map.boundingBox()
  if (!bounds) throw new Error('Map has no bounds')
  await page.mouse.click(bounds.x + bounds.width * x / 100, bounds.y + bounds.height * y / 100)
}

export async function formSquadAtPoint(page: Page, names: string[], x = 72, y = 72) {
  await selectBaseCats(page, names)
  await orderSelectedToPoint(page, x, y)
  await expect.poll(() => readWorld(page, state => state.squads.length)).toBeGreaterThan(0)
}

export async function formSquadOnMission(page: Page, names: string[]) {
  await selectBaseCats(page, names)
  await page.locator('.cleanup-pin').first().click()
  await expect.poll(() => readWorld(page, state => state.squads.length)).toBeGreaterThan(0)
}

export async function readWorld<T>(page: Page, select: (state: any) => T): Promise<T | null> {
  const state = await page.evaluate(() => {
    const payload = window.localStorage.getItem('nine-lives-corp-autosave-v1')
    if (!payload) return null
    return JSON.parse(payload).state
  })
  return state ? select(state) : null
}

export async function waitForSquadPhase(page: Page, squadId: string, phases: string[]) {
  await expect.poll(async () => {
    const phase = await readWorld(page, state => state.squads.find((squad: any) => squad.id === squadId)?.phase)
    return typeof phase === 'string' && phases.includes(phase)
  }).toBe(true)
}
