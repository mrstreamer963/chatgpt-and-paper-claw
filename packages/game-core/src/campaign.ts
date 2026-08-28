export type MapPoint = { x: number; y: number }

export type CampaignPhase = 'peace_first_shift' | 'peace_sandbox' | 'cataclysm' | 'post_cataclysm'
export type DistrictId =
  | 'service_core'
  | 'north_bastion'
  | 'residential_ring'
  | 'commercial_arc'
  | 'orbital_harbor'
  | 'material_contour'
  | 'biomedical_belt'
  | 'network_quarter'

export type DistrictAccess = 'silhouette' | 'contact' | 'operational' | 'isolated'
export type DistrictState = {
  access: DistrictAccess
  risk: number
  accessReason: string
  openedAt?: number
  authorizedTargetIds: string[]
}
export type DistrictStates = Record<DistrictId, DistrictState>

export type DistrictDefinition = {
  id: DistrictId
  name: string
  arterial: string
  center: MapPoint
  polygon: MapPoint[]
}

export const DISTRICT_DEFINITIONS: readonly DistrictDefinition[] = [
  {
    id: 'service_core',
    name: 'district.service_core.name',
    arterial: 'district.service_core.arterial',
    center: { x: 46, y: 51 },
    polygon: [{ x: 34, y: 37 }, { x: 55, y: 35 }, { x: 63, y: 48 }, { x: 57, y: 64 }, { x: 38, y: 66 }, { x: 29, y: 52 }],
  },
  {
    id: 'north_bastion',
    name: 'district.north_bastion.name',
    arterial: 'district.north_bastion.arterial',
    center: { x: 48, y: 14 },
    polygon: [{ x: 31, y: 6 }, { x: 65, y: 6 }, { x: 61, y: 29 }, { x: 51, y: 35 }, { x: 35, y: 30 }],
  },
  {
    id: 'residential_ring',
    name: 'district.residential_ring.name',
    arterial: 'district.residential_ring.arterial',
    center: { x: 75, y: 25 },
    polygon: [{ x: 65, y: 7 }, { x: 92, y: 12 }, { x: 94, y: 36 }, { x: 64, y: 42 }, { x: 56, y: 33 }],
  },
  {
    id: 'commercial_arc',
    name: 'district.commercial_arc.name',
    arterial: 'district.commercial_arc.arterial',
    center: { x: 86, y: 49 },
    polygon: [{ x: 64, y: 40 }, { x: 95, y: 35 }, { x: 95, y: 63 }, { x: 65, y: 64 }, { x: 59, y: 52 }],
  },
  {
    id: 'orbital_harbor',
    name: 'district.orbital_harbor.name',
    arterial: 'district.orbital_harbor.arterial',
    center: { x: 75, y: 78 },
    polygon: [{ x: 63, y: 62 }, { x: 95, y: 62 }, { x: 91, y: 94 }, { x: 58, y: 91 }, { x: 55, y: 70 }],
  },
  {
    id: 'material_contour',
    name: 'district.material_contour.name',
    arterial: 'district.material_contour.arterial',
    center: { x: 47, y: 85 },
    polygon: [{ x: 36, y: 65 }, { x: 58, y: 63 }, { x: 64, y: 94 }, { x: 32, y: 94 }, { x: 29, y: 75 }],
  },
  {
    id: 'biomedical_belt',
    name: 'district.biomedical_belt.name',
    arterial: 'district.biomedical_belt.arterial',
    center: { x: 18, y: 76 },
    polygon: [{ x: 5, y: 59 }, { x: 31, y: 61 }, { x: 39, y: 70 }, { x: 33, y: 94 }, { x: 7, y: 90 }],
  },
  {
    id: 'network_quarter',
    name: 'district.network_quarter.name',
    arterial: 'district.network_quarter.arterial',
    center: { x: 14, y: 43 },
    polygon: [{ x: 6, y: 14 }, { x: 32, y: 8 }, { x: 37, y: 34 }, { x: 30, y: 64 }, { x: 5, y: 61 }],
  },
] as const

