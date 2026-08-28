<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CITY_PLACES, CITY_QUARTERS, DISTRICT_DEFINITIONS, GAME_RULES, LOCAL_STREETS, ROUTE_EDGES, ROUTE_NODES, getAssignMissionBlockReason, getCleanupSecondsRemaining, getMoveSquadBlockReason, getNinthLifeDispatchBlockReason, getRelationPresentation, getReturnSquadBlockReason, getRouteEdgePoints, getSquadMapPosition, getSquadMinimumEnergy, getVisibleHeadquarters, getWaterFiltersDispatchBlockReason, isActiveAssignedMission, isSquadResting, type DistrictId, type LogEntry, type MapPoint, type Mission, type RelationOwnerId, type RouteEdge, type Squad, type State } from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'
import catTokensUrl from '../../assets/art/cat-tokens.svg?url'
import uiIconsUrl from '../../assets/art/ui-icons.svg?url'
import { formationOffsets } from '../map/formation'
import { useMapSelection } from '../map/useMapSelection'
import MapRouteLayer from './MapRouteLayer.vue'
import MapSquadLayer from './MapSquadLayer.vue'
import MapSidePanel from './MapSidePanel.vue'
import ActiveMissionRail from './ActiveMissionRail.vue'

const props = withDefaults(defineProps<{ state: State; locale: Locale; highlightRouteNodes?: boolean }>(), { highlightRouteNodes: false })
const emit = defineEmits<{
  assign: [squadIds: string[], missionId: string]
  move: [squadIds: string[], x: number, y: number]
  returnHome: [squadIds: string[]]
  dispatchStory: [squadId: string]
  dispatchUrgent: [squadId: string]
}>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)
const base = { x: 46, y: 51 }
const { selectedSquadIds, selectedTarget, commandMessage, selectedCount, clearCommand, handleEscape } = useMapSelection()
const mapGrid = ref<HTMLElement>()
const mapZoom = ref(1)
const mapPan = ref({ x: 0, y: 0 })
const selectedHqId = ref<string>()
const visibleHeadquarters = computed(() => getVisibleHeadquarters(props.state))
const visibleRouteEdges = computed(() => ROUTE_EDGES.filter(edge => props.state.hedgehogHqKnowledge === 'confirmed'
  || (edge.from !== 'metro-depot' && edge.to !== 'metro-depot')))
const visibleCityPlaces = computed(() => CITY_PLACES.filter(place => props.state.districts[place.districtId].access === 'operational'
  && (place.id !== 'old-metro-tunnel' || props.state.hedgehogHqKnowledge === 'confirmed')))
const selectedHq = computed(() => visibleHeadquarters.value.find(hq => hq.id === selectedHqId.value))
const selectedDistrictId = ref<DistrictId>()
const selectedDistrict = computed(() => DISTRICT_DEFINITIONS.find(district => district.id === selectedDistrictId.value))
const mapSize = ref({ width: 1000, height: 700 })
const selectionBox = ref<{ startX: number; startY: number; x: number; y: number; additive: boolean; pointerId: number; dragging: boolean }>()
let mapResizeObserver: ResizeObserver | undefined
let suppressMapClick = false

function squadPosition(squad: Squad) {
  const { x, y } = getSquadMapPosition(squad, props.state.simulationRemainder)
  return { x: Math.max(5, Math.min(95, x)), y: Math.max(7, Math.min(93, y)) }
}
const squadPalette = ['#e5ab64', '#77c5c9', '#8fca78', '#c58fda', '#df7d72', '#7d9fdf']
function squadIndex(squad: Squad) { return Math.max(0, props.state.squads.findIndex(candidate => candidate.id === squad.id)) }
function squadColor(squad: Squad) { const index = squadIndex(squad); return squadPalette[index] ?? `hsl(${(index * 137.5) % 360} 54% 66%)` }

function squadStyle(squad: Squad) { const position = squadPosition(squad); return { left: `${position.x}%`, top: `${position.y}%`, '--squad-color': squadColor(squad) } }
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

