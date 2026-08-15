<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, toRaw, watch } from 'vue'
import {
  EQUIPMENT_SLOTS,
  ITEM_DEFINITIONS,
  RESEARCH_DEFINITIONS,
  RESEARCH_RULES,
  assignCat,
  canEditCat,
  equipItem,
  getAchievements,
  getResearchWorker,
  continueAfterFinale,
  createState,
  deserializeState,
  getRaidOptions,
  getSquadCleanupChance,
  resolveRaidDecision,
  resolveRaidFollowup,
  resolveNinthLife,
  selectResearch,
  serializeState,
  setSquadStyle,
  tick,
  type EquipmentSlot,
  type ItemId,
  type LogEntry,
  type NinthLifeDecision,
  type ResearchId,
  type Speed,
  type State,
  type Squad,
} from './core/simulation'
import { translate, type Locale } from './i18n'
import { createSoundSystem, normalizeSoundPreferences, type SoundPreferences } from './audio'

const AUTOSAVE_KEY = 'nine-lives-corp-autosave-v1'
const HINTS_KEY = 'nine-lives-corp-hints-v1'
const LOCALE_KEY = 'nine-lives-corp-locale-v1'
const SOUND_KEY = 'nine-lives-corp-sound-v1'
let restoredAutosave = false
let initialSaveError = ''

function loadInitialState() {
  try {
    const payload = window.localStorage.getItem(AUTOSAVE_KEY)
    if (!payload) return createState()
    const restored = deserializeState(payload)
    restoredAutosave = true
    return restored
  } catch (error) {
    initialSaveError = error instanceof Error ? error.message : 'Не удалось прочитать автосохранение.'
    return createState()
  }
}

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

const state = reactive(loadInitialState())
let timer: number
let achievementToastTimer: number | undefined
let autosaveTimer: number | undefined
let lastAutosaveAt = 0
let suppressAchievementToast = false
const basePanel = ref<'teams' | 'lab' | 'achievements'>('teams')
const hintsVisible = ref(loadHintsPreference())
const locale = ref<Locale>(loadLocale())
const achievementToast = ref<string>()
const saveInput = ref<HTMLInputElement>()
const soundPreferences = reactive(loadSoundPreferences())
const soundSettingsOpen = ref(false)
const audioStarted = ref(false)
const audioUnavailable = ref(false)
const soundSystem = createSoundSystem(soundPreferences)
const saveStatus = ref<{ key: string; params?: Record<string, string | number> }>({
  key: initialSaveError || (restoredAutosave ? 'save.restored' : 'save.ready'),
})
const tr = (key: string, params?: Record<string, string | number>) => translate(locale.value, key, params)

const speedControls: { speed: Speed; label: string; shortcut: string }[] = [
  { speed: 0, label: 'Ⅱ', shortcut: 'Пробел' },
  { speed: 1, label: '×1', shortcut: '1' },
  { speed: 5, label: '×5', shortcut: '2' },
  { speed: 10, label: '×10', shortcut: '3' },
]
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

function persistAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = undefined
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, serializeState(toRaw(state) as State))
    lastAutosaveAt = Date.now()
    saveStatus.value = { key: 'save.autosaved', params: { time: new Date(lastAutosaveAt).toLocaleTimeString(locale.value === 'ru' ? 'ru-RU' : 'en-US') } }
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
    suppressAchievementToast = true
    state.incident = undefined
    state.storyIncident = undefined
    state.storyResolution = undefined
    Object.assign(state, restored)
    await nextTick()
    suppressAchievementToast = false
    persistAutosave()
    saveStatus.value = { key: 'save.imported', params: { file: file.name } }
  } catch (error) {
    suppressAchievementToast = false
    saveStatus.value = { key: 'save.import_rejected', params: { error: error instanceof Error ? error.message : 'Импорт сохранения не удался' } }
  } finally {
    input.value = ''
  }
}

