<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { GAME_RULES, getAssignMissionBlockReason, getCleanupSecondsRemaining, getDeployCatsBlockReason, getMergeSquadsBlockReason, getMoveSquadBlockReason, getSplitSquadBlockReason, getSquadMapPosition, type Cat, type DeployOrder, type LogEntry, type MapPoint, type Mission, type Squad, type State } from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'
import catTokensUrl from '../../assets/art/cat-tokens.svg?url'
import uiIconsUrl from '../../assets/art/ui-icons.svg?url'
import { layoutSquadFormation, layoutSquadMarkers, layoutSquadsAroundMission, type SquadFormationLayout } from './squadMarkerLayout'

const props = defineProps<{ state: State; locale: Locale }>()
const emit = defineEmits<{
  assign: [squadId: string, missionId: string]
  deploy: [catIds: string[], order: DeployOrder]
  split: [squadId: string, memberIds: string[]]
  merge: [sourceSquadId: string, targetSquadId: string]
  move: [squadId: string, x: number, y: number]
  returnHome: [squadId: string]
}>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)
const base = { x: 46, y: 51 }
const selectedSquadIds = ref<string[]>([])
const selectedCatIds = ref<string[]>([])
const selectedTarget = ref<{ type: 'mission'; missionId: string } | { type: 'base' }>()
const commandMessage = ref<string>()
const splitSquadId = ref<string>()
const splitMemberIds = ref<string[]>([])
const mergeSourceSquadId = ref<string>()
const mapGrid = ref<HTMLElement>()
const mapSize = ref({ width: 1000, height: 700 })
const selectionBox = ref<{ startX: number; startY: number; x: number; y: number; additive: boolean; pointerId: number; dragging: boolean }>()
let mapResizeObserver: ResizeObserver | undefined
let suppressMapClick = false

