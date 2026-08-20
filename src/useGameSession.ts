import { effectScope, inject, nextTick, reactive, ref, watch, type InjectionKey } from 'vue'
import {
  GAME_VERSION,
  SaveError,
  getAchievements,
  type EquipmentSlot,
  type GameCommand,
  type GameEvent,
  type ItemId,
  type NinthLifeDecision,
  type ResearchId,
  type Speed,
  type SquadStyle,
  type WorldSource,
} from '@nine-lives/game-core'
import { createSoundSystem, normalizeSoundPreferences, type SoundPreferences } from './audio'
import { translate, type Locale } from './i18n'
import { readSessionPreferences, serializeSessionEnvelope } from './sessionSave'
import { stateSpeedBeforePause } from './speedShortcut'
import { WorkerWorldSource } from './world/WorkerWorldSource'
import { WorldProjection } from './world/reconcileWorld'

const AUTOSAVE_KEY = 'nine-lives-corp-autosave-v1'
const APP_VERSION_KEY = 'nine-lives-corp-app-version'
const HINTS_KEY = 'nine-lives-corp-hints-v1'
const LOCALE_KEY = 'nine-lives-corp-locale-v1'
const SOUND_KEY = 'nine-lives-corp-sound-v1'

type SaveStatus = { key: string; params?: Record<string, string | number> }
type EventToast = { label: string; title: string; tone: 'achievement' | 'alert' | 'story' }

function loadHintsPreference() {
  try { return window.localStorage.getItem(HINTS_KEY) !== 'hidden' } catch { return true }
}

function loadLocale(): Locale {
  try { return window.localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'ru' } catch { return 'ru' }
}

function loadSoundPreferences(): SoundPreferences {
  try {
    const payload = window.localStorage.getItem(SOUND_KEY)
    return normalizeSoundPreferences(payload ? JSON.parse(payload) : undefined)
  } catch { return normalizeSoundPreferences(undefined) }
}

function errorMessage(error: unknown, locale: Locale, fallback: string) {
  if (error instanceof SaveError) return translate(locale, error.key, error.params)
  return error instanceof Error ? error.message : fallback
}

function readInitialSave() {
  let payload: string | undefined
  let restoredLocale: Locale | undefined
  let restoredSound: SoundPreferences | undefined
  let statusKey = 'save.ready'
  try {
    const knownVersion = window.localStorage.getItem(APP_VERSION_KEY)
    if (knownVersion !== GAME_VERSION) {
      window.localStorage.removeItem(AUTOSAVE_KEY)
      window.localStorage.setItem(APP_VERSION_KEY, GAME_VERSION)
      if (knownVersion) statusKey = 'save.error.legacy_discarded'
    } else {
      payload = window.localStorage.getItem(AUTOSAVE_KEY) ?? undefined
      if (payload) {
        const preferences = readSessionPreferences(payload)
        restoredLocale = preferences.locale
        restoredSound = preferences.sound
        statusKey = 'save.restored'
      }
    }
  } catch { payload = undefined }
  return { payload, restoredLocale, restoredSound, statusKey }
}