export function createInitialDistrictStates(): DistrictStates {
  return {
    service_core: { access: 'operational', risk: 10, accessReason: 'district.access.home', openedAt: 0, authorizedTargetIds: [] },
    north_bastion: { access: 'contact', risk: 10, accessReason: 'district.access.monolith_corridor', authorizedTargetIds: ['monolith-service-1'] },
    residential_ring: { access: 'silhouette', risk: 20, accessReason: 'district.access.no_mandate', authorizedTargetIds: [] },
    commercial_arc: { access: 'silhouette', risk: 15, accessReason: 'district.access.no_contact', authorizedTargetIds: [] },
    orbital_harbor: { access: 'silhouette', risk: 10, accessReason: 'district.access.no_mandate', authorizedTargetIds: [] },
    material_contour: { access: 'silhouette', risk: 10, accessReason: 'district.access.no_mandate', authorizedTargetIds: [] },
    biomedical_belt: { access: 'silhouette', risk: 10, accessReason: 'district.access.no_mandate', authorizedTargetIds: [] },
    network_quarter: { access: 'silhouette', risk: 15, accessReason: 'district.access.no_link', authorizedTargetIds: [] },
  }
}

export function getDistrictDefinition(id: DistrictId) {
  return DISTRICT_DEFINITIONS.find(district => district.id === id)!
}

