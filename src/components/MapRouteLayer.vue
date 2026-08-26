<script setup lang="ts">
import { getSquadMapPosition, type Squad, type State } from '@nine-lives/game-core'

const props = defineProps<{ state: State; base: { x: number; y: number }; squadColor: (squad: Squad) => string; squadIndex: (squad: Squad) => number }>()

function position(squad: Squad) {
  const point = getSquadMapPosition(squad)
  return { x: Math.max(5, Math.min(95, point.x)), y: Math.max(7, Math.min(93, point.y)) }
}
function routeFallback(squad: Squad) {
  const point = position(squad)
  if (squad.phase === 'returning') return [point, props.base]
  if (squad.phase === 'moving') return [point, squad.destination ?? point]
  if (squad.phase === 'merging') return [point, squad.mergePoint ?? point]
  return [point, squad.target ?? point]
}
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}
function routePoints(squad: Squad) {
  if (squad.route.length <= 1) return routeFallback(squad).map(point => `${point.x},${point.y}`).join(' ')

  const progress = Math.max(0, Math.min(1, squad.travel / Math.max(squad.travelDuration, 1e-9)))
  const lengths = squad.route.slice(1).map((point, index) => distance(squad.route[index], point))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = total * progress
  let segment = 0
  while (segment < lengths.length - 1 && remaining > lengths[segment]) {
    remaining -= lengths[segment]
    segment += 1
  }
  const segmentLength = lengths[segment]
  const start = squad.route[segment]
  const end = squad.route[segment + 1]
  const ratio = segmentLength > 0 ? remaining / segmentLength : 0
  const current = {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  }
  const points = [current, ...squad.route.slice(segment + 1)]
  return points.map(point => `${point.x},${point.y}`).join(' ')
}
function missionLink(squad: Squad) { const point = position(squad); return { x1: point.x, y1: point.y, x2: squad.target?.x ?? point.x, y2: squad.target?.y ?? point.y } }
</script>

<template>
  <svg class="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <polyline v-for="squad in state.squads.filter(candidate => ['returning', 'moving', 'merging'].includes(candidate.phase) || (candidate.target && ['outbound', 'support'].includes(candidate.phase)))" :key="`route-${squad.id}`" :points="routePoints(squad)" :style="{ stroke: squadColor(squad), strokeDasharray: `${3 + squadIndex(squad) % 4} ${2 + squadIndex(squad) % 3}` }" />
    <line v-for="squad in state.squads.filter(candidate => candidate.target && ['cleanup', 'incident'].includes(candidate.phase))" :key="`mission-link-${squad.id}`" class="mission-link" v-bind="missionLink(squad)" :style="{ stroke: squadColor(squad) }" />
  </svg>
</template>
