import { getSquadMapPosition, type Squad, type State } from '@nine-lives/game-core'

export type MapSquadProjection = {
  squad: Squad
  position: { x: number; y: number }
  color: string
  selected: boolean
}

export function projectSquads(state: State, selectedSquadIds: string[], palette: string[]): MapSquadProjection[] {
  return state.squads.map((squad, index) => {
    const point = getSquadMapPosition(squad)
    return {
      squad,
      position: { x: Math.max(5, Math.min(95, point.x)), y: Math.max(7, Math.min(93, point.y)) },
      color: palette[index] ?? `hsl(${(index * 137.5) % 360} 54% 66%)`,
      selected: selectedSquadIds.includes(squad.id),
    }
  })
}
