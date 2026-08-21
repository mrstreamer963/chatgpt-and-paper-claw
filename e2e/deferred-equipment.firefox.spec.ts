import { expect, test, type Page } from '@playwright/test'
import { formSquadAtPoint, formSquadOnMission } from './rts-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

async function openEquipment(page: Page, catName: string) {
  const card = page.locator('.cat-card').filter({ hasText: catName })
  await card.getByText('Досье и экипировка', { exact: true }).click()
  return card
}

test('field equipment is reserved and applied only after the dynamically formed squad returns', async ({ page }) => {
  await page.goto('/')
  await formSquadOnMission(page, ['Пиксель'])
  await page.getByRole('button', { name: 'База', exact: true }).click()

  const pixelCard = await openEquipment(page, 'Пиксель')
  const belt = pixelCard.locator('label').filter({ hasText: 'Пояс' })
  await belt.locator('select').selectOption('medkit')
  await expect(belt).toHaveClass(/pending/)
  await expect(page.locator('.warehouse > div').filter({ hasText: 'Аптечка' }).locator('strong')).toHaveText('×0')

  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await page.getByRole('button', { name: /×10/ }).click()
  const operationLog = page.locator('.map-view aside')
  await expect(operationLog).toContainText('Пиксель получит «Аптечка» после возвращения')
  await expect(operationLog).toContainText('Отряд «Альфа» закончил уборку', { timeout: 20_000 })
  await expect(operationLog).toContainText('Пиксель: отложенное оснащение выдано', { timeout: 20_000 })

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await openEquipment(page, 'Пиксель')
  await expect(belt).not.toHaveClass(/pending/)
  await expect(belt.locator('select')).toHaveValue('medkit')
})

test('two field cats can reserve equipment independently', async ({ page }) => {
  await page.goto('/')
  await formSquadAtPoint(page, ['Пиксель'], 72, 72)
  await formSquadAtPoint(page, ['Марлоу'], 66, 66)
  await page.getByRole('button', { name: 'База', exact: true }).click()

  const pixelCard = await openEquipment(page, 'Пиксель')
  const marloweCard = await openEquipment(page, 'Марлоу')
  const pixelBelt = pixelCard.locator('label').filter({ hasText: 'Пояс' })
  const marloweBelt = marloweCard.locator('label').filter({ hasText: 'Пояс' })

  await pixelBelt.locator('select').selectOption('medkit')
  await expect(marloweBelt.locator('option[value="medkit"]')).toHaveAttribute('disabled', '')
  await marloweBelt.locator('select').selectOption('headset')
  await expect(pixelBelt).toHaveClass(/pending/)
  await expect(marloweBelt).toHaveClass(/pending/)
})

test('a field cat can cancel a deferred replacement by restoring its equipped item', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()
  let pixelCard = await openEquipment(page, 'Пиксель')
  let belt = pixelCard.locator('label').filter({ hasText: 'Пояс' })
  await belt.locator('select').selectOption('headset')

  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await formSquadAtPoint(page, ['Пиксель'])
  await page.getByRole('button', { name: 'База', exact: true }).click()
  pixelCard = await openEquipment(page, 'Пиксель')
  belt = pixelCard.locator('label').filter({ hasText: 'Пояс' })
  const beltSelect = belt.locator('select')

  await beltSelect.selectOption('medkit')
  await expect(belt).toHaveClass(/pending/)
  await beltSelect.selectOption('headset')
  await expect(belt).not.toHaveClass(/pending/)
  await expect(beltSelect).toHaveValue('headset')
  await expect(page.locator('.warehouse > div').filter({ hasText: 'Аптечка' }).locator('strong')).toHaveText('×1')
})

test('Firefox blur fallback commits a native equipment selection', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()
  const marloweCard = await openEquipment(page, 'Марлоу')
  const armorSelect = marloweCard.locator('label').filter({ hasText: 'Бронежилет' }).locator('select')

  await armorSelect.dispatchEvent('pointerdown')
  await armorSelect.focus()
  await armorSelect.evaluate((select: HTMLSelectElement) => { select.value = 'armor_vest' })
  await page.waitForTimeout(750)
  await page.getByRole('heading', { name: 'СОСТАВ И ЭКИПИРОВКА' }).click()

  await expect(armorSelect).toHaveValue('armor_vest')
  await expect(page.locator('.warehouse > div').filter({ hasText: 'Бронежилет' }).locator('strong')).toHaveText('×1')
})