function pointInPolygon(point: MapPoint, polygon: readonly MapPoint[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || Number.EPSILON) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

export function getDistrictAtPoint(point: MapPoint): DistrictId {
  const containing = DISTRICT_DEFINITIONS.find(district => pointInPolygon(point, district.polygon))
  if (containing) return containing.id
  return [...DISTRICT_DEFINITIONS]
    .sort((left, right) => Math.hypot(left.center.x - point.x, left.center.y - point.y)
      - Math.hypot(right.center.x - point.x, right.center.y - point.y))[0].id
}

export type RouteNode = { id: string; point: MapPoint; districtId: DistrictId }
export type RouteEdgeKind = 'local' | 'inner_ring' | 'outer_ring' | 'radial' | 'shortcut'
export type RouteEdge = { from: string; to: string; kind: RouteEdgeKind }
export type PlannedRoute = { points: MapPoint[]; distance: number }

export const ROUTE_NODES: readonly RouteNode[] = [
  { id: 'base', point: { x: 46, y: 51 }, districtId: 'service_core' },
  { id: 'core-north', point: { x: 46, y: 39 }, districtId: 'service_core' },
  { id: 'core-east', point: { x: 58, y: 49 }, districtId: 'service_core' },
  { id: 'core-south', point: { x: 48, y: 62 }, districtId: 'service_core' },
  { id: 'core-west', point: { x: 34, y: 51 }, districtId: 'service_core' },
  { id: 'north-gate', point: { x: 47, y: 31 }, districtId: 'north_bastion' },
  { id: 'east-gate', point: { x: 64, y: 48 }, districtId: 'commercial_arc' },
  { id: 'south-gate', point: { x: 49, y: 68 }, districtId: 'material_contour' },
  { id: 'west-gate', point: { x: 29, y: 50 }, districtId: 'network_quarter' },
  { id: 'ring-northwest', point: { x: 28, y: 20 }, districtId: 'network_quarter' },
  { id: 'ring-north', point: { x: 48, y: 20 }, districtId: 'north_bastion' },
  { id: 'ring-northeast', point: { x: 69, y: 19 }, districtId: 'residential_ring' },
  { id: 'ring-east', point: { x: 80, y: 43 }, districtId: 'commercial_arc' },
  { id: 'ring-southeast', point: { x: 75, y: 69 }, districtId: 'orbital_harbor' },
  { id: 'ring-south', point: { x: 48, y: 78 }, districtId: 'material_contour' },
  { id: 'ring-southwest', point: { x: 23, y: 70 }, districtId: 'biomedical_belt' },
  { id: 'ring-west', point: { x: 17, y: 45 }, districtId: 'network_quarter' },
  { id: 'monolith', point: { x: 48, y: 14 }, districtId: 'north_bastion' },
  { id: 'residential', point: { x: 75, y: 25 }, districtId: 'residential_ring' },
  { id: 'commercial', point: { x: 86, y: 49 }, districtId: 'commercial_arc' },
  { id: 'orbital', point: { x: 75, y: 78 }, districtId: 'orbital_harbor' },
  { id: 'material', point: { x: 47, y: 85 }, districtId: 'material_contour' },
  { id: 'biomedical', point: { x: 18, y: 76 }, districtId: 'biomedical_belt' },
  { id: 'network', point: { x: 14, y: 43 }, districtId: 'network_quarter' },
  { id: 'metro-depot', point: { x: 83, y: 17 }, districtId: 'residential_ring' },
] as const

export const ROUTE_EDGES: readonly RouteEdge[] = [
  { from: 'core-north', to: 'core-east', kind: 'inner_ring' },
  { from: 'core-east', to: 'core-south', kind: 'inner_ring' },
  { from: 'core-south', to: 'core-west', kind: 'inner_ring' },
  { from: 'core-west', to: 'core-north', kind: 'inner_ring' },
  { from: 'base', to: 'core-north', kind: 'local' },
  { from: 'base', to: 'core-east', kind: 'local' },
  { from: 'base', to: 'core-south', kind: 'local' },
  { from: 'base', to: 'core-west', kind: 'local' },

  { from: 'ring-northwest', to: 'ring-north', kind: 'outer_ring' },
  { from: 'ring-north', to: 'ring-northeast', kind: 'outer_ring' },
  { from: 'ring-northeast', to: 'ring-east', kind: 'outer_ring' },
  { from: 'ring-east', to: 'ring-southeast', kind: 'outer_ring' },
  { from: 'ring-southeast', to: 'ring-south', kind: 'outer_ring' },
  { from: 'ring-south', to: 'ring-southwest', kind: 'outer_ring' },
  { from: 'ring-southwest', to: 'ring-west', kind: 'outer_ring' },
  { from: 'ring-west', to: 'ring-northwest', kind: 'outer_ring' },

  { from: 'core-north', to: 'north-gate', kind: 'radial' },
  { from: 'north-gate', to: 'ring-north', kind: 'radial' },
  { from: 'core-east', to: 'east-gate', kind: 'radial' },
  { from: 'east-gate', to: 'ring-east', kind: 'radial' },
  { from: 'core-south', to: 'south-gate', kind: 'radial' },
  { from: 'south-gate', to: 'ring-south', kind: 'radial' },
  { from: 'core-west', to: 'west-gate', kind: 'radial' },
  { from: 'west-gate', to: 'ring-west', kind: 'radial' },

  { from: 'monolith', to: 'ring-north', kind: 'local' },
  { from: 'monolith', to: 'north-gate', kind: 'local' },
  { from: 'residential', to: 'ring-northeast', kind: 'local' },
  { from: 'residential', to: 'ring-east', kind: 'local' },
  { from: 'commercial', to: 'ring-east', kind: 'local' },
  { from: 'commercial', to: 'ring-southeast', kind: 'local' },
  { from: 'orbital', to: 'ring-southeast', kind: 'local' },
  { from: 'orbital', to: 'ring-south', kind: 'local' },
  { from: 'material', to: 'ring-south', kind: 'local' },
  { from: 'material', to: 'ring-southwest', kind: 'local' },
  { from: 'biomedical', to: 'ring-southwest', kind: 'local' },
  { from: 'biomedical', to: 'ring-west', kind: 'local' },
  { from: 'network', to: 'ring-west', kind: 'local' },
  { from: 'network', to: 'ring-northwest', kind: 'local' },

  { from: 'north-gate', to: 'ring-northeast', kind: 'shortcut' },
  { from: 'east-gate', to: 'ring-northeast', kind: 'shortcut' },
  { from: 'east-gate', to: 'ring-southeast', kind: 'shortcut' },
  { from: 'south-gate', to: 'ring-southwest', kind: 'shortcut' },
  { from: 'west-gate', to: 'ring-northwest', kind: 'shortcut' },
  { from: 'residential', to: 'metro-depot', kind: 'shortcut' },
] as const

function routeNodeAvailable(node: RouteNode, districts: DistrictStates, destinationDistrict: DistrictId, allowedHiddenNodeIds: ReadonlySet<string>) {
  if (node.id === 'metro-depot' && !allowedHiddenNodeIds.has(node.id)) return false
  const access = districts[node.districtId].access
  return access === 'operational' || (node.districtId === destinationDistrict && access === 'contact')
}

function nearestNode(point: MapPoint, candidates: readonly RouteNode[]) {
  return [...candidates].sort((left, right) => Math.hypot(left.point.x - point.x, left.point.y - point.y)
    - Math.hypot(right.point.x - point.x, right.point.y - point.y))[0]
}

function segmentDistance(left: MapPoint, right: MapPoint) {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

export function planOperationalRoute(
  districts: DistrictStates,
  origin: MapPoint,
  destination: MapPoint,
  allowedHiddenNodeIds: readonly string[] = [],
): PlannedRoute | undefined {
  const originDistrict = getDistrictAtPoint(origin)
  const destinationDistrict = getDistrictAtPoint(destination)
  if (districts[destinationDistrict].access === 'isolated' || districts[destinationDistrict].access === 'silhouette') return undefined
  if (originDistrict === destinationDistrict && districts[destinationDistrict].access === 'operational') {
    return {
      points: [{ x: origin.x, y: origin.y }, { x: destination.x, y: destination.y }],
      distance: segmentDistance(origin, destination),
    }
  }
  const allowedHiddenNodes = new Set(allowedHiddenNodeIds)
  const availableNodes = ROUTE_NODES.filter(node => routeNodeAvailable(node, districts, destinationDistrict, allowedHiddenNodes))
  const originNode = nearestNode(origin, availableNodes)
  const destinationNode = nearestNode(destination, availableNodes)
  if (!originNode || !destinationNode) return undefined

  const availableIds = new Set(availableNodes.map(node => node.id))
  const distances = new Map<string, number>([[originNode.id, 0]])
  const previous = new Map<string, string>()
  const pending = new Set(availableIds)
  while (pending.size) {
    const current = [...pending].sort((left, right) => (distances.get(left) ?? Infinity) - (distances.get(right) ?? Infinity))[0]
    pending.delete(current)
    const currentDistance = distances.get(current)
    if (currentDistance === undefined || current === destinationNode.id) break
    for (const edge of ROUTE_EDGES) {
      const neighbour = edge.from === current ? edge.to : edge.to === current ? edge.from : undefined
      if (!neighbour || !pending.has(neighbour) || !availableIds.has(neighbour)) continue
      const currentNode = ROUTE_NODES.find(node => node.id === current)!
      const nextNode = ROUTE_NODES.find(node => node.id === neighbour)!
      const candidate = currentDistance + segmentDistance(currentNode.point, nextNode.point)
      if (candidate < (distances.get(neighbour) ?? Infinity)) {
        distances.set(neighbour, candidate)
        previous.set(neighbour, current)
      }
    }
  }
  if (!distances.has(destinationNode.id)) return undefined
  const nodeIds = [destinationNode.id]
  while (nodeIds[0] !== originNode.id) {
    const parent = previous.get(nodeIds[0])
    if (!parent) return undefined
    nodeIds.unshift(parent)
  }
  const graphPoints = nodeIds.map(id => ROUTE_NODES.find(node => node.id === id)!.point)
  const points = [origin, ...graphPoints, destination].filter((point, index, all) => index === 0
    || segmentDistance(point, all[index - 1]) > 0.01)
  const distance = points.slice(1).reduce((sum, point, index) => sum + segmentDistance(points[index], point), 0)
  return { points, distance }
}

export function positionAlongRoute(route: readonly MapPoint[], progress: number): MapPoint {
  if (!route.length) return { x: 46, y: 51 }
  if (route.length === 1) return { ...route[0] }
  const lengths = route.slice(1).map((point, index) => segmentDistance(route[index], point))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = Math.max(0, Math.min(total, total * progress))
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const ratio = lengths[index] > 0 ? remaining / lengths[index] : 1
      return {
        x: route[index].x + (route[index + 1].x - route[index].x) * ratio,
        y: route[index].y + (route[index + 1].y - route[index].y) * ratio,
      }
    }
    remaining -= lengths[index]
  }
  return { ...route[route.length - 1] }
}

