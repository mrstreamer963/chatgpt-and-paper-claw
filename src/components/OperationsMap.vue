<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { GAME_RULES, getAssignMissionBlockReason, getCleanupSecondsRemaining, getDeployCatsBlockReason, getMergeSquadsBlockReason, getMoveSquadBlockReason, getSplitSquadBlockReason, getSquadMapPosition, type Cat, type DeployOrder, type LogEntry, type MapPoint, type Mission, type Squad, type State } from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'
import catTokensUrl from '../../assets/art/cat-tokens.svg?url'
import uiIconsUrl from '../../assets/art/ui-icons.svg?url'
import { baseFormationOffsets, formationOffsets } from '../map/formation'
import { useMapSelection } from '../map/useMapSelection'
import { orderFailureSummary, partitionSelectedBaseCats as getSelectedBaseCats, validateDeployOrder } from '../map/useMapOrders'
import MapRouteLayer from './MapRouteLayer.vue'
import MapSquadLayer from './MapSquadLayer.vue'
import MapSidePanel from './MapSidePanel.vue'

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
const { selectedSquadIds, selectedCatIds, selectedTarget, commandMessage, mergeSourceSquadId, selectedCount, clearCommand, handleEscape } = useMapSelection()
const splitSquadId = ref<string>()
const splitMemberIds = ref<string[]>([])
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

