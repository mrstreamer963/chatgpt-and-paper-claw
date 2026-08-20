<script setup lang="ts">
import { computed, ref } from 'vue'
import { getAchievements, successfulCleanups } from '@nine-lives/game-core'
import { translate } from './i18n'
import { useGameSession } from './useGameSession'
import OpsTopBar from './components/OpsTopBar.vue'
import OperationsMap from './components/OperationsMap.vue'
import BaseOperations from './components/BaseOperations.vue'
import GameOverlays from './components/GameOverlays.vue'

const {
  state,
  activeView,
  hintsVisible,
  locale,
  eventToast,
  newGameConfirmOpen,
  soundPreferences,
  soundSettingsOpen,
  audioStarted,
  audioUnavailable,
  saveStatus,
  setSpeed,
  assignCat,
  createSquad,
  disbandSquad,
  equipItem,
  setSquadStyle,
  setSquadAutoDispatch,
  dispatchSquadToMission,
  assistMission,
  splitSquad,
  mergeSquads,
  moveSquadToPoint,
  returnSquadToBase,
  selectResearch,
  resolveRaidDecision,
  resolveRaidFollowup,
  resolveNinthLife,
  continueAfterFinale,
  exportSave,
  importSave,
  requestNewGame,
  resetProgress: resetSessionProgress,
  toggleMuted,
  testSignal,
} = useGameSession()

const basePanel = ref<'teams' | 'lab' | 'achievements'>('teams')
const tr = (key: string, params?: Record<string, string | number>) => translate(locale.value, key, params)
const totalRuns = computed(() => successfulCleanups(state.value))
const formattedTime = computed(() => `${String(9 + Math.floor(state.value.time / 3600)).padStart(2, '0')}:${String(Math.floor(state.value.time / 60) % 60).padStart(2, '0')}`)
const supportSquad = computed(() => state.value.squads.find(squad => squad.id === state.value.incident?.supportSquadId))
const supportSeconds = computed(() => Math.max(0, Math.ceil((supportSquad.value?.travelDuration ?? 0) - (supportSquad.value?.travel ?? 0))))
const achievements = computed(() => getAchievements(state.value))
const completedAchievementCount = computed(() => achievements.value.filter(achievement => achievement.completed).length)
const nextAchievement = computed(() => achievements.value.find(achievement => !achievement.completed))

function goToNextAchievement() {
  const id = nextAchievement.value?.id
  if (id === 'first_squad' || id === 'field_kit') {
    activeView.value = 'base'
    basePanel.value = 'teams'
  } else if (id === 'research_started') {
    activeView.value = 'base'
    basePanel.value = 'lab'
  } else {
    activeView.value = 'map'
  }
}

function setSoundPreference(key: 'master' | 'ambient' | 'signals', value: number) {
  soundPreferences[key] = value
}

async function resetProgress() {
  await resetSessionProgress()
  basePanel.value = 'teams'
}
</script>

<template>
  <main>
    <OpsTopBar
      :state="state"
      :active-view="activeView"
      :locale="locale"
      :sound-preferences="soundPreferences"
      :sound-settings-open="soundSettingsOpen"
      :audio-started="audioStarted"
      :audio-unavailable="audioUnavailable"
      :formatted-time="formattedTime"
      @navigate="activeView = $event"
      @locale="locale = $event"
      @sound-panel="soundSettingsOpen = $event"
      @sound-preference="setSoundPreference"
      @toggle-muted="toggleMuted"
      @test-signal="testSignal"
      @speed="setSpeed"
    />

    <div v-if="eventToast" class="achievement-toast" :class="`toast-${eventToast.tone}`" role="status" aria-live="assertive"><span>{{ eventToast.tone === 'achievement' ? '✓' : '!' }}</span><div><small>{{ tr(eventToast.label) }}</small><b>{{ tr(eventToast.title) }}</b></div></div>

    <section v-if="hintsVisible && nextAchievement" class="guidance-card" :aria-label="tr('Следующая цель')">
      <header><span>{{ tr('СЛЕДУЮЩИЙ ШАГ') }}</span><b>{{ completedAchievementCount }} / {{ achievements.length }}</b></header>
      <h2>{{ tr(nextAchievement.title) }}</h2><p>{{ tr(nextAchievement.hint) }}</p>
      <footer><button @click="hintsVisible = false">{{ tr('Скрыть') }}</button><button class="guidance-action" @click="goToNextAchievement">{{ tr('Перейти') }} →</button></footer>
    </section>
    <button v-else-if="!hintsVisible && nextAchievement" class="guidance-toggle" @click="hintsVisible = true">{{ tr('ЦЕЛЬ') }} {{ completedAchievementCount }} / {{ achievements.length }}</button>

    <div v-if="state.incident?.stage === 'support_en_route'" class="support-strip"><span class="alert-dot"></span><b>{{ tr('support.en_route', { squad: supportSquad?.name ?? '' }) }}</b><span>{{ tr('support.eta', { seconds: supportSeconds }) }}</span><button v-if="state.speed === 0" @click="setSpeed(1)">{{ tr('Продолжить на ×1') }}</button></div>

    <OperationsMap v-if="activeView === 'map'" :state="state" :locale="locale" @dispatch="dispatchSquadToMission" @assist="assistMission" @split="splitSquad" @merge="mergeSquads" @move="moveSquadToPoint" @return-home="returnSquadToBase" />
    <BaseOperations
      v-else
      :state="state"
      :locale="locale"
      :panel="basePanel"
      :achievements="achievements"
      :completed-achievement-count="completedAchievementCount"
      :next-achievement="nextAchievement"
      :hints-visible="hintsVisible"
      :total-runs="totalRuns"
      :save-status="saveStatus"
      :assign-cat="assignCat"
      :create-squad="createSquad"
      :disband-squad="disbandSquad"
      :equip-item="equipItem"
      :set-squad-style="setSquadStyle"
      @panel="basePanel = $event"
      @auto-dispatch="setSquadAutoDispatch"
      @research="selectResearch"
      @hints="hintsVisible = $event"
      @export-save="exportSave"
      @import-save="importSave"
      @new-game="requestNewGame"
    />

    <GameOverlays
      :state="state"
      :locale="locale"
      :new-game-confirm-open="newGameConfirmOpen"
      :total-runs="totalRuns"
      @cancel-new-game="newGameConfirmOpen = false"
      @new-game="requestNewGame"
      @reset="resetProgress"
      @raid-decision="resolveRaidDecision"
      @raid-followup="resolveRaidFollowup"
      @story-decision="resolveNinthLife"
      @continue-finale="continueAfterFinale"
    />
  </main>
</template>