function squadLabel(squad: Squad) {
  if (squad.phase === 'base') return tr(isSquadResting(props.state, squad) ? 'status.resting' : squad.autoDispatch ? 'status.base_ready' : 'status.awaiting_order')
  if (squad.phase === 'field') return tr('status.field')
  if (squad.phase === 'outbound') return tr('status.outbound', { mission: squad.target?.title ?? '', seconds: Math.ceil(squad.travelDuration - squad.travel) })
  if (squad.phase === 'moving') return tr('status.moving', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'returning') return tr('status.returning')
  if (squad.phase === 'support') return tr('status.support', { seconds: Math.max(0, Math.ceil(squad.travelDuration - squad.travel)) })
  if (squad.phase === 'merging') return tr('status.merging')
  if (squad.phase === 'incident') return tr('status.incident')
  if (squad.phase === 'urgent') return tr('status.urgent')
  return tr('status.cleanup', { progress: Math.round((props.state.missions.find(mission => mission.id === squad.missionId)?.progress ?? 0) / GAME_RULES.cleanupWork * 100), seconds: Math.ceil(getCleanupSecondsRemaining(props.state, squad)) })
}

function setFailure(reason: string) { commandMessage.value = reason }
function issueMission(mission: Mission) {
  const blockedSquads: string[] = [], reasons: string[] = []
  for (const squadId of selectedSquadIds.value) { const reason = getAssignMissionBlockReason(props.state, squadId, mission.id); if (reason) { blockedSquads.push(squadId); reasons.push(reason) } }
  emit('assign', [...selectedSquadIds.value], mission.id)
  selectedSquadIds.value = blockedSquads
  selectedTarget.value = undefined
  commandMessage.value = reasons.length > 1 ? 'dispatch.reason.partial' : reasons[0]
}
function issueReturn() {
  const blocked: string[] = [], reasons: string[] = []
  for (const squadId of selectedSquadIds.value) { const reason = getReturnSquadBlockReason(props.state, squadId); if (reason) { blocked.push(squadId); reasons.push(reason) } }
  emit('returnHome', [...selectedSquadIds.value])
  selectedSquadIds.value = blocked; selectedTarget.value = undefined; commandMessage.value = reasons.length > 1 ? 'dispatch.reason.partial' : reasons[0]
}
function selectSquad(squad: Squad, event?: MouseEvent) {
  commandMessage.value = undefined
  const target = selectedTarget.value
  if (target?.type === 'mission') { const mission = props.state.missions.find(candidate => candidate.id === target.missionId); selectedSquadIds.value = [...new Set([...selectedSquadIds.value, squad.id])]; if (mission) issueMission(mission); return }
  if (selectedTarget.value?.type === 'base') { selectedSquadIds.value = [...new Set([...selectedSquadIds.value, squad.id])]; issueReturn(); return }
  if (event?.shiftKey) selectedSquadIds.value = selectedSquadIds.value.includes(squad.id) ? selectedSquadIds.value.filter(id => id !== squad.id) : [...selectedSquadIds.value, squad.id]
  else selectedSquadIds.value = [squad.id]
}

function selectMission(mission: Mission) { commandMessage.value = undefined; if (selectedCount.value) return issueMission(mission); selectedTarget.value = selectedTarget.value?.type === 'mission' && selectedTarget.value.missionId === mission.id ? undefined : { type: 'mission', missionId: mission.id } }
function selectBase() { commandMessage.value = undefined; if (selectedCount.value) return issueReturn(); selectedTarget.value = selectedTarget.value?.type === 'base' ? undefined : { type: 'base' } }

function selectedCommandSquads() {
  return selectedSquadIds.value
    .map(id => props.state.squads.find(squad => squad.id === id))
    .filter((squad): squad is Squad => Boolean(squad))
}