function squadStyle(squad: Squad) { const position = squadPosition(squad); return { left: `${position.x}%`, top: `${position.y}%`, '--squad-color': squadColor(squad) } }
function formationMemberStyle(member: { x: number; y: number }) { return { left: `${member.x}px`, top: `${member.y}px` } }
function squadMembers(squad: Squad) { return squad.members.map((id, index) => ({ id, ...formationOffsets(squad.members.length)[index] })) }
function fieldCat(_squad: Squad, memberId: string) { return props.state.cats.find(cat => cat.id === memberId) }
function fieldCatTooltip(squad: Squad, memberId: string) {
  const cat = fieldCat(squad, memberId)
  if (!cat) return memberId
  const condition = cat.injuredRemaining > 0
    ? tr('cat.injured', { seconds: Math.ceil(cat.injuredRemaining) })
    : tr('cat.energy', { role: tr(cat.role), energy: Math.round(cat.energy) })
  return `${tr(cat.name)} · ${condition}`
}
function baseCatTooltip(cat: Cat) {
  const condition = cat.injuredRemaining > 0
    ? tr('cat.injured', { seconds: Math.ceil(cat.injuredRemaining) })
    : tr('cat.energy', { role: tr(cat.role), energy: Math.round(cat.energy) })
  return `${tr(cat.name)} · ${condition}`
}
function formationIntersectsBox(squad: Squad, left: number, right: number, top: number, bottom: number) {
  const anchor = squadPosition(squad)
  const halfWidth = 19 / mapSize.value.width * 100
  const halfHeight = 22 / mapSize.value.height * 100
  return squadMembers(squad).some(member => {
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
function missionLink(squad: Squad) { const position = squadPosition(squad); return { x1: position.x, y1: position.y, x2: squad.target?.x ?? position.x, y2: squad.target?.y ?? position.y } }
function markerOriginStyle(squad: Squad) { const position = squadPosition(squad); return { left: `${position.x}%`, top: `${position.y}%`, '--squad-color': squadColor(squad) } }

function catIsAtBase(cat: Cat) { return !cat.assignedTo || props.state.squads.find(squad => squad.id === cat.assignedTo)?.phase === 'base' }
function baseCatPosition(cat: Cat) {
  const baseCats = props.state.cats.filter(candidate => catIsAtBase(candidate))
  const index = Math.max(0, baseCats.findIndex(candidate => candidate.id === cat.id))
  const offset = baseFormationOffsets(baseCats.length)[index] ?? { x: 0, y: 0 }
  return { x: base.x + offset.x / mapSize.value.width * 100, y: base.y + offset.y / mapSize.value.height * 100 }
}
function baseCatStyle(cat: Cat) {
  const squad = props.state.squads.find(candidate => candidate.id === cat.assignedTo)
  const position = baseCatPosition(cat)
  return {
    left: `${position.x}%`, top: `${position.y}%`,
    '--squad-color': squad ? squadColor(squad) : '#d8c7a7',
  }
}
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

function setFailure(reason: string) { commandMessage.value = reason }
function partitionSelectedBaseCats() {
  return getSelectedBaseCats(props.state, selectedCatIds.value)
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
  commandMessage.value = orderFailureSummary(reasons)
}
function issueReturn() {
  const blocked: string[] = [], reasons: string[] = []
  for (const squadId of selectedSquadIds.value) { const squad = props.state.squads.find(candidate => candidate.id === squadId); if (!squad || ['incident', 'support'].includes(squad.phase)) { blocked.push(squadId); reasons.push('dispatch.reason.away') } else if (squad.phase !== 'base') emit('returnHome', squad.id) }
  selectedSquadIds.value = blocked; selectedCatIds.value = []; selectedTarget.value = undefined; commandMessage.value = orderFailureSummary(reasons)
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
function selectMission(mission: Mission) { commandMessage.value = undefined; if (selectedCount.value) return issueMission(mission); selectedTarget.value = selectedTarget.value?.type === 'mission' && selectedTarget.value.missionId === mission.id ? undefined : { type: 'mission', missionId: mission.id } }
function selectBase() { commandMessage.value = undefined; if (selectedCount.value) return issueReturn(); selectedTarget.value = selectedTarget.value?.type === 'base' ? undefined : { type: 'base' } }

function selectMapPoint(event: MouseEvent) {
  if (suppressMapClick) { suppressMapClick = false; return }
  if (!selectedCount.value) return
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const point: MapPoint = { x: Math.max(5, Math.min(95, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(7, Math.min(93, (event.clientY - bounds.top) / bounds.height * 100)) }
  const cats = partitionSelectedBaseCats()
  const actors = [...selectedSquadIds.value.map(id => ({ type: 'squad' as const, id })), ...(cats.ready.length ? [{ type: 'cats' as const, id: 'cats' }] : [])]
  const columns = Math.max(1, Math.ceil(Math.sqrt(actors.length))), blockedSquads: string[] = [], reasons: string[] = [...cats.reasons]; let catsBlocked = false
  actors.forEach((actor, index) => {
    const destination = { x: Math.max(5, Math.min(95, point.x + ((index % columns) - (Math.min(columns, actors.length) - 1) / 2) * 3)), y: Math.max(7, Math.min(93, point.y + (Math.floor(index / columns) - (Math.ceil(actors.length / columns) - 1) / 2) * 3)) }
    if (actor.type === 'squad') { const reason = getMoveSquadBlockReason(props.state, actor.id, destination); if (reason) { blockedSquads.push(actor.id); reasons.push(reason) } else emit('move', actor.id, destination.x, destination.y) }
    else { const order: DeployOrder = { type: 'move', ...destination }; const reason = validateDeployOrder(props.state, cats.ready, order); if (reason) { catsBlocked = true; reasons.push(reason) } else emit('deploy', cats.ready, order) }
  })
  selectedSquadIds.value = blockedSquads; selectedCatIds.value = catsBlocked ? [...cats.blocked, ...cats.ready] : cats.blocked; commandMessage.value = orderFailureSummary(reasons)
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
onMounted(() => { window.addEventListener('keydown', handleEscape); if (mapGrid.value) { const updateMapSize = () => { if (mapGrid.value) mapSize.value = { width: mapGrid.value.clientWidth, height: mapGrid.value.clientHeight } }; updateMapSize(); mapResizeObserver = new ResizeObserver(updateMapSize); mapResizeObserver.observe(mapGrid.value) } })
onBeforeUnmount(() => { window.removeEventListener('keydown', handleEscape); mapResizeObserver?.disconnect() })
function formatLog(entry: LogEntry) { const minutes = 540 + Math.floor(entry.time / 60); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} · ${tr(entry.key, entry.params)}` }
</script>

<template>
  <section class="map-view">
    <div ref="mapGrid" class="map-grid" :class="{ 'incident-active': state.incident, 'command-active': selectedCount || selectedTarget, 'return-command-active': selectedSquadIds.length > 0, 'merge-active': mergeSourceSquadId }" @click="selectMapPoint" @pointerdown="beginSelection" @pointermove="updateSelection" @pointerup="finishSelection" @pointercancel="selectionBox = undefined">
      <MapRouteLayer :state="state" :base="base" :squad-color="squadColor" :squad-index="squadIndex" />
      <MapSquadLayer :state="state" :selected-squad-ids="selectedSquadIds" :squad-style="squadStyle" :squad-is-available="squadIsAvailable" :field-cat-tooltip="fieldCatTooltip" :squad-color="squadColor" :field-cat="fieldCat" :cat-tokens-url="catTokensUrl" :squad-palette="squadPalette" @select="selectSquad" />
      <div class="threat-zone" :class="{ elevated: state.threat >= GAME_RULES.elevatedThreat, severe: state.threat >= GAME_RULES.severeThreat }"></div>
      <button type="button" class="base-pin" :class="{ selected: selectedTarget?.type === 'base' }" :aria-label="tr('БАЗА')" @click.stop="selectBase"><strong>NL</strong></button>
      <button v-for="cat in state.cats.filter(catIsAtBase)" :key="`map-cat-${cat.id}`" type="button" class="base-cat-marker" :class="{ selected: selectedCatIds.includes(cat.id), sleeping: cat.sleeping, injured: cat.injuredRemaining > 0 }" :style="baseCatStyle(cat)" :aria-label="tr(cat.name)" :title="baseCatTooltip(cat)" @click.stop="selectCat(cat, $event)"><svg viewBox="0 0 64 64" aria-hidden="true"><use :href="`${catTokensUrl}#token-${cat.id}`" /></svg></button>
      <div v-if="state.storyIncident" class="story-pin" :style="{ left: `${state.storyIncident.x}%`, top: `${state.storyIncident.y}%` }" :aria-label="tr('Дезертир ждёт решения')"><span>!</span></div><div v-if="state.storyResolution?.unlockedLocation" class="hedgehog-pin"><span>⌁</span></div>
      <button v-for="mission in state.missions.filter(mission => mission.status === 'available')" :key="mission.id" type="button" class="cleanup-pin" :class="{ selected: selectedTarget?.type === 'mission' && selectedTarget.missionId === mission.id, 'enhanced-alert': mission.priority > 1 && state.research.nodes.emergency_dispatch.completed }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" :aria-label="tr('dispatch.select_mission', { mission: mission.title })" @click.stop="selectMission(mission)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span></button>
      <button v-for="mission in state.missions.filter(isActiveAssignedMission)" :key="`assigned-${mission.id}`" type="button" class="cleanup-pin assigned" :class="{ danger: state.incident?.missionId === mission.id, selected: selectedTarget?.type === 'mission' && selectedTarget.missionId === mission.id }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" :aria-label="tr('dispatch.select_mission', { mission: mission.title })" @click.stop="selectMission(mission)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span></button>
      <div v-if="selectedCount || selectedTarget || commandMessage" class="command-hint"><span>{{ tr(mergeSourceSquadId ? 'squad.merge.choose_target' : selectedCount ? 'dispatch.command.choose_target_count' : 'dispatch.command.choose_squad', { count: selectedCount }) }}</span><button type="button" :aria-label="tr('dispatch.command.cancel')" @click.stop="clearCommand">×</button><small v-if="commandMessage">{{ tr(commandMessage) }}</small></div>
      <div v-if="selectedSquadIds.length === 1" class="single-squad-actions"><button v-if="state.squads.find(squad => squad.id === selectedSquadIds[0])?.phase !== 'base' && (state.squads.find(squad => squad.id === selectedSquadIds[0])?.members.length ?? 0) > 1" type="button" @click.stop="openSplit(state.squads.find(squad => squad.id === selectedSquadIds[0])!)">{{ tr('squad.split.action') }}</button><button type="button" @click.stop="armMerge">{{ tr('squad.merge.action') }}</button></div>
      <div v-if="selectionBox?.dragging" class="selection-box" :style="selectionBoxStyle()"></div>
      <section v-if="splitSquadId" class="split-panel" @click.stop><header><b>{{ tr('squad.split.title') }}</b><button type="button" @click="splitSquadId = undefined">×</button></header><p>{{ tr('squad.split.description') }}</p><label v-for="memberId in state.squads.find(squad => squad.id === splitSquadId)?.members ?? []" :key="memberId"><input type="checkbox" :checked="splitMemberIds.includes(memberId)" @change="toggleSplitMember(memberId)">{{ tr(state.cats.find(cat => cat.id === memberId)?.name ?? memberId) }}</label><small v-if="getSplitSquadBlockReason(state, splitSquadId, splitMemberIds)">{{ tr(getSplitSquadBlockReason(state, splitSquadId, splitMemberIds)!) }}</small><button type="button" :disabled="Boolean(getSplitSquadBlockReason(state, splitSquadId, splitMemberIds))" @click="confirmSplit">{{ tr('squad.split.confirm') }}</button></section>
    </div>
    <MapSidePanel :state="state" :locale="locale" :selected-squad-ids="selectedSquadIds" :selected-cat-ids="selectedCatIds" :squad-is-available="squadIsAvailable" :squad-command-reason="squadCommandReason" :squad-energy="squadEnergy" :squad-label="squadLabel" @select="selectSquad" />
  </section>
</template>
