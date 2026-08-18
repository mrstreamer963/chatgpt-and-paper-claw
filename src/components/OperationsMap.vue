<script setup lang="ts">
import { computed, ref } from 'vue'
import { GAME_RULES, getCleanupSecondsRemaining, getManualDispatchBlockReason, getSquadMapPosition, type LogEntry, type Mission, type Squad, type State } from '@nine-lives/game-core'
import { translate, type Locale } from '../i18n'
import catTokensUrl from '../../assets/art/cat-tokens.svg?url'
import uiIconsUrl from '../../assets/art/ui-icons.svg?url'

const props = defineProps<{ state: State; locale: Locale }>()
const emit = defineEmits<{ dispatch: [squadId: string, missionId: string]; returnHome: [squadId: string] }>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)
const base = { x: 46, y: 51 }
const selectedMissionId = ref<string>()
const selectedMission = computed(() => props.state.missions.find(mission => mission.id === selectedMissionId.value && mission.status === 'available'))

function squadPosition(squad: Squad) {
  const { x, y } = getSquadMapPosition(squad)
  return { x: Math.max(5, Math.min(95, x)), y: Math.max(7, Math.min(93, y)) }
}

function squadStyle(squad: Squad) {
  const position = squadPosition(squad)
  if (squad.phase === 'base') return { left: `${base.x}%`, top: `${base.y}%`, opacity: 0 }
  return { left: `${position.x}%`, top: `${position.y}%` }
}

function route(squad: Squad) {
  const position = squadPosition(squad)
  if (squad.phase === 'returning') return { x1: position.x, y1: position.y, x2: base.x, y2: base.y }
  return { x1: position.x, y1: position.y, x2: squad.target?.x ?? position.x, y2: squad.target?.y ?? position.y }
}

function isActiveAssignedMission(mission: Mission) {
  if (mission.status !== 'assigned') return false
  return props.state.squads.find(squad => squad.id === mission.squadId)?.phase !== 'returning'
}

function squadLabel(squad: Squad) {
  if (squad.phase === 'base') return tr(squad.members.length ? squad.autoDispatch ? 'status.base_ready' : 'status.awaiting_order' : 'status.no_squad')
  if (squad.phase === 'field') return tr('status.field')
  if (squad.phase === 'outbound') return tr('status.outbound', { mission: squad.target?.title ?? '', seconds: Math.ceil(squad.travelDuration - squad.travel) })
  if (squad.phase === 'returning') return tr('status.returning')
  if (squad.phase === 'support') return tr('status.support', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'assisting') return tr('status.assisting')
  if (squad.phase === 'incident') return tr('status.incident')
  return tr('status.cleanup', {
    progress: Math.round(squad.progress / GAME_RULES.cleanupWork * 100),
    seconds: Math.ceil(getCleanupSecondsRemaining(props.state, squad)),
  })
}

function selectMission(missionId: string) {
  selectedMissionId.value = selectedMissionId.value === missionId ? undefined : missionId
}

function dispatch(squadId: string, missionId: string) {
  emit('dispatch', squadId, missionId)
  selectedMissionId.value = undefined
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
        <line v-for="squad in state.squads.filter(candidate => candidate.target && ['outbound', 'support', 'returning'].includes(candidate.phase))" :key="`route-${squad.id}`" v-bind="route(squad)" :class="squad.id" />
      </svg>
      <div class="threat-zone" :class="{ elevated: state.threat >= GAME_RULES.elevatedThreat, severe: state.threat >= GAME_RULES.severeThreat }"></div>
      <div class="district d1">{{ tr('Старый сектор') }}</div><div class="district d2">{{ tr('Промзона') }}</div><div class="district d3">{{ tr('Терминал') }}</div>
      <div class="base-pin"><strong>NL</strong><span>{{ tr('БАЗА') }}</span></div>
      <div v-if="state.storyIncident" class="story-pin" :style="{ left: `${state.storyIncident.x}%`, top: `${state.storyIncident.y}%` }"><span>!</span><b>{{ tr('ДЕЛО 09') }}</b><small>{{ tr('Дезертир ждёт решения') }}</small></div>
      <div v-if="state.storyResolution?.unlockedLocation" class="hedgehog-pin"><span>⌁</span><b>{{ tr('БАЗА ЕЖЕЙ') }}</b><small>{{ tr('координаты подтверждены') }}</small></div>
      <button v-for="mission in state.missions.filter(mission => mission.status === 'available')" :key="mission.id" type="button" class="cleanup-pin" :class="{ selected: selectedMissionId === mission.id, 'enhanced-alert': mission.priority > 1 && state.research.nodes.emergency_dispatch.completed }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" :aria-label="tr('dispatch.select_mission', { mission: mission.title })" @click="selectMission(mission.id)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span><b>{{ tr(mission.priority > 1 ? 'ПРИОРИТЕТ' : 'УБОРКА') }}</b><small>{{ tr(mission.title) }}</small></button>
      <div v-for="mission in state.missions.filter(isActiveAssignedMission)" :key="`assigned-${mission.id}`" class="cleanup-pin assigned" :class="{ danger: state.incident?.missionId === mission.id }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span><b>{{ tr(state.incident?.missionId === mission.id ? 'ТРЕВОГА' : 'УБОРКА') }}</b><small>{{ tr(mission.title) }}</small></div>
      <div v-for="squad in state.squads" :key="squad.id" class="squad-marker" :class="[squad.phase, squad.id]" :style="squadStyle(squad)">
        <div class="map-squad-tokens"><svg v-for="member in squad.members" :key="member" class="cat-silhouette" viewBox="0 0 64 64" aria-hidden="true"><use :href="`${catTokensUrl}#token-${member}`" /></svg></div>
        <div class="squad-callout"><b>{{ tr(squad.name) }}</b><small>{{ squadLabel(squad) }}</small><button v-if="squad.phase === 'field'" type="button" @click.stop="emit('returnHome', squad.id)">{{ tr('dispatch.return_home') }}</button></div>
      </div>
    </div>
    <aside>
      <h2>{{ tr('ОПЕРАТИВНАЯ ЛЕНТА') }}</h2>
      <p class="goal">{{ tr('objective.summary', { fame: GAME_RULES.fameGoal }) }}</p>
      <section v-if="selectedMission" class="manual-dispatch-card">
        <header><span>{{ tr('dispatch.manual.kicker') }}</span><button type="button" :aria-label="tr('Закрыть')" @click="selectedMissionId = undefined">×</button></header>
        <h3>{{ tr(selectedMission.title) }}</h3>
        <p>{{ tr('dispatch.manual.description') }}</p>
        <button v-for="squad in state.squads" :key="squad.id" type="button" :disabled="Boolean(getManualDispatchBlockReason(state, squad.id, selectedMission.id))" @click="dispatch(squad.id, selectedMission.id)">
          <span><b>{{ tr(squad.name) }}</b><small>{{ tr(getManualDispatchBlockReason(state, squad.id, selectedMission.id) ?? 'dispatch.ready') }}</small></span><strong>{{ tr('dispatch.send') }}</strong>
        </button>
      </section>
      <div class="case-progress" :class="{ done: state.storyResolution }"><span>{{ tr('ДЕЛО 09') }}</span><b>{{ tr(state.storyResolution ? 'ЗАКРЫТО' : state.storyIncident ? 'ТРЕБУЕТ РЕШЕНИЯ' : 'ОЖИДАЕТ СИГНАЛА') }}</b></div>
      <article v-for="(item, index) in state.log" :key="`${index}-${item.time}-${item.key}`">{{ formatLog(item) }}</article>
    </aside>
  </section>
</template>