function squadPosition(squad: Squad) {
  const { x, y } = getSquadMapPosition(squad)
  return { x: Math.max(5, Math.min(95, x)), y: Math.max(7, Math.min(93, y)) }
}
const squadPalette = ['#e5ab64', '#77c5c9', '#8fca78', '#c58fda', '#df7d72', '#7d9fdf']
function squadIndex(squad: Squad) { return Math.max(0, props.state.squads.findIndex(candidate => candidate.id === squad.id)) }
function squadColor(squad: Squad) { const index = squadIndex(squad); return squadPalette[index] ?? `hsl(${(index * 137.5) % 360} 54% 66%)` }
function squadVisualTarget(squad: Squad) {
  if (squad.phase === 'returning') return base
  if (squad.phase === 'moving') return squad.destination
  if (squad.phase === 'merging') return squad.mergePoint
  if (['outbound', 'support'].includes(squad.phase)) return squad.target
  return undefined
}
function squadFormationDirection(squad: Squad) {
  const position = squadPosition(squad)
  const target = squadVisualTarget(squad)
  if (!target) return { x: 0, y: -1 }
  return { x: (target.x - position.x) * mapSize.value.width / 100, y: (target.y - position.y) * mapSize.value.height / 100 }
}
const squadFormations = computed(() => new Map(props.state.squads.filter(squad => squad.phase !== 'base').map(squad => [squad.id, layoutSquadFormation(squad.members, squadFormationDirection(squad))])))
function squadFormation(squad: Squad): SquadFormationLayout { return squadFormations.value.get(squad.id) ?? layoutSquadFormation(squad.members) }
const missionSquadSlots = computed(() => {
  const slots = new Map<string, { x: number; y: number }>()
  for (const mission of props.state.missions.filter(candidate => candidate.status !== 'completed')) {
    const squads = props.state.squads.filter(squad => squad.missionId === mission.id && squad.target && ['outbound', 'support', 'cleanup', 'incident'].includes(squad.phase))
    const missionSlots = layoutSquadsAroundMission(squads.map(squad => {
      const formation = squadFormation(squad)
      return { id: squad.id, missionId: mission.id, slot: squadIndex(squad), ...squadPosition(squad), width: formation.width, height: formation.height }
    }), mission, mapSize.value)
    for (const [id, position] of missionSlots) slots.set(id, position)
  }
  return slots
})
function squadPreferredPosition(squad: Squad) {
  const logical = squadPosition(squad)
  const slot = missionSquadSlots.value.get(squad.id)
  if (!slot) return logical
  if (!['outbound', 'support'].includes(squad.phase)) return slot
  const progress = squad.travelDuration > 0 ? Math.max(0, Math.min(1, squad.travel / squad.travelDuration)) : 1
  const blend = progress * progress * (3 - 2 * progress)
  return { x: logical.x + (slot.x - (squad.target?.x ?? logical.x)) * blend, y: logical.y + (slot.y - (squad.target?.y ?? logical.y)) * blend }
}
const separatedSquadPositions = computed(() => layoutSquadMarkers(
  props.state.squads.filter(squad => squad.phase !== 'base').map(squad => {
    const formation = squadFormation(squad)
    return { id: squad.id, ...squadPreferredPosition(squad), width: formation.width, height: formation.height }
  }),
  {
    ...mapSize.value,
    gap: 8,
    obstacles: [
      { id: 'base', ...base, width: 74, height: 92 },
    ],
  },
))
function separatedSquadPosition(squad: Squad) { return separatedSquadPositions.value.get(squad.id) ?? squadPosition(squad) }
function squadStyle(squad: Squad) { const position = separatedSquadPosition(squad); return { left: `${position.x}%`, top: `${position.y}%`, '--squad-color': squadColor(squad), '--formation-label-y': `${squadFormation(squad).height / 2 + 8}px` } }
function formationMemberStyle(squad: Squad, memberId: string) {
  const slot = squadFormation(squad).members.find(member => member.id === memberId)
  return { left: `${slot?.x ?? 0}px`, top: `${slot?.y ?? 0}px`, '--step-delay': `${slot?.stepDelay ?? 0}s` }
}
function fieldCat(_squad: Squad, memberId: string) { return props.state.cats.find(cat => cat.id === memberId) }
function fieldCatTooltip(squad: Squad, memberId: string) {
  const cat = fieldCat(squad, memberId)
  if (!cat) return memberId
  const condition = cat.injuredRemaining > 0
    ? tr('cat.injured', { seconds: Math.ceil(cat.injuredRemaining) })
    : tr('cat.energy', { role: tr(cat.role), energy: Math.round(cat.energy) })
  return `${tr(cat.name)} · ${condition}`
}
function formationIntersectsBox(squad: Squad, left: number, right: number, top: number, bottom: number) {
  const anchor = separatedSquadPosition(squad)
  const halfWidth = 19 / mapSize.value.width * 100
  const halfHeight = 22 / mapSize.value.height * 100
  return squadFormation(squad).members.some(member => {
    const x = anchor.x + member.x / mapSize.value.width * 100
    const y = anchor.y + member.y / mapSize.value.height * 100
    return x + halfWidth >= left && x - halfWidth <= right && y + halfHeight >= top && y - halfHeight <= bottom
  })
}
function route(squad: Squad) {
  const position = squadPosition(squad)
  if (squad.phase === 'returning') return { x1: position.x, y1: position.y, x2: base.x, y2: base.y }
  if (squad.phase === 'moving') return { x1: position.x, y1: position.y, x2: squad.destination?.x ?? position.x, y2: squad.destination?.y ?? position.y }
  if (squad.phase === 'merging') return { x1: position.x, y1: position.y, x2: squad.mergePoint?.x ?? position.x, y2: squad.mergePoint?.y ?? position.y }
  return { x1: position.x, y1: position.y, x2: squad.target?.x ?? position.x, y2: squad.target?.y ?? position.y }
}
function missionLink(squad: Squad) { const position = separatedSquadPosition(squad); return { x1: position.x, y1: position.y, x2: squad.target?.x ?? position.x, y2: squad.target?.y ?? position.y } }
function markerOffsetLink(squad: Squad) { const actual = squadPosition(squad), displayed = separatedSquadPosition(squad); return Math.abs(actual.x - displayed.x) < 0.01 && Math.abs(actual.y - displayed.y) < 0.01 ? undefined : { x1: actual.x, y1: actual.y, x2: displayed.x, y2: displayed.y } }
function markerOriginStyle(squad: Squad) { const position = squadPosition(squad); return { left: `${position.x}%`, top: `${position.y}%`, '--squad-color': squadColor(squad) } }

