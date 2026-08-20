<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { GAME_RULES, getAssistMissionBlockReason, getCleanupSecondsRemaining, getManualDispatchBlockReason, getMergeSquadsBlockReason, getMoveSquadBlockReason, getSplitSquadBlockReason, getSquadMapPosition, type LogEntry, type MapPoint, type Mission, type Squad, type State } from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'
import catTokensUrl from '../../assets/art/cat-tokens.svg?url'
import uiIconsUrl from '../../assets/art/ui-icons.svg?url'
import { layoutSquadMarkers } from './squadMarkerLayout'

const props = defineProps<{ state: State; locale: Locale }>()
const emit = defineEmits<{
  dispatch: [squadId: string, missionId: string]
  assist: [squadId: string, missionId: string]
  split: [squadId: string, memberIds: string[]]
  merge: [sourceSquadId: string, targetSquadId: string]
  move: [squadId: string, x: number, y: number]
  returnHome: [squadId: string]
}>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)
const base = { x: 46, y: 51 }
const selectedSquadId = ref<string>()
const selectedTarget = ref<{ type: 'mission'; missionId: string } | { type: 'base' }>()
const commandMessage = ref<string>()
const splitSquadId = ref<string>()
const splitMemberIds = ref<string[]>([])
const mapGrid = ref<HTMLElement>()
const mapSize = ref({ width: 1000, height: 700 })
let mapResizeObserver: ResizeObserver | undefined

function squadPosition(squad: Squad) {
  const { x, y } = getSquadMapPosition(squad)
  return { x: Math.max(5, Math.min(95, x)), y: Math.max(7, Math.min(93, y)) }
}

const squadPalette = ['#e5ab64', '#77c5c9', '#8fca78', '#c58fda', '#df7d72', '#7d9fdf']

function squadIndex(squad: Squad) {
  return Math.max(0, props.state.squads.findIndex(candidate => candidate.id === squad.id))
}

function squadColor(squad: Squad) {
  const index = squadIndex(squad)
  return squadPalette[index] ?? `hsl(${(index * 137.5) % 360} 54% 66%)`
}

const separatedSquadPositions = computed(() => layoutSquadMarkers(
  props.state.squads
    .filter(squad => squad.phase !== 'base')
    .map(squad => ({ id: squad.id, ...squadPosition(squad) })),
  {
    ...mapSize.value,
    obstacles: props.state.missions
      .filter(mission => mission.status === 'available' || isActiveAssignedMission(mission))
      .map(mission => ({ id: mission.id, x: mission.x, y: mission.y, size: 44 })),
  },
))

function separatedSquadPosition(squad: Squad) {
  return separatedSquadPositions.value.get(squad.id) ?? squadPosition(squad)
}

function squadStyle(squad: Squad) {
  const position = separatedSquadPosition(squad)
  if (squad.phase === 'base') return { left: `${base.x}%`, top: `${base.y}%`, opacity: 0 }
  return { left: `${position.x}%`, top: `${position.y}%`, '--squad-color': squadColor(squad) }
}

function route(squad: Squad) {
  const position = squadPosition(squad)
  if (squad.phase === 'returning') return { x1: position.x, y1: position.y, x2: base.x, y2: base.y }
  if (squad.phase === 'moving') return { x1: position.x, y1: position.y, x2: squad.destination?.x ?? position.x, y2: squad.destination?.y ?? position.y }
  if (squad.phase === 'merging') return { x1: position.x, y1: position.y, x2: squad.mergePoint?.x ?? position.x, y2: squad.mergePoint?.y ?? position.y }
  return { x1: position.x, y1: position.y, x2: squad.target?.x ?? position.x, y2: squad.target?.y ?? position.y }
}

function missionLink(squad: Squad) {
  const position = separatedSquadPosition(squad)
  return { x1: position.x, y1: position.y, x2: squad.target?.x ?? position.x, y2: squad.target?.y ?? position.y }
}

