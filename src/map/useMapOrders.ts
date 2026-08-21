import { GAME_RULES, getDeployCatsBlockReason, type Cat, type DeployOrder, type Mission, type State } from '@nine-lives/game-core'

export function partitionSelectedBaseCats(state: State, selectedCatIds: string[]) {
  const ready: string[] = [], blocked: string[] = [], reasons: string[] = []
  const catIsAtBase = (cat: Cat) => !cat.assignedTo || state.squads.find(squad => squad.id === cat.assignedTo)?.phase === 'base'
  for (const catId of selectedCatIds) {
    const cat = state.cats.find(candidate => candidate.id === catId)
    if (!cat || !catIsAtBase(cat)) { blocked.push(catId); reasons.push('dispatch.reason.away') }
    else if (cat.injuredRemaining > 0) { blocked.push(catId); reasons.push('dispatch.reason.injured') }
    else if (cat.sleeping ? cat.energy < GAME_RULES.wakeForOrderEnergy : cat.energy <= GAME_RULES.sleepAtEnergy) { blocked.push(catId); reasons.push('dispatch.reason.tired') }
    else ready.push(catId)
  }
  return { ready, blocked, reasons }
}

export function validateDeployOrder(state: State, catIds: string[], order: DeployOrder) {
  return getDeployCatsBlockReason(state, catIds, order)
}

export function orderFailureSummary(reasons: string[]) {
  return reasons.length > 1 ? 'dispatch.reason.partial' : reasons[0]
}

export function missionTarget(state: State, missionId: string) {
  return state.missions.find(mission => mission.id === missionId) as Mission | undefined
}
