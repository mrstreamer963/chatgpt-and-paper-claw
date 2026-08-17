import { nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import {
  assignCat as assignCatCommand,
  continueAfterFinale as continueAfterFinaleCommand,
  createState,
  deserializeCurrentSave,
  dispatchSquadToMission as dispatchSquadToMissionCommand,
  drainEvents,
  equipItem as equipItemCommand,
  getAchievements,
  resolveNinthLife as resolveNinthLifeCommand,
  resolveRaidDecision as resolveRaidDecisionCommand,
  resolveRaidFollowup as resolveRaidFollowupCommand,
  returnSquadToBase as returnSquadToBaseCommand,
  SaveError,
  selectResearch as selectResearchCommand,
  serializeState,
  setSquadStyle as setSquadStyleCommand,
  setSquadAutoDispatch as setSquadAutoDispatchCommand,
  tick,
  type EquipmentSlot,
  type GameEvent,
  type ItemId,
  type NinthLifeDecision,
  type ResearchId,
  type Speed,
  GameCore,
  GAME_VERSION,
  type State,
  type SquadStyle,
} from './core/simulation'
import { createSoundSystem, normalizeSoundPreferences, type SoundPreferences } from './audio'
import { translate, type Locale } from './i18n'

const AUTOSAVE_KEY = 'nine-lives-corp-autosave-v1'
const APP_VERSION_KEY = 'nine-lives-corp-app-version'
const HINTS_KEY = 'nine-lives-corp-hints-v1'
const LOCALE_KEY = 'nine-lives-corp-locale-v1'
const SOUND_KEY = 'nine-lives-corp-sound-v1'

type SaveStatus = { key: string; params?: Record<string, string | number> }

function loadHintsPreference() {
  try {
    return window.localStorage.getItem(HINTS_KEY) !== 'hidden'
  } catch {
    return true
  }
}

function loadLocale(): Locale {
  try {
    return window.localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'ru'
  } catch {
    return 'ru'
  }
}

function loadSoundPreferences(): SoundPreferences {
  try {
    const payload = window.localStorage.getItem(SOUND_KEY)
    return normalizeSoundPreferences(payload ? JSON.parse(payload) : undefined)
  } catch {
    return normalizeSoundPreferences(undefined)
  }
}

function errorMessage(error: unknown, locale: Locale, fallback: string) {
  if (error instanceof SaveError) return translate(locale, error.key, error.params)
  return error instanceof Error ? error.message : fallback
}

export function useGameSession() {
  let restoredAutosave = false
  let initialSaveError = ''
  let timer: number | undefined
  let achievementToastTimer: number | undefined
  let autosaveTimer: number | undefined
  let lastAutosaveAt = 0

  function loadInitialState() {
    try {
      const knownVersion = window.localStorage.getItem(APP_VERSION_KEY)
      if (knownVersion !== GAME_VERSION) {
        window.localStorage.removeItem(AUTOSAVE_KEY)
        window.localStorage.setItem(APP_VERSION_KEY, GAME_VERSION)
        initialSaveError = knownVersion ? 'save.error.legacy_discarded' : ''
        return createState()
      }
      const payload = window.localStorage.getItem(AUTOSAVE_KEY)
      if (!payload) return createState()
      const restored = deserializeCurrentSave(payload)
      restoredAutosave = true
      return restored
    } catch (error) {
      if (error instanceof SaveError && error.key === 'save.error.unsupported_version') {
        window.localStorage.removeItem(AUTOSAVE_KEY)
        initialSaveError = 'save.error.legacy_discarded'
      } else {
        initialSaveError = errorMessage(error, loadLocale(), 'Не удалось прочитать автосохранение.')
      }
      return createState()
    }
  }

  const core = new GameCore(loadInitialState())
  const state = shallowRef<State>(core.snapshot())
  const activeView = ref<'map' | 'base'>('map')
  const hintsVisible = ref(loadHintsPreference())
  const locale = ref<Locale>(loadLocale())
  const achievementToast = ref<string>()
  const newGameConfirmOpen = ref(false)
  const soundPreferences = reactive(loadSoundPreferences())
  const soundSettingsOpen = ref(false)
  const audioStarted = ref(false)
  const audioUnavailable = ref(false)
  const soundSystem = createSoundSystem(soundPreferences)
  const saveStatus = ref<SaveStatus>({
    key: initialSaveError || (restoredAutosave ? 'save.restored' : 'save.ready'),
  })

  function publishSnapshot() {
    // Firefox keeps the native select popup outside the page DOM. Replacing
    // the focused select with every simulation snapshot destroys that popup
    // before it can dispatch `change`.
    if (document.activeElement instanceof HTMLSelectElement) return
    state.value = core.snapshot()
  }

  function persistAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = undefined
    try {
      window.localStorage.setItem(AUTOSAVE_KEY, core.serialize())
      lastAutosaveAt = Date.now()
      saveStatus.value = {
        key: 'save.autosaved',
        params: { time: new Date(lastAutosaveAt).toLocaleTimeString(locale.value === 'ru' ? 'ru-RU' : 'en-US') },
      }
    } catch (error) {
      saveStatus.value = { key: 'save.error', params: { error: error instanceof Error ? error.message : 'Не удалось обновить автослот' } }
    }
  }

  function scheduleAutosave() {
    if (autosaveTimer) return
    const delay = Math.max(0, 1000 - (Date.now() - lastAutosaveAt))
    if (delay === 0) persistAutosave()
    else autosaveTimer = window.setTimeout(persistAutosave, delay)
  }

  function showAchievement(achievementId: string) {
    const achievement = getAchievements(state.value).find(candidate => candidate.id === achievementId)
    if (!achievement) return
    achievementToast.value = achievement.title
    soundSystem.play('achievement')
    if (achievementToastTimer) clearTimeout(achievementToastTimer)
    achievementToastTimer = window.setTimeout(() => { achievementToast.value = undefined }, 4200)
  }

  function handleEvents(events: GameEvent[]) {
    for (const event of events) {
      if (event.type === 'achievement_unlocked') showAchievement(event.achievementId)
      else if (event.type === 'incident_started') soundSystem.play('alert')
      else if (event.type === 'support_arrived') soundSystem.play('support')
      else if (event.type === 'story_started') {
        activeView.value = 'map'
        soundSystem.play('investigation')
      }
    }
  }

  function runCommand<T>(command: () => T) {
    const result = command()
    handleEvents(core.drainEvents())
    publishSnapshot()
    scheduleAutosave()
    return result
  }

  function setSpeed(speed: Speed) {
    const blockingIncident = state.value.incident && state.value.incident.stage !== 'support_en_route'
    if (blockingIncident && speed !== 0) return false
    core.dispatch({ type: 'set_speed', speed })
    publishSnapshot()
    scheduleAutosave()
    return true
  }

  const speedByKey: Partial<Record<string, Speed>> = {
    Space: 0,
    Digit1: 1,
    Numpad1: 1,
    Digit2: 5,
    Numpad2: 5,
    Digit3: 10,
    Numpad3: 10,
  }

  function handleSpeedShortcut(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    const target = event.target as HTMLElement | null
    if (target?.matches('input, select, textarea, [contenteditable="true"]')) return
    const speed = speedByKey[event.code]
    if (speed === undefined) return
    event.preventDefault()
    setSpeed(speed)
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') persistAutosave()
  }

  function exportSave() {
    persistAutosave()
    const blob = new Blob([core.serialize()], { type: 'application/json' })
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
      const restored = deserializeCurrentSave(await file.text())
      core.replaceState(restored)
      core.drainEvents()
      publishSnapshot()
      await nextTick()
      persistAutosave()
      saveStatus.value = { key: 'save.imported', params: { file: file.name } }
    } catch (error) {
      saveStatus.value = { key: 'save.import_rejected', params: { error: errorMessage(error, locale.value, 'Импорт сохранения не удался') } }
    } finally {
      input.value = ''
    }
  }

  function requestNewGame() {
    core.dispatch({ type: 'set_speed', speed: 0 })
    publishSnapshot()
    newGameConfirmOpen.value = true
  }

  async function resetProgress() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = undefined
    achievementToast.value = undefined
    core.replaceState(createState())
    core.drainEvents()
    publishSnapshot()
    activeView.value = 'map'
    newGameConfirmOpen.value = false
    await nextTick()
    persistAutosave()
    saveStatus.value = { key: 'save.new_game' }
  }

  async function unlockAudio() {
    if (audioStarted.value) return
    const started = await soundSystem.start()
    audioStarted.value = started
    audioUnavailable.value = !started
  }

  function toggleMuted() {
    soundPreferences.muted = !soundPreferences.muted
  }

  function testSignal() {
    void unlockAudio().then(() => soundSystem.play('support'))
  }

  watch(hintsVisible, visible => {
    try {
      window.localStorage.setItem(HINTS_KEY, visible ? 'visible' : 'hidden')
    } catch {
      // Настройка остаётся активна до конца текущей сессии.
    }
  })
  watch(locale, value => {
    document.documentElement.lang = value
    try {
      window.localStorage.setItem(LOCALE_KEY, value)
    } catch {
      // Локализация остаётся активна до конца текущей сессии.
    }
  }, { immediate: true })
  watch(soundPreferences, value => {
    soundSystem.setPreferences(value)
    try {
      window.localStorage.setItem(SOUND_KEY, JSON.stringify(value))
    } catch {
      // Настройки остаются активны до конца текущей сессии.
    }
  }, { deep: true })

  onMounted(() => {
    timer = window.setInterval(() => {
      core.tick(0.25)
      handleEvents(core.drainEvents())
      publishSnapshot()
      scheduleAutosave()
    }, 250)
    window.addEventListener('keydown', handleSpeedShortcut)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('click', unlockAudio, { capture: true })
    window.addEventListener('keydown', unlockAudio, { capture: true })
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    if (achievementToastTimer) clearTimeout(achievementToastTimer)
    if (autosaveTimer) clearTimeout(autosaveTimer)
    window.removeEventListener('keydown', handleSpeedShortcut)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('click', unlockAudio, { capture: true })
    window.removeEventListener('keydown', unlockAudio, { capture: true })
    void soundSystem.dispose()
  })

  return {
    state,
    activeView,
    hintsVisible,
    locale,
    achievementToast,
    newGameConfirmOpen,
    soundPreferences,
    soundSettingsOpen,
    audioStarted,
    audioUnavailable,
    saveStatus,
    setSpeed,
    assignCat: (catId: string, squadId: string) => runCommand(() => core.dispatch({ type: 'assign_cat', catId, squadId })),
    equipItem: (catId: string, slot: EquipmentSlot, itemId?: ItemId) => runCommand(() => core.dispatch({ type: 'equip_item', catId, slot, itemId })),
    setSquadStyle: (squadId: string, style: SquadStyle) => runCommand(() => core.dispatch({ type: 'set_squad_style', squadId, style })),
    setSquadAutoDispatch: (squadId: string, enabled: boolean) => runCommand(() => core.dispatch({ type: 'set_auto_dispatch', squadId, enabled })),
    dispatchSquadToMission: (squadId: string, missionId: string) => runCommand(() => core.dispatch({ type: 'dispatch_squad', squadId, missionId })),
    returnSquadToBase: (squadId: string) => runCommand(() => core.dispatch({ type: 'return_squad', squadId })),
    selectResearch: (researchId?: ResearchId) => runCommand(() => core.dispatch({ type: 'select_research', researchId })),
    resolveRaidDecision: (action: 'escape' | 'attack' | 'support') => runCommand(() => core.dispatch({ type: 'resolve_raid', action })),
    resolveRaidFollowup: (action: 'retreat' | 'continue') => runCommand(() => core.dispatch({ type: 'resolve_raid_followup', action })),
    resolveNinthLife: (decision: NinthLifeDecision) => runCommand(() => core.dispatch({ type: 'resolve_ninth_life', decision })),
    continueAfterFinale: () => runCommand(() => core.dispatch({ type: 'continue_after_finale' })),
    exportSave,
    importSave,
    requestNewGame,
    resetProgress,
    toggleMuted,
    testSignal,
  }
}
