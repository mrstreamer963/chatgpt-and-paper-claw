<script setup lang="ts">
import { computed } from 'vue'
import { getMissionSquadRosters, getOperationalQueue, type Mission, type OperationalQueueItem, type State } from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'

const props = defineProps<{ state: State; locale: Locale; selectedMissionId?: string }>()
const emit = defineEmits<{ select: [mission: Mission] }>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)

const operations = computed(() => getOperationalQueue(props.state))
function missionFor(item: OperationalQueueItem) { return item.missionId ? props.state.missions.find(mission => mission.id === item.missionId) : undefined }
function operationStatus(item: OperationalQueueItem) {
  if (item.remainingSeconds !== undefined) return tr('missions.completes_in', { time: formatDuration(item.remainingSeconds) })
  return tr(item.status)
}
function deadline(item: OperationalQueueItem) {
  return item.deadline === undefined ? undefined : formatDuration(item.deadline - props.state.time)
}
function squadRosters(mission: Mission) { return getMissionSquadRosters(props.state, mission) }
function formatDuration(value: number) {
  const seconds = Math.max(0, Math.ceil(value))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <aside class="active-mission-rail">
    <header><span>{{ tr('missions.kicker') }}</span><b>{{ operations.length }}</b></header>
    <h2>{{ tr('operations.title') }}</h2>
    <p v-if="!operations.length" class="mission-rail-empty">{{ tr('missions.empty') }}</p>
    <template v-for="item in operations" :key="item.id">
      <button v-if="missionFor(item)" type="button" class="mission-rail-card" :class="{ assigned: missionFor(item)!.status === 'assigned', selected: selectedMissionId === item.missionId, urgent: item.priority >= 80 }" @click="emit('select', missionFor(item)!)">
        <span class="mission-card-top"><i></i><small>{{ tr(`operations.kind.${item.kind}`) }}</small><strong>{{ operationStatus(item) }}</strong></span>
        <b>{{ tr(item.title) }}</b>
        <span class="operation-meta"><small v-if="item.districtId">{{ tr(`district.${item.districtId}.name`) }}</small><small v-if="deadline(item)">{{ tr('operations.deadline', { time: deadline(item)! }) }}</small></span>
        <span v-if="squadRosters(missionFor(item)!).length" class="mission-squads">
          <span v-for="roster in squadRosters(missionFor(item)!)" :key="roster.squad.id" class="mission-squad">
            <small class="mission-squad-name">{{ squadDisplayName(locale, roster.squad) }}</small>
            <small class="mission-squad-members">{{ roster.members.map(cat => tr(cat.name)).join(' · ') }}</small>
          </span>
        </span>
        <span class="mission-progress"><i :style="{ width: `${item.progress ?? 0}%` }"></i></span>
      </button>
      <article v-else class="mission-rail-card operation-card" :class="{ urgent: item.priority >= 80 }">
        <span class="mission-card-top"><i></i><small>{{ tr(`operations.kind.${item.kind}`) }}</small><strong>{{ operationStatus(item) }}</strong></span>
        <b>{{ tr(item.title) }}</b>
        <span class="operation-meta"><small v-if="item.districtId">{{ tr(`district.${item.districtId}.name`) }}</small><small v-if="deadline(item)">{{ tr('operations.deadline', { time: deadline(item)! }) }}</small></span>
      </article>
    </template>
  </aside>
</template>