export async function createGameSession() {
  const initialSave = readInitialSave()
  let source: WorldSource = new WorkerWorldSource()
  let initialSnapshot
  let initialSaveError = initialSave.statusKey
  try {
    initialSnapshot = await source.start(initialSave.payload)
  } catch (error) {
    source.dispose()
    source = new WorkerWorldSource()
    window.localStorage.removeItem(AUTOSAVE_KEY)
    initialSaveError = error instanceof SaveError && error.key === 'save.error.unsupported_version'
      ? 'save.error.legacy_discarded'
      : errorMessage(error, initialSave.restoredLocale ?? loadLocale(), 'Не удалось прочитать автосохранение.')
    initialSnapshot = await source.start()
  }

  let achievementToastTimer: number | undefined
  let autosaveTimer: number | undefined
  let lastAutosaveAt = 0
  let autosaveInFlight: Promise<void> | undefined
  let autosaveDirty = false
  const scope = effectScope()
  const activeView = ref<'map' | 'base'>('map')
  const hintsVisible = ref(loadHintsPreference())
  const locale = ref<Locale>(initialSave.restoredLocale ?? loadLocale())
  const eventToast = ref<EventToast>()
  const newGameConfirmOpen = ref(false)
  const soundPreferences = reactive(initialSave.restoredSound ?? loadSoundPreferences())
  const soundSettingsOpen = ref(false)
  const audioStarted = ref(false)
  const audioUnavailable = ref(false)
  const soundSystem = createSoundSystem(soundPreferences)
  const saveStatus = ref<SaveStatus>({ key: initialSaveError })
  let speedBeforeSpacePause: Exclude<Speed, 0> = stateSpeedBeforePause(initialSnapshot.state.speed)
  let stateReady = false
  const queuedEvents: GameEvent[][] = []

  function showToast(toast: EventToast) {
    eventToast.value = toast
    if (achievementToastTimer) clearTimeout(achievementToastTimer)
    achievementToastTimer = window.setTimeout(() => { eventToast.value = undefined }, 4200)
  }

  function showAchievement(achievementId: string) {
    const achievement = getAchievements(projection.state.value).find(candidate => candidate.id === achievementId)
    if (!achievement) return
    showToast({ label: 'ОПЕРАТИВНОЕ ДОСТИЖЕНИЕ', title: achievement.title, tone: 'achievement' })
    soundSystem.play('achievement')
  }

  function handleEvents(events: GameEvent[]) {
    for (const event of events) {
      if (event.type === 'achievement_unlocked') showAchievement(event.achievementId)
      else if (event.type === 'incident_started') {
        showToast({ label: 'toast.alert.label', title: 'toast.raid.title', tone: 'alert' })
        soundSystem.play('alert')
      } else if (event.type === 'support_arrived') soundSystem.play('support')
      else if (event.type === 'story_started') {
        activeView.value = 'map'
        showToast({ label: 'toast.story.label', title: 'toast.story.title', tone: 'story' })
        soundSystem.play('investigation')
      }
    }
    if (events.length) scheduleAutosave()
  }

  const projection = new WorldProjection(source, initialSnapshot, events => {
    if (!stateReady) queuedEvents.push(events)
    else handleEvents(events)
  })
  const state = projection.state
  stateReady = true
  for (const events of queuedEvents.splice(0)) handleEvents(events)

  async function serializeSession(pretty: boolean) {
    const payload = await source.serialize(false)
    return serializeSessionEnvelope(payload, locale.value, soundPreferences, pretty)
  }

  async function persistAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = undefined
    autosaveDirty = true
    if (autosaveInFlight) return autosaveInFlight
    const task = (async () => {
      while (autosaveDirty) {
        autosaveDirty = false
        try {
          window.localStorage.setItem(AUTOSAVE_KEY, await serializeSession(false))
          lastAutosaveAt = Date.now()
          saveStatus.value = {
            key: 'save.autosaved',
            params: { time: new Date(lastAutosaveAt).toLocaleTimeString(locale.value === 'ru' ? 'ru-RU' : 'en-US') },
          }
        } catch (error) {
          saveStatus.value = { key: 'save.error', params: { error: error instanceof Error ? error.message : 'Не удалось обновить автослот' } }
        }
      }
    })()
    autosaveInFlight = task
    try {
      await task
    } finally {
      if (autosaveInFlight === task) autosaveInFlight = undefined
    }
  }

  function scheduleAutosave() {
    autosaveDirty = true
    if (autosaveTimer || autosaveInFlight) return
    const delay = Math.max(0, 1000 - (Date.now() - lastAutosaveAt))
    if (delay === 0) void persistAutosave()
    else autosaveTimer = window.setTimeout(() => { void persistAutosave() }, delay)
  }

  async function runCommand(command: GameCommand) {
    const result = await source.dispatch(command)
    if (result.accepted) scheduleAutosave()
    return result.accepted
  }

  async function equipItem(catId: string, slot: EquipmentSlot, itemId?: ItemId) {
    const before = state.value.cats.find(cat => cat.id === catId)
    if (import.meta.env.DEV) console.info('[NLC equipment:session] dispatch', {
      catId, slot, requestedItemId: itemId ?? null, sleeping: before?.sleeping ?? null,
      energy: before?.energy ?? null, currentItemId: before?.equipment[slot] ?? null,
    })
    const accepted = await runCommand({ type: 'equip_item', catId, slot, itemId })
    const after = state.value.cats.find(cat => cat.id === catId)
    if (import.meta.env.DEV) console.info('[NLC equipment:session] result', {
      catId, slot, requestedItemId: itemId ?? null, accepted, sleeping: after?.sleeping ?? null,
      energy: after?.energy ?? null, currentItemId: after?.equipment[slot] ?? null,
      pendingItemId: after && Object.prototype.hasOwnProperty.call(after.pendingEquipment, slot)
        ? after.pendingEquipment[slot] ?? null : 'none',
      requestedItemStock: itemId ? state.value.inventory[itemId] : null,
    })
    return accepted
  }

  async function setSpeed(speed: Speed) {
    const blockingOverlay = newGameConfirmOpen.value
      || Boolean(state.value.storyIncident)
      || state.value.finalSummaryVisible
      || Boolean(state.value.incident && state.value.incident.stage !== 'support_en_route')
    if (blockingOverlay && speed !== 0) return false
    return runCommand({ type: 'set_speed', speed })
  }

  const speedByKey: Partial<Record<string, Speed>> = {
    Digit1: 1, Numpad1: 1, Digit2: 5, Numpad2: 5, Digit3: 10, Numpad3: 10,
  }

  function handleSpeedShortcut(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    const target = event.target as HTMLElement | null
    if (target?.matches('input, select, textarea, [contenteditable="true"]')) return
    if (event.code === 'Space') {
      event.preventDefault()
      const currentSpeed = state.value.speed
      if (currentSpeed === 0) void setSpeed(speedBeforeSpacePause)
      else {
        speedBeforeSpacePause = currentSpeed
        void setSpeed(0)
      }
      return
    }
    const speed = speedByKey[event.code]
    if (speed === undefined) return
    event.preventDefault()
    void setSpeed(speed)
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') void persistAutosave()
  }

  async function exportSave() {
    const payload = await serializeSession(true)
    await persistAutosave()
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-')
    link.href = url
    link.download = `nine-lives-corp-${stamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    saveStatus.value = { key: 'save.exported' }
  }

  async function importSave(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const payload = await file.text()
      const preferences = readSessionPreferences(payload)
      await source.importSave(payload)
      if (preferences.locale) locale.value = preferences.locale
      if (preferences.sound) Object.assign(soundPreferences, preferences.sound)
      await nextTick()
      await persistAutosave()
      saveStatus.value = { key: 'save.imported', params: { file: file.name } }
    } catch (error) {
      saveStatus.value = { key: 'save.import_rejected', params: { error: errorMessage(error, locale.value, 'Импорт сохранения не удался') } }
    } finally { input.value = '' }
  }

  async function requestNewGame() {
    await runCommand({ type: 'set_speed', speed: 0 })
    newGameConfirmOpen.value = true
  }

  async function resetProgress() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = undefined
    eventToast.value = undefined
    await source.reset()
    activeView.value = 'map'
    newGameConfirmOpen.value = false
    await nextTick()
    await persistAutosave()
    saveStatus.value = { key: 'save.new_game' }
  }

  async function unlockAudio() {
    if (audioStarted.value) return
    const started = await soundSystem.start()
    audioStarted.value = started
    audioUnavailable.value = !started
  }

  function toggleMuted() { soundPreferences.muted = !soundPreferences.muted }
  function testSignal() { void unlockAudio().then(() => soundSystem.play('support')) }

  scope.run(() => {
    watch(hintsVisible, visible => {
      try { window.localStorage.setItem(HINTS_KEY, visible ? 'visible' : 'hidden') } catch { /* session-only */ }
    })
    watch(locale, value => {
      document.documentElement.lang = value
      try { window.localStorage.setItem(LOCALE_KEY, value) } catch { /* session-only */ }
    }, { immediate: true })
    watch(soundPreferences, value => {
      soundSystem.setPreferences(value)
      try { window.localStorage.setItem(SOUND_KEY, JSON.stringify(value)) } catch { /* session-only */ }
    }, { deep: true })
  })

  window.addEventListener('keydown', handleSpeedShortcut)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('click', unlockAudio, { capture: true })
  window.addEventListener('keydown', unlockAudio, { capture: true })

  function dispose() {
    if (achievementToastTimer) clearTimeout(achievementToastTimer)
    if (autosaveTimer) clearTimeout(autosaveTimer)
    window.removeEventListener('keydown', handleSpeedShortcut)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('click', unlockAudio, { capture: true })
    window.removeEventListener('keydown', unlockAudio, { capture: true })
    scope.stop()
    projection.dispose()
    source.dispose()
    void soundSystem.dispose()
  }

  return {
    state, activeView, hintsVisible, locale, eventToast, newGameConfirmOpen,
    soundPreferences, soundSettingsOpen, audioStarted, audioUnavailable, saveStatus,
    setSpeed,
    assignCat: (catId: string, squadId: string) => runCommand({ type: 'assign_cat', catId, squadId }),
    createSquad: () => runCommand({ type: 'create_squad' }),
    disbandSquad: (squadId: string) => runCommand({ type: 'disband_squad', squadId }),
    equipItem,
    setSquadStyle: (squadId: string, style: SquadStyle) => runCommand({ type: 'set_squad_style', squadId, style }),
    setSquadAutoDispatch: (squadId: string, enabled: boolean) => runCommand({ type: 'set_auto_dispatch', squadId, enabled }),
    dispatchSquadToMission: (squadId: string, missionId: string) => runCommand({ type: 'dispatch_squad', squadId, missionId }),
    moveSquadToPoint: (squadId: string, x: number, y: number) => runCommand({ type: 'move_squad', squadId, x, y }),
    returnSquadToBase: (squadId: string) => runCommand({ type: 'return_squad', squadId }),
    selectResearch: (researchId?: ResearchId) => runCommand({ type: 'select_research', researchId }),
    resolveRaidDecision: (action: 'escape' | 'attack' | 'support', supportSquadId?: string) => runCommand({ type: 'resolve_raid', action, supportSquadId }),
    resolveRaidFollowup: (action: 'retreat' | 'continue') => runCommand({ type: 'resolve_raid_followup', action }),
    resolveNinthLife: (decision: NinthLifeDecision) => runCommand({ type: 'resolve_ninth_life', decision }),
    continueAfterFinale: () => runCommand({ type: 'continue_after_finale' }),
    exportSave, importSave, requestNewGame, resetProgress, toggleMuted, testSignal, dispose,
  }
}

export type GameSession = Awaited<ReturnType<typeof createGameSession>>
export const gameSessionKey = Symbol('game-session') as InjectionKey<GameSession>

export function useGameSession() {
  const session = inject(gameSessionKey)
  if (!session) throw new Error('Game session was not provided')
  return session
}
