<script setup lang="ts">
import { GAME_RULES, type Speed, type State } from '@nine-lives/game-core'
import { translate, type Locale } from '../i18n'
import type { SoundPreferences } from '../audio'

const props = defineProps<{
  state: State
  activeView: 'map' | 'base'
  locale: Locale
  soundPreferences: SoundPreferences
  soundSettingsOpen: boolean
  audioStarted: boolean
  audioUnavailable: boolean
  formattedTime: string
}>()

const emit = defineEmits<{
  navigate: [view: 'map' | 'base']
  locale: [locale: Locale]
  soundPanel: [open: boolean]
  soundPreference: [key: 'master' | 'ambient' | 'signals', value: number]
  toggleMuted: []
  testSignal: []
  speed: [speed: Speed]
}>()

const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)
const speedControls: { speed: Speed; label: string; shortcut: string }[] = [
  { speed: 0, label: 'Ⅱ', shortcut: 'Пробел' },
  { speed: 1, label: '×1', shortcut: '1' },
  { speed: 5, label: '×5', shortcut: '2' },
  { speed: 10, label: '×10', shortcut: '3' },
]

function rangeValue(event: Event) {
  return Number((event.target as HTMLInputElement).value)
}
</script>

<template>
  <header class="topbar">
    <div class="brand">NINE <i>LIVES</i><small>CORP / OPERATIONS</small></div>
    <div class="metrics">
      <span>{{ tr('ИЗВЕСТНОСТЬ') }} <b>{{ state.fame }}</b><em>/ {{ GAME_RULES.fameGoal }}</em></span>
      <span>{{ tr('ЛОМ') }} <b>{{ state.scrap }}</b></span>
      <span>{{ tr('УГРОЗА') }} <b :class="{ hot: state.threat >= GAME_RULES.elevatedThreat }">{{ state.threat }}</b></span>
      <span>{{ tr('ВРЕМЯ') }} <b>{{ formattedTime }}</b></span>
    </div>
    <nav>
      <button :class="{ active: activeView === 'map' }" @click="emit('navigate', 'map')">{{ tr('Карта') }}</button>
      <button :class="{ active: activeView === 'base' }" @click="emit('navigate', 'base')">{{ tr('База') }}</button>
    </nav>
    <div class="language-toggle" :aria-label="tr('Язык')">
      <button :class="{ active: locale === 'ru' }" @click="emit('locale', 'ru')">RU</button>
      <button :class="{ active: locale === 'en' }" @click="emit('locale', 'en')">EN</button>
    </div>
    <div class="sound-control">
      <button
        class="sound-toggle"
        :class="{ active: soundSettingsOpen, muted: soundPreferences.muted }"
        :title="tr('sound.settings')"
        :aria-label="tr('sound.settings')"
        :aria-expanded="soundSettingsOpen"
        @click="emit('soundPanel', !soundSettingsOpen)"
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
          <input :value="soundPreferences.master" :aria-label="tr('sound.master')" type="range" min="0" max="1" step="0.01" @input="emit('soundPreference', 'master', rangeValue($event))">
        </label>
        <label>
          <span>{{ tr('sound.ambient') }}</span><output>{{ Math.round(soundPreferences.ambient * 100) }}%</output>
          <input :value="soundPreferences.ambient" :aria-label="tr('sound.ambient')" type="range" min="0" max="1" step="0.01" @input="emit('soundPreference', 'ambient', rangeValue($event))">
        </label>
        <label>
          <span>{{ tr('sound.signals') }}</span><output>{{ Math.round(soundPreferences.signals * 100) }}%</output>
          <input :value="soundPreferences.signals" :aria-label="tr('sound.signals')" type="range" min="0" max="1" step="0.01" @input="emit('soundPreference', 'signals', rangeValue($event))">
        </label>
        <footer>
          <button :class="{ active: soundPreferences.muted }" @click="emit('toggleMuted')">{{ tr(soundPreferences.muted ? 'sound.enable' : 'sound.mute') }}</button>
          <button :disabled="soundPreferences.muted || soundPreferences.master === 0 || soundPreferences.signals === 0" @click="emit('testSignal')">{{ tr('sound.test') }}</button>
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
        @click="emit('speed', control.speed)"
      >{{ control.label }} <kbd>{{ tr(control.shortcut) }}</kbd></button>
    </div>
  </header>
</template>
