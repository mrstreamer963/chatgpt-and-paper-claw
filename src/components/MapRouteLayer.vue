<script setup lang="ts">
import { getSquadMapPosition, type Squad, type State } from '@nine-lives/game-core'

const props = defineProps<{ state: State; base: { x: number; y: number }; squadColor: (squad: Squad) => string; squadIndex: (squad: Squad) => number }>()

function position(squad: Squad) {
  const point = getSquadMapPosition(squad)
  return { x: Math.max(5, Math.min(95, point.x)), y: Math.max(7, Math.min(93, point.y)) }
}
function route(squad: Squad) {
  const point = position(squad)
  if (squad.phase === 'returning') return { x1: point.x, y1: point.y, x2: props.base.x, y2: props.base.y }
  if (squad.phase === 'moving') return { x1: point.x, y1: point.y, x2: squad.destination?.x ?? point.x, y2: squad.destination?.y ?? point.y }
  if (squad.phase === 'merging') return { x1: point.x, y1: point.y, x2: squad.mergePoint?.x ?? point.x, y2: squad.mergePoint?.y ?? point.y }
  return { x1: point.x, y1: point.y, x2: squad.target?.x ?? point.x, y2: squad.target?.y ?? point.y }
}
function missionLink(squad: Squad) { const point = position(squad); return { x1: point.x, y1: point.y, x2: squad.target?.x ?? point.x, y2: squad.target?.y ?? point.y } }
</script>

<template>
  <svg class="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <line v-for="squad in state.squads.filter(candidate => ['returning', 'moving', 'merging'].includes(candidate.phase) || (candidate.target && ['outbound', 'support'].includes(candidate.phase)))" :key="`route-${squad.id}`" v-bind="route(squad)" :style="{ stroke: squadColor(squad), strokeDasharray: `${3 + squadIndex(squad) % 4} ${2 + squadIndex(squad) % 3}` }" />
    <line v-for="squad in state.squads.filter(candidate => candidate.target && ['cleanup', 'incident'].includes(candidate.phase))" :key="`mission-link-${squad.id}`" class="mission-link" v-bind="missionLink(squad)" :style="{ stroke: squadColor(squad) }" />
  </svg>
</template>
