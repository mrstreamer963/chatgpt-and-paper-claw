import { expect, test } from '@playwright/test'
import { orderSelectedToPoint } from './rts-helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
})

test('Worker source starts, ticks, orders patch before result, serializes, imports, resets and disposes', async ({ page }) => {
  await page.goto('/')

  const report = await page.evaluate(async () => {
    const moduleUrl = new URL('/src/world/WorkerWorldSource.ts', window.location.href).href
    const { WorkerWorldSource } = await import(moduleUrl)
    const source = new WorkerWorldSource()
    const order: string[] = []
    const revisions: number[] = []
    const unsubscribe = source.subscribe(update => {
      revisions.push(update.revision)
      order.push(`update:${update.revision}`)
    })

    const initial = await source.start()
    const command = await source.dispatch({ type: 'set_speed', speed: 1 })
    order.push(`result:${command.revision}`)
    await new Promise(resolve => window.setTimeout(resolve, 350))
    const ticked = await source.requestSnapshot()
    const serialized = await source.serialize(false)
    const equipped = await source.dispatch({
      type: 'equip_item', catId: 'marlowe', slot: 'armor', itemId: 'armor_vest',
    })
    const equippedSnapshot = await source.requestSnapshot()
    const imported = await source.importSave(serialized)
    const reset = await source.reset()
    unsubscribe()
    source.dispose()
    const rejectsAfterDispose = await source.dispatch({ type: 'set_speed', speed: 1 })
      .then(() => false, () => true)

    return {
      initialRevision: initial.revision,
      commandRevision: command.revision,
      commandAccepted: command.accepted,
      firstTwoOrderEntries: order.slice(0, 2),
      revisions,
      tickedTime: ticked.state.time,
      serialized: JSON.parse(serialized),
      equipAccepted: equipped.accepted,
      equippedItem: equippedSnapshot.state.cats.find(cat => cat.id === 'marlowe')?.equipment.armor,
      importedItem: imported.state.cats.find(cat => cat.id === 'marlowe')?.equipment.armor ?? null,
      resetTime: reset.state.time,
      resetSpeed: reset.state.speed,
      rejectsAfterDispose,
    }
  })

  expect(report.initialRevision).toBe(0)
  expect(report.commandAccepted).toBe(true)
  expect(report.firstTwoOrderEntries).toEqual([
    `update:${report.commandRevision}`,
    `result:${report.commandRevision}`,
  ])
  expect(report.tickedTime).toBeGreaterThan(0)
  expect(report.revisions.every((revision, index, all) => index === 0 || revision > all[index - 1])).toBe(true)
  expect(report.serialized.gameVersion).toBe('0.1.0')
  expect(report.equipAccepted).toBe(true)
  expect(report.equippedItem).toBe('armor_vest')
  expect(report.importedItem).toBeNull()
  expect(report.resetTime).toBe(0)
  expect(report.resetSpeed).toBe(0)
  expect(report.rejectsAfterDispose).toBe(true)
})

test('accepted UI commands trigger asynchronous autosave', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Пиксель', exact: true }).click()
  await orderSelectedToPoint(page)

  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('nine-lives-corp-autosave-v1')))
    .not.toBeNull()
  const savedAssignment = await page.evaluate(() => {
    const payload = window.localStorage.getItem('nine-lives-corp-autosave-v1')!
    const save = JSON.parse(payload)
    return save.state.cats.find((cat: { id: string }) => cat.id === 'pixel')?.assignedTo
  })
  expect(savedAssignment).toBe('squad-1')
})
