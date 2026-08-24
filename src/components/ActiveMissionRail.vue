<script setup lang="ts">
import { computed } from 'vue'
import { GAME_RULES, getCleanupSecondsRemaining, getMissionAvailabilitySecondsRemaining, isActiveAssignedMission, type Mission, type State } from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'

const props = defineProps<{ state: State; locale: Locale; selectedMissionId?: string }>()
const emit = defineEmits<{ select: [mission: Mission] }>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)

const activeMissions = computed(() => props.state.missions
  .filter(mission => mission.status === 'available' || isActiveAssignedMission(props.state, mission))
  .map(mission => ({ mission, remaining: getMissionAvailabilitySecondsRemaining(props.state, mission.id) }))
  .sort((left, right) => {
    if (left.mission.status !== right.mission.status) return left.mission.status === 'assigned' ? -1 : 1
    return (left.remaining ?? Number.POSITIVE_INFINITY) - (right.remaining ?? Number.POSITIVE_INFINITY)
  }))

function assignedSquads(mission: Mission) {
  return mission.squadIds
    .map(id => props.state.squads.find(squad => squad.id === id))
    .filter((squad): squad is State['squads'][number] => Boolean(squad))
}
function missionStatus(mission: Mission, remaining?: number) {
  if (mission.status === 'available') return remaining === undefined ? tr('missions.available') : tr('missions.expires_in', { time: formatDuration(remaining) })
  const squads = assignedSquads(mission)
  const working = squads.find(squad => squad.phase === 'cleanup')
  return working
    ? tr('missions.completes_in', { time: formatDuration(getCleanupSecondsRemaining(props.state, working)) })
    : tr('missions.en_route')
}
function squadNames(mission: Mission) { return assignedSquads(mission).map(squad => squadDisplayName(props.locale, squad)).join(' · ') }
function progress(mission: Mission) { return Math.max(0, Math.min(100, Math.round((mission.progress ?? 0) / GAME_RULES.cleanupWork * 100))) }
function formatDuration(value: number) {
  const seconds = Math.max(0, Math.ceil(value))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <aside class="active-mission-rail">
    <header><span>{{ tr('missions.kicker') }}</span><b>{{ activeMissions.length }}</b></header>
    <h2>{{ tr('missions.title') }}</h2>
    <p v-if="!activeMissions.length" class="mission-rail-empty">{{ tr('missions.empty') }}</p>
    <button v-for="item in activeMissions" :key="item.mission.id" type="button" class="mission-rail-card" :class="{ assigned: item.mission.status === 'assigned', urgent: item.remaining !== undefined && item.remaining <= 35, selected: selectedMissionId === item.mission.id }" @click="emit('select', item.mission)">
      <span class="mission-card-top"><i></i><small>{{ item.mission.status === 'assigned' ? tr('missions.in_progress') : tr('missions.open') }}</small><strong>{{ missionStatus(item.mission, item.remaining) }}</strong></span>
      <b>{{ tr(item.mission.title) }}</b>
      <small v-if="squadNames(item.mission)" class="mission-squads">{{ squadNames(item.mission) }}</small>
      <span class="mission-progress"><i :style="{ width: `${progress(item.mission)}%` }"></i></span>
    </button>
  </aside>
</template>
