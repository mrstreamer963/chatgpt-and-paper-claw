import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('nine-lives-corp-hints-v1', 'hidden')
  })
})

test('field equipment order is reserved and applied only after the squad returns', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'База', exact: true }).click()
  const pixelCard = page.locator('.cat-card').filter({ hasText: 'Пиксель' })
  await pixelCard.getByLabel('Назначение в отряд').selectOption('alpha')
  await expect(pixelCard.getByLabel('Назначение в отряд')).toHaveValue('alpha')

  await page.getByRole('button', { name: /×10/ }).click()
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  const alphaStatus = page.locator('.squad-marker.alpha small')
  await expect(alphaStatus).toContainText(/Выезд|Уборка/)
  // Freeze the world while navigating back to the equipment panel. At ×10 a
  // one-cat mission can otherwise finish before Firefox opens the select.
  await page.getByRole('button', { name: /^Ⅱ/ }).click()

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await pixelCard.getByText('Досье и экипировка', { exact: true }).click()
  const belt = pixelCard.locator('label').filter({ hasText: 'Пояс' })
  await belt.locator('select').selectOption('medkit')

  await expect(belt).toHaveClass(/pending/)
  await expect(belt.locator('select')).toHaveValue('medkit')
  const medkitStock = page.locator('.warehouse > div').filter({ hasText: 'Аптечка' }).locator('strong')
  await expect(medkitStock).toHaveText('×0')

  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await page.getByRole('button', { name: /×10/ }).click()
  const operationLog = page.locator('.map-view aside')
  await expect(operationLog).toContainText('Пиксель получит «Аптечка» после возвращения')

  // The order must not interrupt the active cleanup. The completion entry
  // appears before the squad returns and activates the reserved item.
  await expect(operationLog).toContainText('Отряд «Альфа» закончил уборку')
  await expect(operationLog).toContainText('Пиксель: отложенное оснащение выдано')

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await pixelCard.getByText('Досье и экипировка', { exact: true }).click()
  await expect(belt).not.toHaveClass(/pending/)
  await expect(belt.locator('select')).toHaveValue('medkit')
  await expect(medkitStock).toHaveText('×0')
})

test('two field cats can queue equipment independently and see current reservations', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()

  const pixelCard = page.locator('.cat-card').filter({ hasText: 'Пиксель' })
  const marloweCard = page.locator('.cat-card').filter({ hasText: 'Марлоу' })
  await pixelCard.getByLabel('Назначение в отряд').selectOption('alpha')
  await marloweCard.getByLabel('Назначение в отряд').selectOption('bravo')

  await page.getByRole('button', { name: /×10/ }).click()
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await expect(page.locator('.squad-marker.alpha small')).toContainText(/Выезд|Уборка/)
  await expect(page.locator('.squad-marker.bravo small')).toContainText(/Выезд|Уборка/)
  await page.getByRole('button', { name: /^Ⅱ/ }).click()

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await pixelCard.getByText('Досье и экипировка', { exact: true }).click()
  await marloweCard.getByText('Досье и экипировка', { exact: true }).click()
  const pixelBelt = pixelCard.locator('label').filter({ hasText: 'Пояс' })
  const marloweBelt = marloweCard.locator('label').filter({ hasText: 'Пояс' })

  await pixelBelt.locator('select').selectOption('medkit')
  await expect(marloweBelt.locator('option[value="medkit"]')).toHaveAttribute('disabled', '')
  await marloweBelt.locator('select').selectOption('headset')

  await expect(pixelBelt).toHaveClass(/pending/)
  await expect(marloweBelt).toHaveClass(/pending/)
  await expect(pixelBelt.locator('select')).toHaveValue('medkit')
  await expect(marloweBelt.locator('select')).toHaveValue('headset')
})