function catIsAtBase(cat: Cat) { return !cat.assignedTo || props.state.squads.find(squad => squad.id === cat.assignedTo)?.phase === 'base' }
function baseCatPosition(cat: Cat) { const cats = props.state.cats.filter(catIsAtBase), index = Math.max(0, cats.findIndex(candidate => candidate.id === cat.id)); return { x: base.x - 7 + (index % 3) * 7, y: base.y - 8 + Math.floor(index / 3) * 16 } }
function baseCatStyle(cat: Cat) { const position = baseCatPosition(cat), squad = props.state.squads.find(candidate => candidate.id === cat.assignedTo); return { left: `${position.x}%`, top: `${position.y}%`, '--squad-color': squad ? squadColor(squad) : '#d8c7a7' } }
function isActiveAssignedMission(mission: Mission) { return mission.status === 'assigned' && mission.squadIds.some(id => props.state.squads.find(squad => squad.id === id)?.phase !== 'returning') }
function squadIsResting(squad: Squad) { return squad.members.map(id => props.state.cats.find(cat => cat.id === id)).filter(Boolean).some(cat => cat!.sleeping ? cat!.energy < GAME_RULES.wakeForOrderEnergy : cat!.energy <= GAME_RULES.sleepAtEnergy) }
function squadLabel(squad: Squad) {
  if (squad.phase === 'base') return tr(squadIsResting(squad) ? 'status.resting' : squad.autoDispatch ? 'status.base_ready' : 'status.awaiting_order')
  if (squad.phase === 'field') return tr('status.field')
  if (squad.phase === 'outbound') return tr('status.outbound', { mission: squad.target?.title ?? '', seconds: Math.ceil(squad.travelDuration - squad.travel) })
  if (squad.phase === 'moving') return tr('status.moving', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'returning') return tr('status.returning')
  if (squad.phase === 'support') return tr('status.support', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'merging') return tr('status.merging')
  if (squad.phase === 'incident') return tr('status.incident')
  return tr('status.cleanup', { progress: Math.round((props.state.missions.find(mission => mission.id === squad.missionId)?.progress ?? 0) / GAME_RULES.cleanupWork * 100), seconds: Math.ceil(getCleanupSecondsRemaining(props.state, squad)) })
}