function markerOffsetLink(squad: Squad) {
  const actual = squadPosition(squad)
  const displayed = separatedSquadPosition(squad)
  if (Math.abs(actual.x - displayed.x) < 0.01 && Math.abs(actual.y - displayed.y) < 0.01) return
  return { x1: actual.x, y1: actual.y, x2: displayed.x, y2: displayed.y }
}

function markerOriginStyle(squad: Squad) {
  const position = squadPosition(squad)
  return { left: `${position.x}%`, top: `${position.y}%`, '--squad-color': squadColor(squad) }
}

function isActiveAssignedMission(mission: Mission) {
  if (mission.status !== 'assigned') return false
  return props.state.squads.find(squad => squad.id === mission.squadId)?.phase !== 'returning'
}

function squadIsResting(squad: Squad) {
  return squad.members
    .map(id => props.state.cats.find(cat => cat.id === id))
    .filter(Boolean)
    .some(cat => cat!.sleeping
      ? cat!.energy < GAME_RULES.wakeForOrderEnergy
      : cat!.energy <= GAME_RULES.sleepAtEnergy)
}

function squadLabel(squad: Squad) {
  if (squad.phase === 'base') {
    if (!squad.members.length) return tr('status.no_squad')
    if (squadIsResting(squad)) return tr('status.resting')
    return tr(squad.autoDispatch ? 'status.base_ready' : 'status.awaiting_order')
  }
  if (squad.phase === 'field') return tr('status.field')
  if (squad.phase === 'outbound') return tr('status.outbound', { mission: squad.target?.title ?? '', seconds: Math.ceil(squad.travelDuration - squad.travel) })
  if (squad.phase === 'moving') return tr('status.moving', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'returning') return tr('status.returning')
  if (squad.phase === 'support') return tr('status.support', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'assisting') return tr('status.assisting')
  if (squad.phase === 'merging') return tr('status.merging')
  if (squad.phase === 'incident') return tr('status.incident')
  return tr('status.cleanup', {
    progress: Math.round((props.state.missions.find(mission => mission.id === squad.missionId)?.progress ?? 0) / GAME_RULES.cleanupWork * 100),
    seconds: Math.ceil(getCleanupSecondsRemaining(props.state, squad)),
  })
}

function clearCommand() {
  selectedSquadId.value = undefined
  selectedTarget.value = undefined
  commandMessage.value = undefined
}

function setFailure(reason: string) {
  commandMessage.value = reason
}

function issueMission(squad: Squad, mission: Mission) {
  const assisting = mission.status === 'assigned' && mission.squadId !== squad.id
  const reason = assisting
    ? getAssistMissionBlockReason(props.state, squad.id, mission.id)
    : getManualDispatchBlockReason(props.state, squad.id, mission.id)
  if (reason) return setFailure(reason)
  if (assisting) emit('assist', squad.id, mission.id)
  else emit('dispatch', squad.id, mission.id)
  clearCommand()
}

function issueReturn(squad: Squad) {
  if (squad.phase === 'base') return clearCommand()
  if (['incident', 'support'].includes(squad.phase)) return setFailure('dispatch.reason.away')
  emit('returnHome', squad.id)
  clearCommand()
}

function selectSquad(squad: Squad) {
  commandMessage.value = undefined
  if (selectedTarget.value?.type === 'mission') {
    const missionId = selectedTarget.value.missionId
    const mission = props.state.missions.find(candidate => candidate.id === missionId)
    if (mission) issueMission(squad, mission)
    return
  }
  if (selectedTarget.value?.type === 'base') return issueReturn(squad)
  const selected = props.state.squads.find(candidate => candidate.id === selectedSquadId.value)
  if (selected && selected.id !== squad.id) {
    const reason = getMergeSquadsBlockReason(props.state, selected.id, squad.id)
    if (reason) return setFailure(reason)
    emit('merge', selected.id, squad.id)
    clearCommand()
    return
  }
  selectedSquadId.value = selectedSquadId.value === squad.id ? undefined : squad.id
}

function openSplit(squad: Squad) {
  splitSquadId.value = squad.id
  splitMemberIds.value = [squad.members[0]].filter(Boolean)
}