function dispatchStory() {
  const candidates = selectedCommandSquads()
  if (candidates.length !== 1) return setFailure('story.dispatch.reason.select_one')
  const reason = getNinthLifeDispatchBlockReason(props.state, candidates[0].id)
  if (reason) return setFailure(reason)
  emit('dispatchStory', candidates[0].id)
  clearCommand()
}

function dispatchUrgent() {
  const candidates = selectedCommandSquads()
  if (candidates.length !== 1) return setFailure('urgent.water_filters.reason.select_one')
  const reason = getWaterFiltersDispatchBlockReason(props.state, candidates[0].id)
  if (reason) return setFailure(reason)
  emit('dispatchUrgent', candidates[0].id)
  clearCommand()
}

function clampMapPan(zoom = mapZoom.value, pan = mapPan.value) {
  const width = mapSize.value.width, height = mapSize.value.height
  return { x: Math.min(0, Math.max(width * (1 - zoom), pan.x)), y: Math.min(0, Math.max(height * (1 - zoom), pan.y)) }
}
function mapCanvasStyle() {
  const inverse = 1 / mapZoom.value
  return {
    transform: `translate(${mapPan.value.x}px, ${mapPan.value.y}px) scale(${mapZoom.value})`,
    '--map-inverse-zoom': `${inverse}`,
    '--district-stroke': `${.45 * inverse}px`, '--quarter-stroke': `${.34 * inverse}px`, '--local-street-stroke': `${.32 * inverse}px`,
    '--arterial-stroke': `${.55 * inverse}px`, '--edge-local-stroke': `${.42 * inverse}px`, '--inner-ring-stroke': `${.9 * inverse}px`,
    '--outer-ring-stroke': `${1.05 * inverse}px`, '--radial-stroke': `${.8 * inverse}px`, '--shortcut-stroke': `${.65 * inverse}px`,
    '--monolith-route-stroke': `${.35 * inverse}px`, '--external-route-stroke': `${.45 * inverse}px`,
    '--dash-local-street': `${.65 * inverse}px ${.45 * inverse}px`, '--dash-edge-local': `${1.2 * inverse}px ${1 * inverse}px`,
    '--dash-shortcut': `${2 * inverse}px ${1.1 * inverse}px`, '--dash-external': `${1.5 * inverse}px ${1 * inverse}px`,
    '--dash-isolated': `${2 * inverse}px ${1.5 * inverse}px`,
  }
}
function resetMapZoom() { mapZoom.value = 1; mapPan.value = { x: 0, y: 0 } }
function zoomMap(event: WheelEvent) {
  if (!mapGrid.value) return
  const bounds = mapGrid.value.getBoundingClientRect()
  const cursor = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  const previousZoom = mapZoom.value
  const nextZoom = Math.max(1, Math.min(2.5, previousZoom * Math.exp(-event.deltaY * 0.0015)))
  if (Math.abs(nextZoom - previousZoom) < 0.001) return
  const content = { x: (cursor.x - mapPan.value.x) / previousZoom, y: (cursor.y - mapPan.value.y) / previousZoom }
  mapZoom.value = nextZoom
  mapPan.value = clampMapPan(nextZoom, { x: cursor.x - content.x * nextZoom, y: cursor.y - content.y * nextZoom })
}
function screenToMapPoint(clientX: number, clientY: number, element: HTMLElement): MapPoint {
  const bounds = element.getBoundingClientRect()
  return { x: ((clientX - bounds.left - mapPan.value.x) / mapZoom.value) / bounds.width * 100, y: ((clientY - bounds.top - mapPan.value.y) / mapZoom.value) / bounds.height * 100 }
}
function selectMapPoint(event: MouseEvent) {
  if (suppressMapClick) { suppressMapClick = false; return }
  if (!selectedCount.value) return
  const rawPoint = screenToMapPoint(event.clientX, event.clientY, event.currentTarget as HTMLElement)
  const point: MapPoint = { x: Math.max(5, Math.min(95, rawPoint.x)), y: Math.max(7, Math.min(93, rawPoint.y)) }
  const actors = [...selectedSquadIds.value], blockedSquads: string[] = [], reasons: string[] = []
  actors.forEach(squadId => {
    const reason = getMoveSquadBlockReason(props.state, squadId)
    if (reason) { blockedSquads.push(squadId); reasons.push(reason) }
  })
  emit('move', actors, point.x, point.y)
  selectedSquadIds.value = blockedSquads; commandMessage.value = reasons.length > 1 ? 'dispatch.reason.partial' : reasons[0]
}
function squadCommandReason(squad: Squad) { const target = selectedTarget.value; if (target?.type === 'mission') return getAssignMissionBlockReason(props.state, squad.id, target.missionId); if (target?.type === 'base') return getReturnSquadBlockReason(props.state, squad.id); return getMoveSquadBlockReason(props.state, squad.id) }
function squadEnergy(squad: Squad) { return getSquadMinimumEnergy(props.state, squad) }
function squadIsAvailable(squad: Squad) { return !getMoveSquadBlockReason(props.state, squad.id) }