export type ContainerDecision = 'police_handoff' | 'independent_sample' | 'call_monolith' | 'ignore'
export type FirstShiftStage = 'monolith' | 'container' | 'responsibilities' | 'summary' | 'complete'
export type FirstShiftState = {
  stage: FirstShiftStage
  stageStartedAt: number
  monolithDeadline: number
  containerDeadline?: number
  containerDecision?: ContainerDecision
  containerSquadId?: string
  filterSample: boolean
  filterWarningAt?: number
  residentialOpenedAt?: number
  residentialDutyDeadline?: number
  residentialDutyOutcome?: 'completed' | 'failed'
  southNodeOutcome?: 'full' | 'partial' | 'lost'
}

export function createInitialFirstShift(): FirstShiftState {
  return {
    stage: 'monolith',
    stageStartedAt: 0,
    monolithDeadline: 120,
    filterSample: false,
  }
}

export type FactionMemoryKind =
  | 'cell_spared'
  | 'cell_negotiated'
  | 'cell_suppressed'
  | 'heavy_force_used'
  | 'needle_sheltered'
  | 'needle_interrogated'
  | 'needle_escorted'
  | 'needle_exploited'
  | 'hq_compromised'
  | 'truce_kept'
  | 'truce_broken'

export type FactionMemoryEvent = {
  kind: FactionMemoryKind
  time: number
  districtId?: DistrictId
  subjectId?: string
}