function toggleSplitMember(memberId: string) {
  splitMemberIds.value = splitMemberIds.value.includes(memberId)
    ? splitMemberIds.value.filter(id => id !== memberId)
    : [...splitMemberIds.value, memberId]
}

function confirmSplit() {
  const squadId = splitSquadId.value
  if (!squadId) return
  const reason = getSplitSquadBlockReason(props.state, squadId, splitMemberIds.value)
  if (reason) return setFailure(reason)
  emit('split', squadId, [...splitMemberIds.value])
  splitSquadId.value = undefined
  splitMemberIds.value = []
  clearCommand()
}

function selectMission(mission: Mission) {
  commandMessage.value = undefined
  const squad = props.state.squads.find(candidate => candidate.id === selectedSquadId.value)
  if (squad) return issueMission(squad, mission)
  selectedTarget.value = selectedTarget.value?.type === 'mission' && selectedTarget.value.missionId === mission.id
    ? undefined : { type: 'mission', missionId: mission.id }
}

function selectBase() {
  commandMessage.value = undefined
  const squad = props.state.squads.find(candidate => candidate.id === selectedSquadId.value)
  if (squad) return issueReturn(squad)
  selectedTarget.value = selectedTarget.value?.type === 'base' ? undefined : { type: 'base' }
}

function selectMapPoint(event: MouseEvent) {
  if (!selectedSquadId.value) return
  const element = event.currentTarget as HTMLElement
  const bounds = element.getBoundingClientRect()
  const point: MapPoint = {
    x: Math.max(5, Math.min(95, (event.clientX - bounds.left) / bounds.width * 100)),
    y: Math.max(7, Math.min(93, (event.clientY - bounds.top) / bounds.height * 100)),
  }
  const reason = getMoveSquadBlockReason(props.state, selectedSquadId.value, point)
  if (reason) return setFailure(reason)
  emit('move', selectedSquadId.value, point.x, point.y)
  clearCommand()
}

function squadCommandReason(squad: Squad) {
  const target = selectedTarget.value
  if (target?.type === 'mission') {
    const mission = props.state.missions.find(candidate => candidate.id === target.missionId)
    return mission?.status === 'assigned'
      ? getAssistMissionBlockReason(props.state, squad.id, mission.id)
      : getManualDispatchBlockReason(props.state, squad.id, target.missionId)
  }
  if (target?.type === 'base') return !['base', 'incident', 'support'].includes(squad.phase) ? undefined : 'dispatch.reason.away'
  return getMoveSquadBlockReason(props.state, squad.id)
}

function squadEnergy(squad: Squad) {
  const members = squad.members.map(id => props.state.cats.find(cat => cat.id === id)).filter(Boolean)
  return members.length ? Math.round(Math.min(...members.map(cat => cat!.energy))) : 0
}

function squadIsAvailable(squad: Squad) {
  return !getMoveSquadBlockReason(props.state, squad.id)
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && (selectedSquadId.value || selectedTarget.value)) clearCommand()
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  if (mapGrid.value) {
    const updateMapSize = () => {
      if (!mapGrid.value) return
      mapSize.value = { width: mapGrid.value.clientWidth, height: mapGrid.value.clientHeight }
    }
    updateMapSize()
    mapResizeObserver = new ResizeObserver(updateMapSize)
    mapResizeObserver.observe(mapGrid.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  mapResizeObserver?.disconnect()
})

function formatLog(entry: LogEntry) {
  const minutes = 540 + Math.floor(entry.time / 60)
  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return `${time} · ${tr(entry.key, entry.params)}`
}
</script>

