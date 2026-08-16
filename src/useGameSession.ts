import { nextTick, onMounted, onUnmounted, reactive, ref, toRaw, watch } from 'vue'
import {
  assignCat as assignCatCommand,
  continueAfterFinale as continueAfterFinaleCommand,
  createState,
  deserializeState,
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
  type State,
  type SquadStyle,
} from './core/simulation'
import { createSoundSystem, normalizeSoundPreferences, type SoundPreferences } from './audio'
import { replaceObjectState } from './core/replaceState'
import { translate, type Locale } from './i18n'

const AUTOSAVE_KEY = 'nine-lives-corp-autosave-v1'
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
      const payload = window.localStorage.getItem(AUTOSAVE_KEY)
      if (!payload) return createState()
      const restored = deserializeState(payload)
      restoredAutosave = true
      return restored
    } catch (error) {
      initialSaveError = errorMessage(error, loadLocale(), 'Не удалось прочитать автосохранение.')
      return createState()
    }
  }

  const state = reactive(loadInitialState()) as State
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

  function persistAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = undefined
    try {
      window.localStorage.setItem(AUTOSAVE_KEY, serializeState(toRaw(state) as State))
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
    const achievement = getAchievements(state).find(candidate => candidate.id === achievementId)
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
    handleEvents(drainEvents(state))
    return result
  }

  function setSpeed(speed: Speed) {
    const blockingIncident = state.incident && state.incident.stage !== 'support_en_route'
    if (blockingIncident && speed !== 0) return false
    state.speed = speed
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
    const blob = new Blob([serializeState(toRaw(state) as State)], { type: 'application/json' })
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
      const restored = deserializeState(await file.text())
      drainEvents(state)
      replaceObjectState(state, restored)
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
    state.speed = 0
    newGameConfirmOpen.value = true
  }

  async function resetProgress() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = undefined
    achievementToast.value = undefined
    drainEvents(state)
    replaceObjectState(state, createState())
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

  watch(state, scheduleAutosave, { deep: true })
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
    timer = window.setInterval(() => runCommand(() => tick(state, 0.25)), 250)
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
    assignCat: (catId: string, squadId: string) => runCommand(() => assignCatCommand(state, catId, squadId)),
    equipItem: (catId: string, slot: EquipmentSlot, itemId?: ItemId) => runCommand(() => equipItemCommand(state, catId, slot, itemId)),
    setSquadStyle: (squadId: string, style: SquadStyle) => runCommand(() => setSquadStyleCommand(state, squadId, style)),
    setSquadAutoDispatch: (squadId: string, enabled: boolean) => runCommand(() => setSquadAutoDispatchCommand(state, squadId, enabled)),
    dispatchSquadToMission: (squadId: string, missionId: string) => runCommand(() => dispatchSquadToMissionCommand(state, squadId, missionId)),
    returnSquadToBase: (squadId: string) => runCommand(() => returnSquadToBaseCommand(state, squadId)),
    selectResearch: (researchId?: ResearchId) => runCommand(() => selectResearchCommand(state, researchId)),
    resolveRaidDecision: (action: 'escape' | 'attack' | 'support') => runCommand(() => resolveRaidDecisionCommand(state, action)),
    resolveRaidFollowup: (action: 'retreat' | 'continue') => runCommand(() => resolveRaidFollowupCommand(state, action)),
    resolveNinthLife: (decision: NinthLifeDecision) => runCommand(() => resolveNinthLifeCommand(state, decision)),
    continueAfterFinale: () => runCommand(() => continueAfterFinaleCommand(state)),
    exportSave,
    importSave,
    requestNewGame,
    resetProgress,
    toggleMuted,
    testSignal,
  }
}