export type LocationKnowledge = 'hidden' | 'search_area' | 'false_lead' | 'confirmed'

export type ExternalUnitId = 'guard_7' | 'patrol_12'
export type ExternalUnitState = {
  id: ExternalUnitId
  ownerId: 'green_monolith' | 'police'
  name: string
  home: MapPoint
  x: number
  y: number
  status: 'available' | 'en_route' | 'on_scene' | 'returning'
  route: MapPoint[]
  travel: number
  travelDuration: number
  target?: MapPoint
  purpose?: 'container' | 'support'
  onSceneUntil?: number
}

export function createInitialExternalUnits(): Record<ExternalUnitId, ExternalUnitState> {
  return {
    guard_7: {
      id: 'guard_7', ownerId: 'green_monolith', name: 'monolith.unit',
      home: { x: 48, y: 14 }, x: 48, y: 14, status: 'available', route: [], travel: 0, travelDuration: 0,
    },
    patrol_12: {
      id: 'patrol_12', ownerId: 'police', name: 'police.unit',
      home: { x: 75, y: 25 }, x: 75, y: 25, status: 'available', route: [], travel: 0, travelDuration: 0,
    },
  }
}

export function relationBand(ownerId: string, relation: number) {
  if (ownerId !== 'needle_front') return relation >= 75 ? 'friendly' : relation >= 50 ? 'neutral' : relation >= 25 ? 'strained' : 'hostile'
  if (relation >= 50) return 'neutral'
  if (relation >= 35) return 'armed_truce'
  if (relation >= 20) return 'hostile'
  return 'war'
}

export function relationMaximum(ownerId: string) {
  return ownerId === 'needle_front' ? 50 : 100
}