function selectedCount() { return selectedSquadIds.value.length + selectedCatIds.value.length }
function clearCommand() { selectedSquadIds.value = []; selectedCatIds.value = []; selectedTarget.value = undefined; commandMessage.value = undefined; mergeSourceSquadId.value = undefined }
function setFailure(reason: string) { commandMessage.value = reason }
function failureSummary(reasons: string[]) { return reasons.length > 1 ? 'dispatch.reason.partial' : reasons[0] }
function partitionSelectedBaseCats() {
  const ready: string[] = [], blocked: string[] = [], reasons: string[] = []
  for (const catId of selectedCatIds.value) {
    const cat = props.state.cats.find(candidate => candidate.id === catId)
    if (!cat || !catIsAtBase(cat)) { blocked.push(catId); reasons.push('dispatch.reason.away') }
    else if (cat.injuredRemaining > 0) { blocked.push(catId); reasons.push('dispatch.reason.injured') }
    else if (cat.sleeping ? cat.energy < GAME_RULES.wakeForOrderEnergy : cat.energy <= GAME_RULES.sleepAtEnergy) { blocked.push(catId); reasons.push('dispatch.reason.tired') }
    else ready.push(catId)
  }
  return { ready, blocked, reasons }
}
function issueMission(mission: Mission) {
  const blockedSquads: string[] = [], reasons: string[] = []
  for (const squadId of selectedSquadIds.value) { const reason = getAssignMissionBlockReason(props.state, squadId, mission.id); if (reason) { blockedSquads.push(squadId); reasons.push(reason) } else emit('assign', squadId, mission.id) }
  const cats = partitionSelectedBaseCats(); reasons.push(...cats.reasons)
  const deployReason = cats.ready.length ? getDeployCatsBlockReason(props.state, cats.ready, { type: 'mission', missionId: mission.id }) : undefined
  if (deployReason) { cats.blocked.push(...cats.ready); reasons.push(deployReason) }
  else if (cats.ready.length) emit('deploy', cats.ready, { type: 'mission', missionId: mission.id })
  selectedSquadIds.value = blockedSquads
  selectedCatIds.value = cats.blocked
  selectedTarget.value = undefined
  commandMessage.value = failureSummary(reasons)
}
function issueReturn() {
  const blocked: string[] = [], reasons: string[] = []
  for (const squadId of selectedSquadIds.value) { const squad = props.state.squads.find(candidate => candidate.id === squadId); if (!squad || ['incident', 'support'].includes(squad.phase)) { blocked.push(squadId); reasons.push('dispatch.reason.away') } else if (squad.phase !== 'base') emit('returnHome', squad.id) }
  selectedSquadIds.value = blocked; selectedCatIds.value = []; selectedTarget.value = undefined; commandMessage.value = failureSummary(reasons)
}
function selectSquad(squad: Squad, event?: MouseEvent) {
  commandMessage.value = undefined
  if (mergeSourceSquadId.value && mergeSourceSquadId.value !== squad.id) { const reason = getMergeSquadsBlockReason(props.state, mergeSourceSquadId.value, squad.id); if (reason) return setFailure(reason); emit('merge', mergeSourceSquadId.value, squad.id); clearCommand(); return }
  const target = selectedTarget.value
  if (target?.type === 'mission') { const mission = props.state.missions.find(candidate => candidate.id === target.missionId); if (squad.phase === 'base') selectedCatIds.value = [...new Set([...selectedCatIds.value, ...squad.members])]; else selectedSquadIds.value = [...new Set([...selectedSquadIds.value, squad.id])]; if (mission) issueMission(mission); return }
  if (selectedTarget.value?.type === 'base') { if (squad.phase !== 'base') selectedSquadIds.value = [...new Set([...selectedSquadIds.value, squad.id])]; issueReturn(); return }
  if (squad.phase === 'base') { if (event?.shiftKey) for (const id of squad.members) selectedCatIds.value = selectedCatIds.value.includes(id) ? selectedCatIds.value.filter(value => value !== id) : [...selectedCatIds.value, id]; else { selectedCatIds.value = [...squad.members]; selectedSquadIds.value = [] } }
  else if (event?.shiftKey) selectedSquadIds.value = selectedSquadIds.value.includes(squad.id) ? selectedSquadIds.value.filter(id => id !== squad.id) : [...selectedSquadIds.value, squad.id]
  else { selectedSquadIds.value = [squad.id]; selectedCatIds.value = [] }
}
function selectCat(cat: Cat, event: MouseEvent) {
  commandMessage.value = undefined
  const target = selectedTarget.value
  if (target?.type === 'mission') { const mission = props.state.missions.find(candidate => candidate.id === target.missionId); selectedCatIds.value = [...new Set([...selectedCatIds.value, cat.id])]; if (mission) issueMission(mission); return }
  if (event.shiftKey) selectedCatIds.value = selectedCatIds.value.includes(cat.id) ? selectedCatIds.value.filter(id => id !== cat.id) : [...selectedCatIds.value, cat.id]
  else { selectedCatIds.value = [cat.id]; selectedSquadIds.value = [] }
}