test('a field cat can cancel a deferred replacement by restoring its equipped item', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()

  const pixelCard = page.locator('.cat-card').filter({ hasText: 'Пиксель' })
  await pixelCard.getByText('Досье и экипировка', { exact: true }).click()
  const belt = pixelCard.locator('label').filter({ hasText: 'Пояс' })
  const beltSelect = belt.locator('select')
  await beltSelect.selectOption('headset')
  await pixelCard.getByLabel('Назначение в отряд').selectOption('alpha')

  await page.getByRole('button', { name: /×10/ }).click()
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await expect(page.locator('.squad-marker.alpha small')).toContainText(/Выезд|Уборка/)
  await page.getByRole('button', { name: /^Ⅱ/ }).click()
  await page.getByRole('button', { name: 'База', exact: true }).click()
  await pixelCard.getByText('Досье и экипировка', { exact: true }).click()

  await beltSelect.selectOption('medkit')
  await expect(belt).toHaveClass(/pending/)
  await expect(beltSelect).toHaveValue('medkit')
  await expect(beltSelect.locator('option[value="headset"]')).not.toHaveAttribute('disabled', '')

  await beltSelect.selectOption('headset')
  await expect(belt).not.toHaveClass(/pending/)
  await expect(beltSelect).toHaveValue('headset')
  await expect(page.locator('.warehouse > div').filter({ hasText: 'Аптечка' }).locator('strong')).toHaveText('×1')
})

test('a sleeping cat can change equipment in Firefox', async ({ page }) => {
  const equipmentMessages: string[] = []
  page.on('console', message => {
    if (!message.text().startsWith('[NLC equipment')) return
    equipmentMessages.push(message.text())
    console.log(`[firefox console] ${message.text()}`)
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'База', exact: true }).click()
  const pixelCard = page.locator('.cat-card').filter({ hasText: 'Пиксель' })
  await pixelCard.getByLabel('Назначение в отряд').selectOption('alpha')
  await page.getByRole('button', { name: /×10/ }).click()

  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  const operationLog = page.locator('.map-view aside')
  await expect(page.getByRole('heading', { name: 'Встреча с рейдерами' })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /Сбежать/ }).click()
  await page.getByRole('button', { name: /×10/ }).click()
  await expect(operationLog).toContainText('Пиксель слишком устал и заснул', { timeout: 20_000 })

  await page.getByRole('button', { name: 'База', exact: true }).click()
  await expect(pixelCard.locator('.sleeping-label')).toBeVisible()
  await pixelCard.getByText('Досье и экипировка', { exact: true }).click()
  const belt = pixelCard.locator('label').filter({ hasText: 'Пояс' })
  const beltSelect = belt.locator('select')
  await beltSelect.dispatchEvent('pointerdown')
  await beltSelect.focus()
  await beltSelect.selectOption('medkit')

  await expect(beltSelect).toHaveValue('medkit')
  await expect(belt).not.toHaveClass(/pending/)
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await expect(operationLog).toContainText('Пиксель получил: Аптечка')
  expect(equipmentMessages.some(message => message.includes('[NLC equipment:UI] reconciled'))).toBe(true)
  expect(equipmentMessages.some(message => message.includes('[NLC equipment:session] result'))).toBe(true)
})

test('Firefox blur fallback commits a native equipment selection', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /×10/ }).click()
  await page.getByRole('button', { name: 'База', exact: true }).click()
  const marloweCard = page.locator('.cat-card').filter({ hasText: 'Марлоу' })
  await marloweCard.getByText('Досье и экипировка', { exact: true }).click()
  const armorSelect = marloweCard.locator('label').filter({ hasText: 'Бронежилет' }).locator('select')

  await armorSelect.dispatchEvent('pointerdown')
  await armorSelect.focus()
  await armorSelect.evaluate((select: HTMLSelectElement) => { select.value = 'armor_vest' })
  await page.waitForTimeout(750)
  await page.getByRole('heading', { name: 'СОСТАВ И ЭКИПИРОВКА' }).click()

  await expect(armorSelect).toHaveValue('armor_vest')
  const armorStock = page.locator('.warehouse > div').filter({ hasText: 'Бронежилет' }).locator('strong')
  await expect(armorStock).toHaveText('×1')
  await page.getByRole('button', { name: 'Карта', exact: true }).click()
  await expect(page.locator('.map-view aside')).toContainText('Марлоу получил: Бронежилет')
})
