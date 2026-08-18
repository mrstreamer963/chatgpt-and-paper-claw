import { normalizeSoundPreferences, type SoundPreferences } from './audio.ts'
import type { Locale } from './i18n.ts'

export function readSessionPreferences(payload: string): { locale?: Locale; sound?: SoundPreferences } {
  const envelope = JSON.parse(payload) as { locale?: unknown; audioSettings?: unknown }
  const locale: Locale | undefined = envelope.locale === 'ru' || envelope.locale === 'en' ? envelope.locale : undefined
  return {
    locale,
    sound: envelope.audioSettings === undefined ? undefined : normalizeSoundPreferences(envelope.audioSettings),
  }
}

export function serializeSessionEnvelope(payload: string, locale: Locale, sound: SoundPreferences, pretty: boolean) {
  const envelope = JSON.parse(payload) as Record<string, unknown>
  envelope.locale = locale
  envelope.audioSettings = { ...sound }
  return JSON.stringify(envelope, null, pretty ? 2 : undefined)
}