function openSplit(squad: Squad) { splitSquadId.value = squad.id; splitMemberIds.value = [squad.members[0]].filter(Boolean) }
function toggleSplitMember(memberId: string) { splitMemberIds.value = splitMemberIds.value.includes(memberId) ? splitMemberIds.value.filter(id => id !== memberId) : [...splitMemberIds.value, memberId] }
function confirmSplit() { const squadId = splitSquadId.value; if (!squadId) return; const reason = getSplitSquadBlockReason(props.state, squadId, splitMemberIds.value); if (reason) return setFailure(reason); emit('split', squadId, [...splitMemberIds.value]); splitSquadId.value = undefined; splitMemberIds.value = []; clearCommand() }
function armMerge() { if (selectedSquadIds.value.length === 1) { mergeSourceSquadId.value = selectedSquadIds.value[0]; commandMessage.value = undefined } }
function selectMission(mission: Mission) { commandMessage.value = undefined; if (selectedCount()) return issueMission(mission); selectedTarget.value = selectedTarget.value?.type === 'mission' && selectedTarget.value.missionId === mission.id ? undefined : { type: 'mission', missionId: mission.id } }
function selectBase() { commandMessage.value = undefined; if (selectedCount()) return issueReturn(); selectedTarget.value = selectedTarget.value?.type === 'base' ? undefined : { type: 'base' } }