<template>
  <section class="map-view">
    <div ref="mapGrid" class="map-grid" :class="{ 'incident-active': state.incident, 'command-active': selectedSquadId || selectedTarget }" @click="selectMapPoint">
      <svg class="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line v-for="squad in state.squads.filter(candidate => ['returning', 'moving', 'merging'].includes(candidate.phase) || (candidate.target && ['outbound', 'support'].includes(candidate.phase)))" :key="`route-${squad.id}`" v-bind="route(squad)" :style="{ stroke: squadColor(squad), strokeDasharray: `${3 + squadIndex(squad) % 4} ${2 + squadIndex(squad) % 3}` }" />
        <line v-for="squad in state.squads.filter(candidate => candidate.target && ['cleanup', 'assisting', 'incident'].includes(candidate.phase))" :key="`mission-link-${squad.id}`" class="mission-link" v-bind="missionLink(squad)" :style="{ stroke: squadColor(squad) }" />
        <line v-for="squad in state.squads.filter(candidate => candidate.phase !== 'base' && markerOffsetLink(candidate))" :key="`marker-offset-${squad.id}`" class="marker-offset-link" v-bind="markerOffsetLink(squad)" :style="{ stroke: squadColor(squad) }" />
      </svg>
      <span v-for="squad in state.squads.filter(candidate => candidate.phase !== 'base' && markerOffsetLink(candidate))" :key="`marker-origin-${squad.id}`" class="squad-marker-origin" :style="markerOriginStyle(squad)" aria-hidden="true"></span>
      <div class="threat-zone" :class="{ elevated: state.threat >= GAME_RULES.elevatedThreat, severe: state.threat >= GAME_RULES.severeThreat }"></div>
      <div class="district d1">{{ tr('Старый сектор') }}</div><div class="district d2">{{ tr('Промзона') }}</div><div class="district d3">{{ tr('Терминал') }}</div>
      <button type="button" class="base-pin" :class="{ selected: selectedTarget?.type === 'base' }" @click.stop="selectBase"><strong>NL</strong><span>{{ tr('БАЗА') }}</span></button>
      <div v-if="state.storyIncident" class="story-pin" :style="{ left: `${state.storyIncident.x}%`, top: `${state.storyIncident.y}%` }"><span>!</span><b>{{ tr('ДЕЛО 09') }}</b><small>{{ tr('Дезертир ждёт решения') }}</small></div>
      <div v-if="state.storyResolution?.unlockedLocation" class="hedgehog-pin"><span>⌁</span><b>{{ tr('БАЗА ЕЖЕЙ') }}</b><small>{{ tr('координаты подтверждены') }}</small></div>
      <button v-for="mission in state.missions.filter(mission => mission.status === 'available')" :key="mission.id" type="button" class="cleanup-pin" :class="{ selected: selectedTarget?.type === 'mission' && selectedTarget.missionId === mission.id, 'enhanced-alert': mission.priority > 1 && state.research.nodes.emergency_dispatch.completed }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" :aria-label="tr('dispatch.select_mission', { mission: mission.title })" @click.stop="selectMission(mission)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span><b>{{ tr(mission.priority > 1 ? 'ПРИОРИТЕТ' : 'УБОРКА') }}</b><small>{{ tr(mission.title) }}<template v-if="mission.progress > 0"> · {{ Math.round(mission.progress / GAME_RULES.cleanupWork * 100) }}%</template></small></button>
      <button v-for="mission in state.missions.filter(isActiveAssignedMission)" :key="`assigned-${mission.id}`" type="button" class="cleanup-pin assigned" :class="{ danger: state.incident?.missionId === mission.id, selected: selectedTarget?.type === 'mission' && selectedTarget.missionId === mission.id }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" @click.stop="selectMission(mission)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span><b>{{ tr(state.incident?.missionId === mission.id ? 'ТРЕВОГА' : 'УБОРКА') }}</b><small>{{ tr(mission.title) }} · {{ Math.round(mission.progress / GAME_RULES.cleanupWork * 100) }}%</small></button>
      <button v-for="squad in state.squads.filter(candidate => candidate.phase !== 'base')" :key="squad.id" type="button" class="squad-marker" :class="[squad.phase, squad.id, squadIndex(squad) % 2 ? 'callout-right' : 'callout-left', { selected: selectedSquadId === squad.id, available: squadIsAvailable(squad) }]" :style="squadStyle(squad)" @click.stop="selectSquad(squad)">
        <div class="map-squad-tokens"><svg v-for="member in squad.members" :key="member" class="cat-silhouette" viewBox="0 0 64 64" aria-hidden="true"><use :href="`${catTokensUrl}#token-${member}`" /></svg></div>
        <span class="squad-callout"><b>{{ squadDisplayName(locale, squad) }}</b><small>{{ squadLabel(squad) }}</small></span>
      </button>
      <div v-if="selectedSquadId || selectedTarget" class="command-hint"><span>{{ tr(selectedSquadId ? 'dispatch.command.choose_target' : 'dispatch.command.choose_squad') }}</span><button type="button" :aria-label="tr('dispatch.command.cancel')" @click.stop="clearCommand">×</button><small v-if="commandMessage">{{ tr(commandMessage) }}</small></div>
      <button v-if="selectedSquadId && state.squads.find(squad => squad.id === selectedSquadId)?.phase !== 'base' && (state.squads.find(squad => squad.id === selectedSquadId)?.members.length ?? 0) > 1" type="button" class="split-open" @click.stop="openSplit(state.squads.find(squad => squad.id === selectedSquadId)!)">{{ tr('squad.split.action') }}</button>
      <section v-if="splitSquadId" class="split-panel" @click.stop>
        <header><b>{{ tr('squad.split.title') }}</b><button type="button" @click="splitSquadId = undefined">×</button></header>
        <p>{{ tr('squad.split.description') }}</p>
        <label v-for="memberId in state.squads.find(squad => squad.id === splitSquadId)?.members ?? []" :key="memberId">
          <input type="checkbox" :checked="splitMemberIds.includes(memberId)" @change="toggleSplitMember(memberId)">
          {{ tr(state.cats.find(cat => cat.id === memberId)?.name ?? memberId) }}
        </label>
        <small v-if="getSplitSquadBlockReason(state, splitSquadId, splitMemberIds)">{{ tr(getSplitSquadBlockReason(state, splitSquadId, splitMemberIds)!) }}</small>
        <button type="button" :disabled="Boolean(getSplitSquadBlockReason(state, splitSquadId, splitMemberIds))" @click="confirmSplit">{{ tr('squad.split.confirm') }}</button>
      </section>
    </div>
    <aside>
      <section class="map-squad-list">
        <h2>{{ tr('dispatch.command.squads') }}</h2>
        <button v-for="squad in state.squads" :key="`command-${squad.id}`" type="button" :class="{ selected: selectedSquadId === squad.id, available: squadIsAvailable(squad) }" @click="selectSquad(squad)">
          <span><b>{{ squadDisplayName(locale, squad) }} <em v-if="squadIsAvailable(squad)">{{ tr('dispatch.command.available') }}</em></b><small>{{ squadLabel(squad) }}</small></span>
          <span><strong class="squad-energy" :class="{ tired: squadCommandReason(squad) === 'dispatch.reason.tired' }">{{ tr('dispatch.command.energy', { energy: squadEnergy(squad) }) }}</strong><small v-if="squadCommandReason(squad) && squadCommandReason(squad) !== 'dispatch.reason.tired'">{{ tr(squadCommandReason(squad)!) }}</small></span>
        </button>
      </section>
      <h2>{{ tr('ОПЕРАТИВНАЯ ЛЕНТА') }}</h2>
      <p class="goal">{{ tr('objective.summary', { fame: GAME_RULES.fameGoal }) }}</p>
      <div class="case-progress" :class="{ done: state.storyResolution }"><span>{{ tr('ДЕЛО 09') }}</span><b>{{ tr(state.storyResolution ? 'ЗАКРЫТО' : state.storyIncident ? 'ТРЕБУЕТ РЕШЕНИЯ' : 'ОЖИДАЕТ СИГНАЛА') }}</b></div>
      <article v-for="(item, index) in state.log" :key="`${index}-${item.time}-${item.key}`">{{ formatLog(item) }}</article>
    </aside>
  </section>
</template>