watch(state, scheduleAutosave, { deep: true })
watch(hintsVisible, visible => {
  try {
    window.localStorage.setItem(HINTS_KEY, visible ? 'visible' : 'hidden')
  } catch {
    // Игра остаётся работоспособной, даже если браузер запретил локальное хранилище.
  }
})
watch(locale, value => {
  document.documentElement.lang = value
  try {
    window.localStorage.setItem(LOCALE_KEY, value)
  } catch {
    // Локализация продолжает работать в текущей сессии без localStorage.
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

onMounted(() => {
  timer = window.setInterval(() => tick(state, 0.25), 250)
  window.addEventListener('keydown', handleSpeedShortcut)
  window.addEventListener('beforeunload', persistAutosave)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('click', unlockAudio, { capture: true })
  window.addEventListener('keydown', unlockAudio, { capture: true })
})
onUnmounted(() => {
  clearInterval(timer)
  if (achievementToastTimer) clearTimeout(achievementToastTimer)
  if (autosaveTimer) clearTimeout(autosaveTimer)
  window.removeEventListener('keydown', handleSpeedShortcut)
  window.removeEventListener('beforeunload', persistAutosave)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('click', unlockAudio, { capture: true })
  window.removeEventListener('keydown', unlockAudio, { capture: true })
  void soundSystem.dispose()
})

const totalRuns = computed(() => state.squads.reduce((total, squad) => total + squad.completed, 0))
const fmtTime = computed(() => `${String(9 + Math.floor(state.time / 3600)).padStart(2, '0')}:${String(Math.floor(state.time / 60) % 60).padStart(2, '0')}`)
const raidOptions = computed(() => getRaidOptions(state))
const primarySquad = computed(() => state.squads.find(squad => squad.id === state.incident?.primarySquadId))
const supportSquad = computed(() => state.squads.find(squad => squad.id === state.incident?.supportSquadId))
const supportSeconds = computed(() => Math.max(0, Math.ceil((supportSquad.value?.travelDuration ?? 0) - (supportSquad.value?.travel ?? 0))))
const storySquad = computed(() => state.squads.find(squad => squad.id === state.storyIncident?.foundBySquadId))
const researchWorker = computed(() => getResearchWorker(state))
const achievements = computed(() => getAchievements(state))
const completedAchievementCount = computed(() => achievements.value.filter(achievement => achievement.completed).length)
const nextAchievement = computed(() => achievements.value.find(achievement => !achievement.completed))

watch(() => state.achievements.completedIds.length, () => {
  if (suppressAchievementToast) return
  const achievementId = state.achievements.completedIds.at(-1)
  const unlocked = achievements.value.find(achievement => achievement.id === achievementId)
  if (!unlocked) return
  achievementToast.value = unlocked.title
  soundSystem.play('achievement')
  if (achievementToastTimer) clearTimeout(achievementToastTimer)
  achievementToastTimer = window.setTimeout(() => { achievementToast.value = undefined }, 4200)
})

watch(() => state.incident?.stage, (stage, previousStage) => {
  if (stage === 'decision' && previousStage !== 'decision') soundSystem.play('alert')
  if (stage === 'support_decision' && previousStage !== 'support_decision') soundSystem.play('support')
})

watch(() => Boolean(state.storyIncident), (active, wasActive) => {
  if (active && !wasActive) soundSystem.play('investigation')
})

const storyChoices: { id: NinthLifeDecision; title: string; tag: string; description: string; fame: number; threat: number; tone: string }[] = [
  { id: 'shelter', title: 'Укрыть дезертира', tag: 'Гуманность', description: 'Дать убежище на базе. Слух укрепит имя корпорации, но приведёт преследователей к нашим воротам.', fame: 15, threat: 20, tone: 'danger' },
  { id: 'interrogate', title: 'Допросить', tag: 'Разведданные', description: 'Проверить показания и собрать полное досье на укрепление ежей. Без эскалации в секторе.', fame: 10, threat: 0, tone: 'intel' },
  { id: 'escort', title: 'Сопроводить к границе', tag: 'Безопасность', description: 'Вывести свидетеля из сектора по тихому маршруту. Надёжно, но без громкой победы.', fame: 5, threat: 0, tone: 'safe' },
  { id: 'exploit', title: 'Использовать данные сразу', tag: 'Инициатива', description: 'Не теряя времени, отправить разведку по координатам. Получим новую точку, но раскроем интерес к базе.', fame: 15, threat: 15, tone: 'action' },
]

function setSpeed(speed: Speed) {
  const blockingIncident = state.incident && state.incident.stage !== 'support_en_route'
  if (blockingIncident && speed !== 0) return
  state.speed = speed
}

function goToNextAchievement() {
  const id = nextAchievement.value?.id
  if (id === 'first_squad' || id === 'field_kit') {
    state.activeView = 'base'
    basePanel.value = 'teams'
  } else if (id === 'research_started') {
    state.activeView = 'base'
    basePanel.value = 'lab'
  } else {
    state.activeView = 'map'
  }
}

function handleAssignment(catId: string, event: Event) {
  assignCat(state, catId, (event.target as HTMLSelectElement).value)
}

function handleEquipment(catId: string, slot: EquipmentSlot, event: Event) {
  const value = (event.target as HTMLSelectElement).value as ItemId | ''
  equipItem(state, catId, slot, value || undefined)
}

function handleSquadStyle(squadId: string, event: Event) {
  setSquadStyle(state, squadId, (event.target as HTMLSelectElement).value as Squad['style'])
}

function equipmentOptions(slot: EquipmentSlot) {
  return ITEM_DEFINITIONS.filter(item => item.slot === slot)
}

function researchPercent(researchId: ResearchId) {
  return Math.min(100, Math.round(state.research.nodes[researchId].progress / RESEARCH_RULES.duration * 100))
}

function catTrait(catId: string) {
  return {
    marlowe: 'Деэскалация · +5 к поддержке',
    pixel: 'Самодиагностика · +5 к уборке',
    rust: 'Тяжёлая работа · +5 к уборке',
    shorokh: 'Паранойя · +10 к поддержке',
    bastion: 'Силовой ответ · +10 к нападению',
    myata: 'Бережёт команду · −10 к ранению',
  }[catId] ?? ''
}

function squadStyle(squad: Squad) {
  const target = squad.target
  const base = { x: 46, y: 51 }
  const duration = squad.travelDuration || 1
  if (!target || squad.phase === 'base') return { left: `${base.x}%`, top: `${base.y}%`, opacity: 0 }
  const ratio = squad.phase === 'outbound' || squad.phase === 'support'
    ? Math.min(1, squad.travel / duration)
    : squad.phase === 'returning'
      ? 1 - Math.min(1, squad.travel / duration)
      : 1
  return { left: `${base.x + (target.x - base.x) * ratio}%`, top: `${base.y + (target.y - base.y) * ratio}%` }
}

function squadLabel(squad: Squad) {
  if (squad.phase === 'base') return tr(squad.members.length ? 'status.base_ready' : 'status.no_squad')
  if (squad.phase === 'outbound') return tr('status.outbound', { mission: squad.target?.title ?? '', seconds: Math.ceil(squad.travelDuration - squad.travel) })
  if (squad.phase === 'returning') return tr('status.returning')
  if (squad.phase === 'support') return tr('status.support', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'incident') return tr('status.incident')
  return tr('status.cleanup', { progress: Math.round(squad.progress / 30 * 100) })
}

function formatLogTime(time: number) {
  const minutes = 540 + Math.floor(time / 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function formatLog(entry: LogEntry) {
  return `${formatLogTime(entry.time)} · ${tr(entry.key, entry.params)}`
}
</script>

<template>
  <main>
    <header class="topbar">
      <div class="brand">NINE <i>LIVES</i><small>CORP / OPERATIONS</small></div>
      <div class="metrics">
        <span>{{ tr('ИЗВЕСТНОСТЬ') }} <b>{{ state.fame }}</b><em>/ 50</em></span>
        <span>{{ tr('ЛОМ') }} <b>{{ state.scrap }}</b></span>
        <span>{{ tr('УГРОЗА') }} <b :class="{ hot: state.threat >= 35 }">{{ state.threat }}</b></span>
        <span>{{ tr('ВРЕМЯ') }} <b>{{ fmtTime }}</b></span>
      </div>
      <nav>
        <button :class="{ active: state.activeView === 'map' }" @click="state.activeView = 'map'">{{ tr('Карта') }}</button>
        <button :class="{ active: state.activeView === 'base' }" @click="state.activeView = 'base'">{{ tr('База') }}</button>
      </nav>
      <div class="language-toggle" :aria-label="tr('Язык')">
        <button :class="{ active: locale === 'ru' }" @click="locale = 'ru'">RU</button>
        <button :class="{ active: locale === 'en' }" @click="locale = 'en'">EN</button>
      </div>
      <div class="sound-control">
        <button
          class="sound-toggle"
          :class="{ active: soundSettingsOpen, muted: soundPreferences.muted }"
          :title="tr('sound.settings')"
          :aria-label="tr('sound.settings')"
          :aria-expanded="soundSettingsOpen"
          @click="soundSettingsOpen = !soundSettingsOpen"
        >
          <span class="speaker-icon" aria-hidden="true"></span>
          <span v-if="!soundPreferences.muted" class="sound-level" aria-hidden="true"><i></i><i></i><i></i></span>
          <span v-else class="mute-mark" aria-hidden="true">×</span>
        </button>
        <section v-if="soundSettingsOpen" class="sound-panel" :aria-label="tr('sound.settings')">
          <header>
            <span>{{ tr('sound.layer') }}</span>
            <b>{{ tr(soundPreferences.muted ? 'sound.off' : audioStarted ? 'sound.active' : audioUnavailable ? 'sound.unavailable' : 'sound.waiting') }}</b>
          </header>
          <label>
            <span>{{ tr('sound.master') }}</span><output>{{ Math.round(soundPreferences.master * 100) }}%</output>
            <input v-model.number="soundPreferences.master" :aria-label="tr('sound.master')" type="range" min="0" max="1" step="0.01">
          </label>
          <label>
            <span>{{ tr('sound.ambient') }}</span><output>{{ Math.round(soundPreferences.ambient * 100) }}%</output>
            <input v-model.number="soundPreferences.ambient" :aria-label="tr('sound.ambient')" type="range" min="0" max="1" step="0.01">
          </label>
          <label>
            <span>{{ tr('sound.signals') }}</span><output>{{ Math.round(soundPreferences.signals * 100) }}%</output>
            <input v-model.number="soundPreferences.signals" :aria-label="tr('sound.signals')" type="range" min="0" max="1" step="0.01">
          </label>
          <footer>
            <button :class="{ active: soundPreferences.muted }" @click="toggleMuted">{{ tr(soundPreferences.muted ? 'sound.enable' : 'sound.mute') }}</button>
            <button :disabled="soundPreferences.muted || soundPreferences.master === 0 || soundPreferences.signals === 0" @click="testSignal">{{ tr('sound.test') }}</button>
          </footer>
        </section>
      </div>
      <div class="speed">
        <button
          v-for="control in speedControls"
          :key="control.speed"
          :class="{ active: state.speed === control.speed }"
          :title="tr('shortcut.label', { shortcut: tr(control.shortcut) })"
          :aria-label="tr('shortcut.aria', { label: control.label, shortcut: tr(control.shortcut) })"
          :aria-keyshortcuts="control.speed === 0 ? 'Space' : control.shortcut"
          :disabled="Boolean(state.incident && state.incident.stage !== 'support_en_route' && control.speed !== 0)"
          @click="setSpeed(control.speed)"
        >{{ control.label }} <kbd>{{ tr(control.shortcut) }}</kbd></button>
      </div>
    </header>

    <div v-if="achievementToast" class="achievement-toast" role="status" aria-live="polite">
      <span>✓</span>
      <div><small>{{ tr('ОПЕРАТИВНОЕ ДОСТИЖЕНИЕ') }}</small><b>{{ tr(achievementToast) }}</b></div>
    </div>

    <section v-if="hintsVisible && nextAchievement" class="guidance-card" :aria-label="tr('Следующая цель')">
      <header>
        <span>{{ tr('СЛЕДУЮЩИЙ ШАГ') }}</span>
        <b>{{ completedAchievementCount }} / {{ achievements.length }}</b>
      </header>
      <h2>{{ tr(nextAchievement.title) }}</h2>
      <p>{{ tr(nextAchievement.hint) }}</p>
      <footer>
        <button @click="hintsVisible = false">{{ tr('Скрыть') }}</button>
        <button class="guidance-action" @click="goToNextAchievement">{{ tr('Перейти') }} →</button>
      </footer>
    </section>
    <button v-else-if="!hintsVisible && nextAchievement" class="guidance-toggle" @click="hintsVisible = true">
      {{ tr('ЦЕЛЬ') }} {{ completedAchievementCount }} / {{ achievements.length }}
    </button>

    <div v-if="state.incident?.stage === 'support_en_route'" class="support-strip">
      <span class="alert-dot"></span>
      <b>{{ tr('support.en_route', { squad: supportSquad?.name ?? '' }) }}</b>
      <span>{{ tr('support.eta', { seconds: supportSeconds }) }}</span>
      <button v-if="state.speed === 0" @click="setSpeed(1)">{{ tr('Продолжить на ×1') }}</button>
    </div>

    <section v-if="state.activeView === 'map'" class="map-view">
      <div class="map-grid" :class="{ 'incident-active': state.incident }">
        <div class="threat-zone" :class="{ elevated: state.threat >= 35, severe: state.threat >= 50 }"></div>
        <div class="district d1">{{ tr('Старый сектор') }}</div>
        <div class="district d2">{{ tr('Промзона') }}</div>
        <div class="district d3">{{ tr('Терминал') }}</div>
        <div class="base-pin"><strong>NL</strong><span>{{ tr('БАЗА') }}</span></div>
        <div
          v-if="state.storyIncident"
          class="story-pin"
          :style="{ left: `${state.storyIncident.x}%`, top: `${state.storyIncident.y}%` }"
        ><span>!</span><b>{{ tr('ДЕЛО 09') }}</b><small>{{ tr('Дезертир ждёт решения') }}</small></div>
        <div v-if="state.storyResolution?.unlockedLocation" class="hedgehog-pin"><span>⌁</span><b>{{ tr('БАЗА ЕЖЕЙ') }}</b><small>{{ tr('координаты подтверждены') }}</small></div>
        <div
          v-for="mission in state.missions.filter(mission => mission.status === 'available')"
          :key="mission.id"
          class="cleanup-pin"
          :style="{ left: `${mission.x}%`, top: `${mission.y}%` }"
        ><span>♜</span><b>{{ tr('УБОРКА') }}</b><small>{{ tr(mission.title) }}</small></div>
        <div
          v-for="mission in state.missions.filter(mission => mission.status === 'assigned')"
          :key="`assigned-${mission.id}`"
          class="cleanup-pin assigned"
          :class="{ danger: state.incident?.missionId === mission.id }"
          :style="{ left: `${mission.x}%`, top: `${mission.y}%` }"
        ><span>♜</span><b>{{ tr(state.incident?.missionId === mission.id ? 'ТРЕВОГА' : 'УБОРКА') }}</b><small>{{ tr(mission.title) }}</small></div>
        <div
          v-for="squad in state.squads"
          :key="squad.id"
          class="squad-marker"
          :class="squad.phase"
          :style="squadStyle(squad)"
        >
          <span v-for="member in squad.members" :key="member" class="cat-silhouette">♟</span>
          <b>{{ tr(squad.name) }}</b>
          <small>{{ squadLabel(squad) }}</small>
        </div>
      </div>
      <aside>
        <h2>{{ tr('ОПЕРАТИВНАЯ ЛЕНТА') }}</h2>
        <p class="goal">{{ tr('Цель: 50 известности и закрытое расследование.') }}</p>
        <div class="case-progress" :class="{ done: state.storyResolution }">
          <span>{{ tr('ДЕЛО 09') }}</span>
          <b>{{ tr(state.storyResolution ? 'ЗАКРЫТО' : state.storyIncident ? 'ТРЕБУЕТ РЕШЕНИЯ' : 'ОЖИДАЕТ СИГНАЛА') }}</b>
        </div>
        <article v-for="(item, index) in state.log" :key="`${index}-${item.time}-${item.key}`">{{ formatLog(item) }}</article>
      </aside>
    </section>

    <section v-else class="base-view">
      <div class="cutaway">
        <button class="room lab" :class="{ selected: basePanel === 'lab' }" @click="basePanel = 'lab'">
          {{ tr('ЛАБОРАТОРИЯ') }}
          <small v-if="state.research.activeId">{{ researchWorker ? tr(researchWorker.name) : tr('Нет исполнителя') }} · {{ researchPercent(state.research.activeId) }}%</small>
          <small v-else>{{ tr('research.count', { completed: Object.values(state.research.nodes).filter(node => node.completed).length }) }}</small>
        </button>
        <button class="room control" :class="{ selected: basePanel === 'achievements' }" @click="basePanel = 'achievements'">
          {{ tr('ДИСПЕТЧЕРСКАЯ') }}
          <small>{{ tr('base.achievement_summary', { completed: completedAchievementCount, total: achievements.length, cleanups: totalRuns }) }}</small>
        </button>
        <button class="room garage" :class="{ selected: basePanel === 'teams' }" @click="basePanel = 'teams'">
          {{ tr('ГАРАЖ И АРСЕНАЛ') }}
          <small>{{ tr('base.garage_summary', { squads: state.squads.filter(squad => squad.phase === 'base').length, items: Object.values(state.inventory).reduce((sum, count) => sum + count, 0) }) }}</small>
        </button>
      </div>
      <aside v-if="basePanel === 'teams'" class="roster base-panel">
        <div class="panel-tabs">
          <button class="active" @click="basePanel = 'teams'">{{ tr('Состав / склад') }}</button>
          <button @click="basePanel = 'lab'">{{ tr('Лаборатория') }}</button>
          <button @click="basePanel = 'achievements'">{{ tr('Достижения') }}</button>
        </div>
        <h2>{{ tr('СОСТАВ И ЭКИПИРОВКА') }}</h2>
        <p class="roster-hint">{{ tr('Любое изменение ставит время на паузу. Состав и снаряжение отряда в поле заблокированы.') }}</p>
        <div v-for="squad in state.squads" :key="squad.id" class="squad-status squad-config">
          <div><b>{{ tr(squad.name) }}</b><span>{{ tr('squad.cleanup_forecast', { cats: squad.members.length, chance: getSquadCleanupChance(state, squad) }) }}</span></div>
          <select :value="squad.style" :disabled="squad.phase !== 'base'" @change="handleSquadStyle(squad.id, $event)">
            <option value="careful">{{ tr('careful') }}</option>
            <option value="balanced">{{ tr('balanced') }}</option>
            <option value="risky">{{ tr('risky') }}</option>
          </select>
        </div>
        <details v-for="cat in state.cats" :key="cat.id" class="cat-card" :class="{ injured: cat.injuredRemaining > 0 }">
          <summary>
            <img :src="`/assets/art/portrait-${cat.id}-v1.png`" :alt="tr(cat.name)">
            <span><b>{{ tr(cat.name) }}</b><small v-if="cat.injuredRemaining > 0" class="injury-label">{{ tr('cat.injured', { seconds: Math.ceil(cat.injuredRemaining) }) }}</small><small v-else>{{ tr('cat.energy', { role: cat.role, energy: Math.round(cat.energy) }) }}</small></span>
            <select :value="cat.assignedTo || ''" :disabled="!canEditCat(state, cat.id)" :aria-label="tr('Назначение в отряд')" @click.stop @change="handleAssignment(cat.id, $event)">
              <option value="">{{ tr('не назначен') }}</option>
              <option v-for="squad in state.squads" :key="squad.id" :value="squad.id" :disabled="squad.phase !== 'base'">{{ tr(squad.name) }}</option>
            </select>
          </summary>
          <div class="cat-trait"><span>{{ tr(catTrait(cat.id)) }}</span><small>{{ tr('cat.stats', { combat: cat.combat, tech: cat.tech, perception: cat.perception, scouting: cat.scouting }) }}</small></div>
          <div class="equipment-grid">
            <label v-for="slot in EQUIPMENT_SLOTS" :key="slot.id">
              <span>{{ tr(slot.name) }}</span>
              <select :value="cat.equipment[slot.id] || ''" :disabled="!canEditCat(state, cat.id) || slot.id === 'suit'" @change="handleEquipment(cat.id, slot.id, $event)">
                <option value="">{{ tr(slot.id === 'suit' ? 'нет предметов в PoC' : 'пусто') }}</option>
                <option v-for="item in equipmentOptions(slot.id)" :key="item.id" :value="item.id" :disabled="state.inventory[item.id] <= 0 && cat.equipment[slot.id] !== item.id">
                  {{ tr('item.stock', { item: item.name, count: state.inventory[item.id] }) }}
                </option>
              </select>
            </label>
          </div>
        </details>
        <section class="warehouse">
          <h3>{{ tr('СКЛАД') }}</h3>
          <div v-for="item in ITEM_DEFINITIONS" :key="item.id" :class="{ empty: state.inventory[item.id] === 0 }">
            <span><b>{{ tr(item.name) }}</b><small>{{ tr(item.effect) }}</small></span><strong>×{{ state.inventory[item.id] }}</strong>
          </div>
        </section>
      </aside>
      <aside v-else-if="basePanel === 'lab'" class="base-panel laboratory-panel">
        <div class="panel-tabs">
          <button @click="basePanel = 'teams'">{{ tr('Состав / склад') }}</button>
          <button class="active" @click="basePanel = 'lab'">{{ tr('Лаборатория') }}</button>
          <button @click="basePanel = 'achievements'">{{ tr('Достижения') }}</button>
        </div>
        <h2>{{ tr('ЛАБОРАТОРИЯ') }}</h2>
        <div class="lab-status">
          <span>{{ tr('ИСПОЛНИТЕЛЬ') }}</span>
          <b>{{ researchWorker ? tr(researchWorker.name) : tr(state.research.activeId ? 'Нет доступного кота' : 'Не назначен') }}</b>
          <small v-if="researchWorker">{{ tr('worker.stats', { tech: researchWorker.tech, energy: Math.round(researchWorker.energy) }) }}</small>
          <small v-else>{{ tr('Нужен свободный здоровый кот с бодростью от 50%') }}</small>
        </div>
        <p class="roster-hint">{{ tr('research.rules', { seconds: RESEARCH_RULES.duration, scrap: RESEARCH_RULES.scrapCost }) }}</p>
        <article v-for="research in RESEARCH_DEFINITIONS" :key="research.id" class="research-card" :class="{ active: state.research.activeId === research.id, complete: state.research.nodes[research.id].completed }">
          <header><span>{{ tr(state.research.nodes[research.id].completed ? 'ЗАВЕРШЕНО' : state.research.activeId === research.id ? 'В РАБОТЕ' : 'ДОСТУПНО') }}</span><strong>{{ researchPercent(research.id) }}%</strong></header>
          <h3>{{ tr(research.name) }}</h3>
          <p>{{ tr(research.result) }}</p>
          <div class="research-progress"><i :style="{ width: `${researchPercent(research.id)}%` }"></i></div>
          <footer><span>{{ tr('research.scrap', { spent: state.research.nodes[research.id].scrapSpent, cost: RESEARCH_RULES.scrapCost }) }}</span><button v-if="!state.research.nodes[research.id].completed" :class="{ active: state.research.activeId === research.id }" @click="selectResearch(state, state.research.activeId === research.id ? undefined : research.id)">{{ tr(state.research.activeId === research.id ? 'Приостановить' : 'Исследовать') }}</button></footer>
        </article>
      </aside>
      <aside v-else class="base-panel achievements-panel">
        <div class="panel-tabs">
          <button @click="basePanel = 'teams'">{{ tr('Состав / склад') }}</button>
          <button @click="basePanel = 'lab'">{{ tr('Лаборатория') }}</button>
          <button class="active" @click="basePanel = 'achievements'">{{ tr('Достижения') }}</button>
        </div>
        <div class="achievement-heading">
          <span>{{ tr('ДОСЬЕ КОРПОРАЦИИ · ОТКРЫТЫЕ') }}</span>
          <h2>{{ tr('ОПЕРАТИВНЫЕ ДОСТИЖЕНИЯ') }}</h2>
          <p>{{ tr('Эти ориентиры ведут по основному циклу текущего сценария.') }}</p>
        </div>
        <div class="achievement-summary">
          <strong>{{ completedAchievementCount }}</strong>
          <span>{{ tr('achievement.completed_count', { total: achievements.length }) }}</span>
          <div><i :style="{ width: `${completedAchievementCount / achievements.length * 100}%` }"></i></div>
        </div>
        <article
          v-for="(achievement, index) in achievements"
          :key="achievement.id"
          class="achievement-row"
          :class="{ complete: achievement.completed, current: nextAchievement?.id === achievement.id }"
        >
          <span class="achievement-mark">{{ achievement.completed ? '✓' : String(index + 1).padStart(2, '0') }}</span>
          <div>
            <small>{{ tr(achievement.completed ? 'ВЫПОЛНЕНО' : nextAchievement?.id === achievement.id ? 'ТЕКУЩАЯ ЦЕЛЬ' : 'ОТКРЫТО') }}</small>
            <b>{{ tr(achievement.title) }}</b>
            <p>{{ tr(achievement.description) }}</p>
          </div>
        </article>
        <button class="hint-setting" @click="hintsVisible = !hintsVisible">
          {{ tr(hintsVisible ? 'Скрыть контекстные подсказки' : 'Показывать контекстные подсказки') }}
        </button>
        <section class="save-controls">
          <header>
            <span>{{ tr('ДАННЫЕ СЕССИИ') }}</span>
            <i></i>
          </header>
          <p>{{ tr(saveStatus.key, saveStatus.params) }}</p>
          <div>
            <button @click="exportSave">{{ tr('Выгрузить JSON') }}</button>
            <button @click="saveInput?.click()">{{ tr('Загрузить JSON') }}</button>
          </div>
          <input ref="saveInput" type="file" accept=".json,application/json" @change="importSave">
        </section>
      </aside>
    </section>

    <div v-if="state.incident && state.incident.stage !== 'support_en_route'" class="incident-overlay">
      <section class="incident-card" role="dialog" aria-modal="true" aria-labelledby="incident-title">
        <div class="incident-kicker"><span></span> {{ tr('НЕШТАТНАЯ СИТУАЦИЯ · ВРЕМЯ ОСТАНОВЛЕНО') }}</div>
        <template v-if="state.incident.stage === 'decision'">
          <h1 id="incident-title">{{ tr('Встреча с рейдерами') }}</h1>
          <p>{{ tr('raid.description', { squad: primarySquad?.name ?? '' }) }}</p>
          <div class="incident-facts">
            <span>{{ tr('ОТРЯД') }} <b>{{ tr('cats.count', { count: primarySquad?.members.length ?? 0 }) }}</b></span>
            <span>{{ tr('ПРОГРЕСС') }} <b>50%</b></span>
            <span>{{ tr('НАГРАДА ПОД УГРОЗОЙ') }} <b>{{ tr('scrap.count', { count: 10 }) }}</b></span>
          </div>
          <div class="incident-actions">
            <button class="choice safe" @click="resolveRaidDecision(state, 'escape')">
              <span><b>{{ tr('Сбежать') }}</b><small>{{ tr('Миссия отменится без добычи и ранений.') }}</small></span><strong>100%</strong>
            </button>
            <button class="choice" :disabled="!raidOptions?.attack.available" @click="resolveRaidDecision(state, 'attack')">
              <span><b>{{ tr('Напасть') }}</b><small>{{ tr(raidOptions?.attack.available ? 'Использовать нелетальное оружие и вытеснить рейдеров.' : raidOptions?.attack.reason ?? '') }}</small></span><strong>{{ raidOptions?.attack.chance ? `${raidOptions.attack.chance}%` : tr('ЗАКРЫТО') }}</strong>
            </button>
            <button class="choice support" :disabled="!raidOptions?.support.available" @click="resolveRaidDecision(state, 'support')">
              <span><b>{{ tr('Укрыться и запросить поддержку') }}</b><small v-if="raidOptions?.support.available">{{ tr('raid.support_description', { squad: raidOptions.support.supportSquadName ?? '', seconds: state.research.nodes.emergency_dispatch.completed ? RESEARCH_RULES.researchedSupportTravelTime : RESEARCH_RULES.supportTravelTime }) }}</small><small v-else>{{ tr(raidOptions?.support.reason ?? '') }}</small></span>
              <strong>{{ raidOptions?.support.chance ? `${raidOptions.support.chance}%` : tr('НЕТ') }}</strong>
            </button>
          </div>
        </template>
        <template v-else>
          <h1 id="incident-title">{{ tr('Поддержка прибыла') }}</h1>
          <p>{{ tr('raid.support_arrived_description', { squad: supportSquad?.name ?? '' }) }}</p>
          <div class="incident-actions followup">
            <button class="choice safe" @click="resolveRaidFollowup(state, 'retreat')">
              <span><b>{{ tr('Отступить вместе') }}</b><small>{{ tr('Безопасно уйти без добычи.') }}</small></span><strong>100%</strong>
            </button>
            <button class="choice support" @click="resolveRaidFollowup(state, 'continue')">
              <span><b>{{ tr('Продолжить разбор ситуации') }}</b><small>{{ tr('Вытеснить рейдеров и закончить уборку.') }}</small></span><strong>100%</strong>
            </button>
          </div>
        </template>
      </section>
    </div>

    <div v-if="state.storyIncident && !state.incident" class="story-overlay">
      <section class="story-card" role="dialog" aria-modal="true" aria-labelledby="story-title">
        <div class="case-number"><span>{{ tr('РАССЛЕДОВАНИЕ') }}</span><strong>09</strong></div>
        <div class="story-heading">
          <div class="story-kicker">{{ tr('ВХОДЯЩЕЕ ДЕЛО · ВРЕМЯ ОСТАНОВЛЕНО') }}</div>
          <h1 id="story-title">{{ tr('Девятая жизнь') }}</h1>
          <p>{{ tr('story.description', { squad: storySquad?.name ?? '' }) }}</p>
          <div class="witness-line"><span>{{ tr('СВИДЕТЕЛЬ') }}</span><b>{{ tr('Позывной «Игла»') }}</b><i>{{ tr('показания не подтверждены') }}</i></div>
        </div>
        <div class="story-choices">
          <button
            v-for="choice in storyChoices"
            :key="choice.id"
            class="story-choice"
            :class="choice.tone"
            @click="resolveNinthLife(state, choice.id)"
          >
            <span class="choice-index">0{{ storyChoices.indexOf(choice) + 1 }}</span>
            <span class="choice-copy"><small>{{ tr(choice.tag) }}</small><b>{{ tr(choice.title) }}</b><em>{{ tr(choice.description) }}</em></span>
            <span class="choice-impact"><b>+{{ choice.fame }}</b><small>{{ tr('известность') }}</small><strong :class="{ quiet: !choice.threat }">{{ choice.threat ? `+${choice.threat}` : '±0' }}</strong><small>{{ tr('угроза') }}</small></span>
          </button>
        </div>
        <footer><span>{{ tr('Решение нельзя отменить') }}</span><span>{{ tr('Каждый вариант открывает отдельную будущую ветку') }}</span></footer>
      </section>
    </div>

    <div v-if="state.finalSummaryVisible && state.storyResolution" class="final-overlay">
      <section class="final-card" role="dialog" aria-modal="true" aria-labelledby="final-title">
        <div class="final-stamp">{{ tr('ДЕЛО ЗАКРЫТО') }}</div>
        <div class="final-kicker">NINE LIVES CORP · {{ tr('ОПЕРАТИВНАЯ СВОДКА 09') }}</div>
        <h1 id="final-title">{{ tr('Девятая жизнь') }}</h1>
        <p class="final-lead">{{ tr(state.storyResolution.outcome) }}</p>
        <div class="final-metrics">
          <div><small>{{ tr('ИЗВЕСТНОСТЬ') }}</small><b>{{ state.fame }}</b><span>{{ tr('/ 50 · ЦЕЛЬ ВЫПОЛНЕНА') }}</span></div>
          <div><small>{{ tr('ЛОКАЛЬНАЯ УГРОЗА') }}</small><b>{{ state.threat }}</b><span>{{ tr(state.threat >= 50 ? 'ВЫСОКАЯ' : state.threat >= 35 ? 'ПОВЫШЕННАЯ' : 'СТАБИЛЬНАЯ') }}</span></div>
          <div><small>{{ tr('УСПЕШНЫЕ УБОРКИ') }}</small><b>{{ totalRuns }}</b><span>{{ tr('АВТОНОМНЫЙ ЦИКЛ РАБОТАЕТ') }}</span></div>
        </div>
        <div class="final-result">
          <span>{{ tr('ПРИНЯТОЕ РЕШЕНИЕ') }}</span>
          <h2>{{ tr(state.storyResolution.title) }}</h2>
          <p>{{ tr('Открыта будущая ветка:') }} <b>{{ tr(state.storyResolution.branch) }}</b></p>
          <div><i>{{ tr('fame.delta', { fame: state.storyResolution.fameDelta }) }}</i><i :class="{ calm: !state.storyResolution.threatDelta }">{{ tr(state.storyResolution.threatDelta ? 'threat.delta' : 'угроза без изменений', { threat: state.storyResolution.threatDelta }) }}</i></div>
        </div>
        <button class="continue-button" @click="continueAfterFinale(state)">{{ tr('Продолжить в песочнице') }} <span>→</span></button>
      </section>
    </div>
  </main>
</template>