function selectionBoxStyle() { const box = selectionBox.value; return box ? { left: `${Math.min(box.startX, box.x)}%`, top: `${Math.min(box.startY, box.y)}%`, width: `${Math.abs(box.x - box.startX)}%`, height: `${Math.abs(box.y - box.startY)}%` } : {} }
function pointerPoint(event: PointerEvent, element: HTMLElement) { return screenToMapPoint(event.clientX, event.clientY, element) }
function beginSelection(event: PointerEvent) { if (event.button !== 0 || (event.target as HTMLElement).closest('button,.split-panel,.command-hint')) return; const element = event.currentTarget as HTMLElement, point = pointerPoint(event, element); selectionBox.value = { startX: point.x, startY: point.y, x: point.x, y: point.y, additive: event.shiftKey, pointerId: event.pointerId, dragging: false }; element.setPointerCapture(event.pointerId) }
function updateSelection(event: PointerEvent) { const box = selectionBox.value; if (!box || box.pointerId !== event.pointerId) return; const point = pointerPoint(event, event.currentTarget as HTMLElement); box.x = point.x; box.y = point.y; if (Math.hypot(box.x - box.startX, box.y - box.startY) > 0.8) box.dragging = true }
function finishSelection(event: PointerEvent) {
  const box = selectionBox.value; if (!box || box.pointerId !== event.pointerId) return
  if (box.dragging) { const left = Math.min(box.startX, box.x), right = Math.max(box.startX, box.x), top = Math.min(box.startY, box.y), bottom = Math.max(box.startY, box.y); const squadIds = props.state.squads.filter(squad => squad.phase !== 'base').filter(squad => formationIntersectsBox(squad, left, right, top, bottom)).map(squad => squad.id); selectedSquadIds.value = box.additive ? [...new Set([...selectedSquadIds.value, ...squadIds])] : squadIds; suppressMapClick = true }
  selectionBox.value = undefined
}
onMounted(() => { window.addEventListener('keydown', handleEscape); if (mapGrid.value) { const updateMapSize = () => { if (mapGrid.value) { mapSize.value = { width: mapGrid.value.clientWidth, height: mapGrid.value.clientHeight }; mapPan.value = clampMapPan() } }; updateMapSize(); mapResizeObserver = new ResizeObserver(updateMapSize); mapResizeObserver.observe(mapGrid.value) } })
onBeforeUnmount(() => { window.removeEventListener('keydown', handleEscape); mapResizeObserver?.disconnect() })
function formatLog(entry: LogEntry) { const minutes = 540 + Math.floor(entry.time / 60); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} · ${tr(entry.key, entry.params)}` }
function polygonPoints(points: readonly MapPoint[]) { return points.map(point => `${point.x},${point.y}`).join(' ') }
function routeEdgePoints(edge: RouteEdge) { return polygonPoints(getRouteEdgePoints(edge)) }
function relationLabel(ownerId: RelationOwnerId) {
  const presentation = getRelationPresentation(props.state, ownerId)
  return `${tr(presentation.label)} · ${presentation.value}/${presentation.maximum}`
}
</script>

<template>
  <section class="map-view">
    <ActiveMissionRail :state="state" :locale="locale" :selected-mission-id="selectedTarget?.type === 'mission' ? selectedTarget.missionId : undefined" @select="selectMission" />
    <div ref="mapGrid" class="map-grid" :class="{ 'incident-active': state.incident, 'command-active': selectedCount || selectedTarget, 'return-command-active': selectedSquadIds.length > 0 }" @click="selectMapPoint" @wheel.prevent="zoomMap" @pointerdown="beginSelection" @pointermove="updateSelection" @pointerup="finishSelection" @pointercancel="selectionBox = undefined">
      <div class="map-canvas" :style="mapCanvasStyle()">
      <svg class="city-schematic" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <g class="district-shapes">
          <polygon v-for="district in DISTRICT_DEFINITIONS" :key="district.id" :points="polygonPoints(district.polygon)" :class="[`access-${state.districts[district.id].access}`, { 'risk-elevated': state.districts[district.id].risk >= 30, 'risk-severe': state.districts[district.id].risk >= 50 }]" />
        </g>
        <g class="city-quarters">
          <polygon v-for="quarter in CITY_QUARTERS" :key="quarter.id" :points="polygonPoints(quarter.polygon)" :class="[`role-${quarter.role}`, `access-${state.districts[quarter.districtId].access}`, { significant: quarter.significant }]" />
        </g>
        <g class="local-streets">
          <polyline v-for="street in LOCAL_STREETS" :key="street.id" :points="polygonPoints(street.points)" :class="`access-${state.districts[street.districtId].access}`" />
        </g>
        <g class="arterial-lines">
          <polyline v-for="edge in visibleRouteEdges" :key="`${edge.from}-${edge.to}`" :class="`edge-${edge.kind}`" :points="routeEdgePoints(edge)" />
        </g>
      </svg>
      <div v-for="place in visibleCityPlaces" :key="place.id" class="city-place" :class="`kind-${place.kind}`" :style="{ left: `${place.point.x}%`, top: `${place.point.y}%` }"><span></span><b>{{ tr(place.name) }}</b></div>
      <div v-if="highlightRouteNodes" class="debug-route-nodes" aria-hidden="true">
        <div v-for="node in ROUTE_NODES" :key="`debug-${node.id}`" class="debug-route-node" :class="{ hidden: node.id === 'metro-depot' }" :style="{ left: `${node.point.x}%`, top: `${node.point.y}%` }"><span></span><b>{{ node.id }}</b></div>
      </div>
      <button v-for="district in DISTRICT_DEFINITIONS" :key="`district-${district.id}`" type="button" class="district-label" :class="[`access-${state.districts[district.id].access}`, { selected: selectedDistrictId === district.id }]" :style="{ left: `${district.center.x}%`, top: `${district.center.y}%` }" @click.stop="selectedDistrictId = selectedDistrictId === district.id ? undefined : district.id">
        <b>{{ tr(district.name) }}</b><small>{{ tr(district.arterial) }}</small>
      </button>
      <section v-if="selectedDistrict" class="district-card" @click.stop>
        <button @click="selectedDistrictId = undefined">×</button>
        <small>{{ tr(`district.access.${state.districts[selectedDistrict.id].access}`) }}</small>
        <h3>{{ tr(selectedDistrict.name) }}</h3>
        <p>{{ tr(selectedDistrict.arterial) }}</p>
        <b v-if="state.districts[selectedDistrict.id].access === 'operational'">{{ tr('district.risk') }}: {{ state.districts[selectedDistrict.id].risk }}</b>
        <span>{{ tr(state.districts[selectedDistrict.id].accessReason) }}</span>
      </section>
      <MapRouteLayer :state="state" :base="base" :map-zoom="mapZoom" :squad-color="squadColor" :squad-index="squadIndex" />
      <MapSquadLayer :state="state" :selected-squad-ids="selectedSquadIds" :squad-style="squadStyle" :squad-is-available="squadIsAvailable" :field-cat-tooltip="fieldCatTooltip" :squad-color="squadColor" :field-cat="fieldCat" :cat-tokens-url="catTokensUrl" :squad-palette="squadPalette" @select="selectSquad" />
      <div class="threat-zone" :class="{ elevated: state.corporateThreat >= GAME_RULES.elevatedThreat, severe: state.corporateThreat >= GAME_RULES.severeThreat }"></div>
      <div v-for="cordon in state.cordons" :key="cordon.id" class="cordon-zone" :style="{ left: `${cordon.x}%`, top: `${cordon.y}%`, width: `${cordon.radius * 2}%`, aspectRatio: '1' }"><b>{{ tr('map.cordon') }}</b><small>{{ Math.max(0, Math.ceil(cordon.endsAt - state.time)) }} с</small></div>
      <svg v-if="state.monolith.status === 'en_route' && state.monolith.target" class="monolith-route" viewBox="0 0 100 100" preserveAspectRatio="none"><line :x1="state.monolith.from.x" :y1="state.monolith.from.y" :x2="state.monolith.target.x" :y2="state.monolith.target.y" /></svg>
      <div v-if="state.monolith.status === 'en_route'" class="monolith-unit" :style="{ left: `${state.monolith.x}%`, top: `${state.monolith.y}%` }"><span>M</span><b>{{ tr('monolith.unit') }}</b></div>
      <template v-for="unit in state.externalUnits" :key="unit.id">
        <svg v-if="['en_route','returning'].includes(unit.status) && unit.route.length > 1" class="external-unit-route" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline :points="polygonPoints(unit.route)" /></svg>
        <div v-if="unit.status !== 'available' || (unit.id === 'patrol_12' && state.districts.residential_ring.access === 'operational')" class="external-unit" :class="unit.ownerId" :style="{ left: `${unit.x}%`, top: `${unit.y}%` }"><span>{{ unit.id === 'guard_7' ? 'M' : 'P' }}</span><b>{{ tr(unit.name) }}</b></div>
      </template>
      <button v-for="hq in visibleHeadquarters" :key="hq.id" type="button" class="hq-pin" :class="{ monolith: hq.id === 'monolith', hostile: hq.ownerId === 'needle_front', selected: selectedHqId === hq.id }" :style="{ left: `${hq.x}%`, top: `${hq.y}%` }" @click.stop="selectedHqId = selectedHqId === hq.id ? undefined : hq.id"><span>{{ hq.id === 'monolith' ? 'M' : hq.ownerId === 'needle_front' ? '⌁' : '◆' }}</span><small>{{ tr(hq.name) }}</small></button>
      <section v-if="selectedHq" class="hq-card" @click.stop><button @click="selectedHqId = undefined">×</button><h3>{{ tr(selectedHq.name) }}</h3><p>{{ tr(selectedHq.function) }}</p><b>{{ tr('hq.relation') }}: {{ relationLabel(selectedHq.ownerId) }}</b><small v-if="state.relationLastEvent[selectedHq.ownerId]">{{ tr(state.relationLastEvent[selectedHq.ownerId]!) }}</small><small v-if="selectedHq.id === 'monolith'">{{ tr(`external.status.${state.externalUnits.guard_7.status}`) }}</small><small v-if="selectedHq.id === 'police'">{{ tr(`external.status.${state.externalUnits.patrol_12.status}`) }}</small></section>
      <button type="button" class="base-pin" :class="{ selected: selectedTarget?.type === 'base' }" :aria-label="tr('БАЗА')" @click.stop="selectBase"><strong>NL</strong></button>
      <button v-if="state.storyIncident" type="button" class="story-pin" :class="{ dispatching: state.storyIncident.stage === 'dispatch' }" :style="{ left: `${state.storyIncident.x}%`, top: `${state.storyIncident.y}%` }" :aria-label="tr('Дезертир ждёт решения')" @click.stop="dispatchStory"><span>!</span></button>
      <div v-if="['search_area','false_lead'].includes(state.hedgehogHqKnowledge)" class="hedgehog-knowledge" :class="state.hedgehogHqKnowledge" style="left: 83%; top: 17%"><span>?</span><b>{{ tr(`hedgehog.knowledge.${state.hedgehogHqKnowledge}`) }}</b></div>
      <div v-if="state.storyObserver && state.storyObserver.status !== 'hidden' && state.storyObserver.status !== 'gone'" class="observer-pin" :class="state.storyObserver.status" :style="{ left: `${state.storyObserver.x}%`, top: `${state.storyObserver.y}%` }" :title="tr('story.observer.title')"><span>◉</span></div>
      <div v-if="state.storyAftermath?.status === 'completed'" class="aftermath-pin" :class="state.storyAftermath.kind" :style="{ left: `${state.storyAftermath.x}%`, top: `${state.storyAftermath.y}%` }" :title="tr(`story.aftermath.${state.storyAftermath.kind}.title`)"><span>◆</span></div>
      <button v-if="state.urgentOperation && !['pending', 'completed', 'failed'].includes(state.urgentOperation.status)" type="button" class="urgent-pin" :class="state.urgentOperation.status" :style="{ left: `${state.urgentOperation.x}%`, top: `${state.urgentOperation.y}%` }" :aria-label="tr('urgent.water_filters.title')" @click.stop="dispatchUrgent"><span>F</span></button>
      <button v-for="mission in state.missions.filter(mission => mission.status === 'available')" :key="mission.id" type="button" class="cleanup-pin" :class="{ selected: selectedTarget?.type === 'mission' && selectedTarget.missionId === mission.id, 'enhanced-alert': mission.deadline !== undefined && mission.priority > 1 && state.research.nodes.emergency_dispatch.completed }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" :aria-label="tr('dispatch.select_mission', { mission: mission.title })" @click.stop="selectMission(mission)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span></button>
      <button v-for="mission in state.missions.filter(mission => isActiveAssignedMission(state, mission))" :key="`assigned-${mission.id}`" type="button" class="cleanup-pin assigned" :class="{ danger: state.incident?.missionId === mission.id, selected: selectedTarget?.type === 'mission' && selectedTarget.missionId === mission.id }" :style="{ left: `${mission.x}%`, top: `${mission.y}%` }" :aria-label="tr('dispatch.select_mission', { mission: mission.title })" @click.stop="selectMission(mission)"><span><svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-cleanup`" /></svg></span></button>
      <div v-if="selectionBox?.dragging" class="selection-box" :style="selectionBoxStyle()"></div>
      </div>
      <div class="map-zoom" @click.stop @pointerdown.stop><span>{{ Math.round(mapZoom * 100) }}%</span><button type="button" :disabled="mapZoom === 1" :aria-label="tr('map.zoom.reset')" @click="resetMapZoom">1:1</button></div>
      <div v-if="selectedCount || selectedTarget || commandMessage" class="command-hint"><span>{{ tr(selectedCount ? 'dispatch.command.choose_target_count' : 'dispatch.command.choose_squad', { count: selectedCount }) }}</span><button type="button" :aria-label="tr('dispatch.command.cancel')" @click.stop="clearCommand">×</button><small v-if="commandMessage">{{ tr(commandMessage) }}</small></div>
    </div>
    <MapSidePanel :state="state" :locale="locale" :selected-squad-ids="selectedSquadIds" :squad-is-available="squadIsAvailable" :squad-command-reason="squadCommandReason" :squad-energy="squadEnergy" :squad-label="squadLabel" @select="selectSquad" />
  </section>
</template>
