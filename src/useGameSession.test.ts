import assert from 'node:assert/strict'
import test from 'node:test'
import { createState, serializeState } from '@nine-lives/game-core'
import { translate } from './i18n.ts'
import { readSessionPreferences, serializeSessionEnvelope } from './sessionSave.ts'
import { stateSpeedBeforePause } from './speedShortcut.ts'

test('space pause remembers a running speed and defaults to x1 for a paused save', () => {
  assert.equal(stateSpeedBeforePause(10), 10)
  assert.equal(stateSpeedBeforePause(5), 5)
  assert.equal(stateSpeedBeforePause(0), 1)
})

test('session save transfers locale and normalized audio settings', () => {
  const sound = { muted: true, master: 0.4, ambient: 0.3, signals: 0.9 }
  const payload = serializeSessionEnvelope(serializeState(createState(), false), 'en', sound, false)
  const envelope = JSON.parse(payload)

  assert.equal(payload.includes('\n'), false)
  assert.equal(envelope.locale, 'en')
  assert.deepEqual(envelope.audioSettings, sound)
  assert.deepEqual(readSessionPreferences(payload), { locale: 'en', sound })
})

test('English locale translates the manual mission close label', () => {
  assert.equal(translate('en', 'Закрыть'), 'Close')
})

test('domain log events render in either language with localized parameters', () => {
  const params = { cat: 'cat.pixel.name', squad: 'squad.alpha' }
  assert.equal(translate('ru', 'log.cat_assigned', params), 'Пиксель назначен в Отряд «Альфа»')
  assert.equal(translate('en', 'log.cat_assigned', params), 'Pixel assigned to Squad “Alpha”')
})