function selectMapPoint(event: MouseEvent) {
  if (suppressMapClick) { suppressMapClick = false; return }
  if (!selectedCount()) return
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const point: MapPoint = { x: Math.max(5, Math.min(95, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(7, Math.min(93, (event.clientY - bounds.top) / bounds.height * 100)) }
  const cats = partitionSelectedBaseCats()
  const actors = [...selectedSquadIds.value.map(id => ({ type: 'squad' as const, id })), ...(cats.ready.length ? [{ type: 'cats' as const, id: 'cats' }] : [])]
  const columns = Math.max(1, Math.ceil(Math.sqrt(actors.length))), blockedSquads: string[] = [], reasons: string[] = [...cats.reasons]; let catsBlocked = false
  actors.forEach((actor, index) => {
    const destination = { x: Math.max(5, Math.min(95, point.x + ((index % columns) - (Math.min(columns, actors.length) - 1) / 2) * 3)), y: Math.max(7, Math.min(93, point.y + (Math.floor(index / columns) - (Math.ceil(actors.length / columns) - 1) / 2) * 3)) }
    if (actor.type === 'squad') { const reason = getMoveSquadBlockReason(props.state, actor.id, destination); if (reason) { blockedSquads.push(actor.id); reasons.push(reason) } else emit('move', actor.id, destination.x, destination.y) }
    else { const order: DeployOrder = { type: 'move', ...destination }; const reason = getDeployCatsBlockReason(props.state, cats.ready, order); if (reason) { catsBlocked = true; reasons.push(reason) } else emit('deploy', cats.ready, order) }
  })
  selectedSquadIds.value = blockedSquads; selectedCatIds.value = catsBlocked ? [...cats.blocked, ...cats.ready] : cats.blocked; commandMessage.value = failureSummary(reasons)
}
function squadCommandReason(squad: Squad) { const target = selectedTarget.value; if (target?.type === 'mission') return getAssignMissionBlockReason(props.state, squad.id, target.missionId); if (target?.type === 'base') return !['base', 'incident', 'support'].includes(squad.phase) ? undefined : 'dispatch.reason.away'; return getMoveSquadBlockReason(props.state, squad.id) }
function squadEnergy(squad: Squad) { const members = squad.members.map(id => props.state.cats.find(cat => cat.id === id)).filter(Boolean); return members.length ? Math.round(Math.min(...members.map(cat => cat!.energy))) : 0 }
function squadIsAvailable(squad: Squad) { return !getMoveSquadBlockReason(props.state, squad.id) }

function selectionBoxStyle() { const box = selectionBox.value; return box ? { left: `${Math.min(box.startX, box.x)}%`, top: `${Math.min(box.startY, box.y)}%`, width: `${Math.abs(box.x - box.startX)}%`, height: `${Math.abs(box.y - box.startY)}%` } : {} }
function pointerPoint(event: PointerEvent, element: HTMLElement) { const bounds = element.getBoundingClientRect(); return { x: (event.clientX - bounds.left) / bounds.width * 100, y: (event.clientY - bounds.top) / bounds.height * 100 } }
function beginSelection(event: PointerEvent) { if (event.button !== 0 || (event.target as HTMLElement).closest('button,.split-panel,.command-hint')) return; const element = event.currentTarget as HTMLElement, point = pointerPoint(event, element); selectionBox.value = { startX: point.x, startY: point.y, x: point.x, y: point.y, additive: event.shiftKey, pointerId: event.pointerId, dragging: false }; element.setPointerCapture(event.pointerId) }
function updateSelection(event: PointerEvent) { const box = selectionBox.value; if (!box || box.pointerId !== event.pointerId) return; const point = pointerPoint(event, event.currentTarget as HTMLElement); box.x = point.x; box.y = point.y; if (Math.hypot(box.x - box.startX, box.y - box.startY) > 0.8) box.dragging = true }
function finishSelection(event: PointerEvent) {
  const box = selectionBox.value; if (!box || box.pointerId !== event.pointerId) return
  if (box.dragging) { const left = Math.min(box.startX, box.x), right = Math.max(box.startX, box.x), top = Math.min(box.startY, box.y), bottom = Math.max(box.startY, box.y); const squadIds = props.state.squads.filter(squad => squad.phase !== 'base').filter(squad => formationIntersectsBox(squad, left, right, top, bottom)).map(squad => squad.id); const catIds = props.state.cats.filter(catIsAtBase).filter(cat => { const point = baseCatPosition(cat); return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom }).map(cat => cat.id); selectedSquadIds.value = box.additive ? [...new Set([...selectedSquadIds.value, ...squadIds])] : squadIds; selectedCatIds.value = box.additive ? [...new Set([...selectedCatIds.value, ...catIds])] : catIds; suppressMapClick = true }
  selectionBox.value = undefined
}
function handleEscape(event: KeyboardEvent) { if (event.key === 'Escape' && (selectedCount() || selectedTarget.value)) clearCommand() }
onMounted(() => { window.addEventListener('keydown', handleEscape); if (mapGrid.value) { const updateMapSize = () => { if (mapGrid.value) mapSize.value = { width: mapGrid.value.clientWidth, height: mapGrid.value.clientHeight } }; updateMapSize(); mapResizeObserver = new ResizeObserver(updateMapSize); mapResizeObserver.observe(mapGrid.value) } })
onBeforeUnmount(() => { window.removeEventListener('keydown', handleEscape); mapResizeObserver?.disconnect() })
function formatLog(entry: LogEntry) { const minutes = 540 + Math.floor(entry.time / 60); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} · ${tr(entry.key, entry.params)}` }
</script>

<template>
  <section class="map-view">
    <div ref="mapGrid" class="map-grid" :class="{ 'incident-active': state.incident, 'command-active': selectedCount() || selectedTarget, 'return-command-active': selectedSquadIds.length > 0, 'merge-active': mergeSourceSquadId }" @click="selectMapPoint" @pointerdown="beginSelection" @pointermove="updateSelection" @pointerup="finishSelection" @pointercancel="selectionBox = undefined">
      <svg class="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line v-for="squad in state.squads.filter(candidate => ['returning', 'moving', 'merging'].includes(candidate.phase) || (candidate.target && ['outbound', 'support'].includes(candidate.phase)))" :key="`route-${squad.id}`" v-bind="route(squad)" :style="{ stroke: squadColor(squad), strokeDasharray: `${3 + squadIndex(squad) % 4} ${2 + squadIndex(squad) % 3}` }" /><line v-for="squad in state.squads.filter(candidate => candidate.target && ['cleanup', 'incident'].includes(candidate.phase))" :key="`mission-link-${squad.id}`" class="mission-link" v-bind="missionLink(squad)" :style="{ stroke: squadColor(squad) }" /><line v-for="squad in state.squads.filter(candidate => candidate.phase !== 'base' && markerOffsetLink(candidate))" :key="`marker-offset-${squad.id}`" class="marker-offset-link" v-bind="markerOffsetLink(squad)" :style="{ stroke: squadColor(squad) }" /></svg>
      <span v-for="squad in state.squads.filter(candidate => candidate.phase !== 'base' && markerOffsetLink(candidate))" :key="`marker-origin-${squad.id}`" class="squad-marker-origin" :style="markerOriginStyle(squad)" aria-hidden="true"></span>
      <div class="threat-zone" :class="{ elevated: state.threat >= GAME_RULES.elevatedThreat, severe: state.threat >= GAME_RULES.severeThreat }"></div><div class="district d1">{{ tr('Старый сектор') }}</div><div class="district d2">{{ tr('Промзона') }}</div><div class="district d3">{{ tr('Терминал') }}</div>
      <button type="button" class="base-pin" :class="{ selected: selectedTarget?.type === 'base' }" @click.stop="selectBase"><strong>NL</strong><span>{{ tr('БАЗА') }}</span></button>
      <button v-for="cat in state.cats.filter(catIsAtBase)" :key="`map-cat-${cat.id}`" type="button" class="base-cat-marker" :class="{ selected: selectedCatIds.includes(cat.id), sleeping: cat.sleeping, injured: cat.injuredRemaining > 0 }" :style="baseCatStyle(cat)" :aria-label="tr(cat.name)" @click.stop="selectCat(cat, $event)"><svg viewBox="0 0 64 64" aria-hidden="true"><use :href="`${catTokensUrl}#token-${cat.id}`" /></svg><small>{{ tr(cat.name) }}</small></button>
      <div v-if="state.storyIncident" class="story-pin" :style="{ left: `${state.storyIncident.x}%`, top: `${state.storyIncident.y}%` }"><span>!</span><b>{{ tr('ДЕЛО 09') }}</b><small>{{ tr('Дезертир ждёт решения') }}</small></div><div v-if="state.storyResolution?.unlockedLocation" class="hedgehog-pin"><span>⌁</span><b>{{ tr('БАЗА ЕЖЕЙ') }}</b><small>{{ tr('координаты подтверждены') }}</small></div>
      <button v-for="mission in state.missions.filter(mission => mission.status === 'available')" :key="mission.id" type="button" class="cleanup-pin" :class="{ selected: selectedTarget?.type === 'mission' && selectedTarget.missionId === mission.id, 'enhanced-alert': mission.priority > 1 && state.research.nodes.emergency_dispatch.completed }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" :aria-label="tr('dispatch.select_mission', { mission: mission.title })" @click.stop="selectMission(mission)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span><b>{{ tr(mission.priority > 1 ? 'ПРИОРИТЕТ' : 'УБОРКА') }}</b><small>{{ tr(mission.title) }}<template v-if="mission.progress > 0"> · {{ Math.round(mission.progress / GAME_RULES.cleanupWork * 100) }}%</template></small></button>
      <button v-for="mission in state.missions.filter(isActiveAssignedMission)" :key="`assigned-${mission.id}`" type="button" class="cleanup-pin assigned" :class="{ danger: state.incident?.missionId === mission.id, selected: selectedTarget?.type === 'mission' && selectedTarget.missionId === mission.id }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" @click.stop="selectMission(mission)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span><b>{{ tr(state.incident?.missionId === mission.id ? 'ТРЕВОГА' : 'УБОРКА') }}</b><small>{{ tr(mission.title) }} · {{ Math.round(mission.progress / GAME_RULES.cleanupWork * 100) }}%</small></button>
      <div v-for="squad in state.squads.filter(candidate => candidate.phase !== 'base')" :key="squad.id" class="squad-formation" :class="[squad.phase, squad.id, squadIndex(squad) % 2 ? 'callout-right' : 'callout-left', { selected: selectedSquadIds.includes(squad.id), available: squadIsAvailable(squad) }]" :style="squadStyle(squad)" :data-squad-id="squad.id"><button v-for="member in squadFormation(squad).members" :key="member.id" type="button" class="field-cat-marker" :class="{ injured: fieldCat(squad, member.id)?.injuredRemaining }" :style="formationMemberStyle(squad, member.id)" :data-cat-id="member.id" :aria-label="fieldCatTooltip(squad, member.id)" :title="fieldCatTooltip(squad, member.id)" @click.stop="selectSquad(squad, $event)"><span aria-hidden="true"></span><svg viewBox="0 0 64 64" aria-hidden="true"><use :href="`${catTokensUrl}#token-${member.id}`" /></svg></button><span class="squad-callout"><b>{{ squadDisplayName(locale, squad) }}</b></span></div>
      <div v-if="selectedCount() || selectedTarget || commandMessage" class="command-hint"><span>{{ tr(mergeSourceSquadId ? 'squad.merge.choose_target' : selectedCount() ? 'dispatch.command.choose_target_count' : 'dispatch.command.choose_squad', { count: selectedCount() }) }}</span><button type="button" :aria-label="tr('dispatch.command.cancel')" @click.stop="clearCommand">×</button><small v-if="commandMessage">{{ tr(commandMessage) }}</small></div>
      <div v-if="selectedSquadIds.length === 1" class="single-squad-actions"><button v-if="state.squads.find(squad => squad.id === selectedSquadIds[0])?.phase !== 'base' && (state.squads.find(squad => squad.id === selectedSquadIds[0])?.members.length ?? 0) > 1" type="button" @click.stop="openSplit(state.squads.find(squad => squad.id === selectedSquadIds[0])!)">{{ tr('squad.split.action') }}</button><button type="button" @click.stop="armMerge">{{ tr('squad.merge.action') }}</button></div>
      <div v-if="selectionBox?.dragging" class="selection-box" :style="selectionBoxStyle()"></div>
      <section v-if="splitSquadId" class="split-panel" @click.stop><header><b>{{ tr('squad.split.title') }}</b><button type="button" @click="splitSquadId = undefined">×</button></header><p>{{ tr('squad.split.description') }}</p><label v-for="memberId in state.squads.find(squad => squad.id === splitSquadId)?.members ?? []" :key="memberId"><input type="checkbox" :checked="splitMemberIds.includes(memberId)" @change="toggleSplitMember(memberId)">{{ tr(state.cats.find(cat => cat.id === memberId)?.name ?? memberId) }}</label><small v-if="getSplitSquadBlockReason(state, splitSquadId, splitMemberIds)">{{ tr(getSplitSquadBlockReason(state, splitSquadId, splitMemberIds)!) }}</small><button type="button" :disabled="Boolean(getSplitSquadBlockReason(state, splitSquadId, splitMemberIds))" @click="confirmSplit">{{ tr('squad.split.confirm') }}</button></section>
    </div>
    <aside><section class="map-squad-list"><h2>{{ tr('dispatch.command.squads') }}</h2><p v-if="!state.squads.length" class="empty-squad-list">{{ tr('dispatch.command.no_squads') }}</p><button v-for="squad in state.squads" :key="`command-${squad.id}`" type="button" :class="{ selected: squad.phase === 'base' ? squad.members.every(id => selectedCatIds.includes(id)) : selectedSquadIds.includes(squad.id), available: squadIsAvailable(squad) }" @click="selectSquad(squad, $event)"><span><b>{{ squadDisplayName(locale, squad) }} <em v-if="squadIsAvailable(squad)">{{ tr('dispatch.command.available') }}</em></b><small>{{ squadLabel(squad) }}</small></span><span><strong class="squad-energy" :class="{ tired: squadCommandReason(squad) === 'dispatch.reason.tired' }">{{ tr('dispatch.command.energy', { energy: squadEnergy(squad) }) }}</strong><small v-if="squadCommandReason(squad) && squadCommandReason(squad) !== 'dispatch.reason.tired'">{{ tr(squadCommandReason(squad)!) }}</small></span></button></section><h2>{{ tr('ОПЕРАТИВНАЯ ЛЕНТА') }}</h2><p class="goal">{{ tr('objective.summary', { fame: GAME_RULES.fameGoal }) }}</p><div class="case-progress" :class="{ done: state.storyResolution }"><span>{{ tr('ДЕЛО 09') }}</span><b>{{ tr(state.storyResolution ? 'ЗАКРЫТО' : state.storyIncident ? 'ТРЕБУЕТ РЕШЕНИЯ' : 'ОЖИДАЕТ СИГНАЛА') }}</b></div><article v-for="(item, index) in state.log" :key="`${index}-${item.time}-${item.key}`">{{ formatLog(item) }}</article></aside>
  </section>
</template>
