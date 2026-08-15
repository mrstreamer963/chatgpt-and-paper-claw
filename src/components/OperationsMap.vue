<script setup lang="ts">
import { GAME_RULES, type LogEntry, type Squad, type State } from '../core/simulation'
import { translate, type Locale } from '../i18n'
import catTokensUrl from '../../assets/art/cat-tokens.svg?url'
import uiIconsUrl from '../../assets/art/ui-icons.svg?url'

const props = defineProps<{ state: State; locale: Locale }>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)

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
  const lane = squad.id === 'alpha' ? -1 : 1
  const x = base.x + (target.x - base.x) * ratio + lane * 4.2
  const y = base.y + (target.y - base.y) * ratio + lane * 3.1
  return { left: `${Math.max(5, Math.min(95, x))}%`, top: `${Math.max(7, Math.min(93, y))}%` }
}

function squadLabel(squad: Squad) {
  if (squad.phase === 'base') return tr(squad.members.length ? 'status.base_ready' : 'status.no_squad')
  if (squad.phase === 'outbound') return tr('status.outbound', { mission: squad.target?.title ?? '', seconds: Math.ceil(squad.travelDuration - squad.travel) })
  if (squad.phase === 'returning') return tr('status.returning')
  if (squad.phase === 'support') return tr('status.support', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'incident') return tr('status.incident')
  return tr('status.cleanup', { progress: Math.round(squad.progress / GAME_RULES.cleanupDuration * 100) })
}

function formatLog(entry: LogEntry) {
  const minutes = 540 + Math.floor(entry.time / 60)
  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return `${time} · ${tr(entry.key, entry.params)}`
}
</script>

<template>
  <section class="map-view">
    <div class="map-grid" :class="{ 'incident-active': state.incident }">
      <svg class="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line v-for="squad in state.squads.filter(candidate => candidate.target && candidate.phase !== 'base')" :key="`route-${squad.id}`" x1="46" y1="51" :x2="squad.target?.x" :y2="squad.target?.y" :class="squad.id" />
      </svg>
      <div class="threat-zone" :class="{ elevated: state.threat >= GAME_RULES.elevatedThreat, severe: state.threat >= GAME_RULES.severeThreat }"></div>
      <div class="district d1">{{ tr('Старый сектор') }}</div><div class="district d2">{{ tr('Промзона') }}</div><div class="district d3">{{ tr('Терминал') }}</div>
      <div class="base-pin"><strong>NL</strong><span>{{ tr('БАЗА') }}</span></div>
      <div v-if="state.storyIncident" class="story-pin" :style="{ left: `${state.storyIncident.x}%`, top: `${state.storyIncident.y}%` }"><span>!</span><b>{{ tr('ДЕЛО 09') }}</b><small>{{ tr('Дезертир ждёт решения') }}</small></div>
      <div v-if="state.storyResolution?.unlockedLocation" class="hedgehog-pin"><span>⌁</span><b>{{ tr('БАЗА ЕЖЕЙ') }}</b><small>{{ tr('координаты подтверждены') }}</small></div>
      <div v-for="mission in state.missions.filter(mission => mission.status === 'available')" :key="mission.id" class="cleanup-pin" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span><b>{{ tr('УБОРКА') }}</b><small>{{ tr(mission.title) }}</small></div>
      <div v-for="mission in state.missions.filter(mission => mission.status === 'assigned')" :key="`assigned-${mission.id}`" class="cleanup-pin assigned" :class="{ danger: state.incident?.missionId === mission.id }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span><b>{{ tr(state.incident?.missionId === mission.id ? 'ТРЕВОГА' : 'УБОРКА') }}</b><small>{{ tr(mission.title) }}</small></div>
      <div v-for="squad in state.squads" :key="squad.id" class="squad-marker" :class="[squad.phase, squad.id]" :style="squadStyle(squad)">
        <div class="map-squad-tokens"><svg v-for="member in squad.members" :key="member" class="cat-silhouette" viewBox="0 0 64 64" aria-hidden="true"><use :href="`${catTokensUrl}#token-${member}`" /></svg></div>
        <div class="squad-callout"><b>{{ tr(squad.name) }}</b><small>{{ squadLabel(squad) }}</small></div>
      </div>
    </div>
    <aside>
      <h2>{{ tr('ОПЕРАТИВНАЯ ЛЕНТА') }}</h2>
      <p class="goal">{{ tr('objective.summary', { fame: GAME_RULES.fameGoal }) }}</p>
      <div class="case-progress" :class="{ done: state.storyResolution }"><span>{{ tr('ДЕЛО 09') }}</span><b>{{ tr(state.storyResolution ? 'ЗАКРЫТО' : state.storyIncident ? 'ТРЕБУЕТ РЕШЕНИЯ' : 'ОЖИДАЕТ СИГНАЛА') }}</b></div>
      <article v-for="(item, index) in state.log" :key="`${index}-${item.time}-${item.key}`">{{ formatLog(item) }}</article>
    </aside>
  </section>
</template>
