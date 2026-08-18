import type { Speed } from '@nine-lives/game-core'

export function stateSpeedBeforePause(speed: Speed): Exclude<Speed, 0> {
  return speed === 0 ? 1 : speed
}
