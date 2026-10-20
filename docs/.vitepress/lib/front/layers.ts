import { clamp } from '@vueuse/core'

import { smooth }     from '../motion/timing.ts'
import { edgeAt }     from './curves.ts'
import type { State } from './cycle.ts'
import type { Game }  from './example.ts'
import type { Plan }  from './layout.ts'

export type Layer = (typeof LAYERS)[number]

/**
 * How one oval piece is drawn at a moment of its journey: each coloring and the
 * opacity it takes, the size the piece takes, and the seconds since its shared
 * pair landed, or -1 where no ring runs.
 */
export interface Look {
  layers : [Layer, number][]
  since  : number
  size   : number
}

/**
 * The opacity of each coloring at its fullest: a piece in flight in its game's
 * edging, a loose piece near the foot as a share of its own, the plain ink an
 * oval piece brightens toward as it fades out on its way to its place, a loose
 * piece, a shared pair in the run's color, and a piece in its place in its
 * game's white and black, the run's color held below the solid wordmark so the
 * wordmark stays the first thing on the page.
 */
export const ALPHA = { edge: 0.9, foot: 0.12, ink: 0.5, loose: 0.26, run: 0.8, set: 0.92 } as const
/**
 * Every coloring the backdrop paints a piece in.
 */
export const LAYERS = ['edged-bot', 'edged-top', 'ink', 'plain-bot', 'plain-top', 'run'] as const

/**
 * Reads how an oval piece is drawn at its pair's state: in plain ink fading out
 * as it nears its place, in its game's white and black fading in as it settles
 * there, in its game's edging while it travels, and, for a pair whose position
 * the two games share, in the run's color as it lands. A piece grows from the
 * loose size to its place's size as it arrives.
 *
 * Args:
 *   game   : The arc the piece plays on.
 *   hush   : How far the loose pieces in the hero have dimmed while the oval
 *     forms, as the share of their strength they keep.
 *   plan   : The oval's plan.
 *   shared : Whether the pair's position is one the two games share.
 *   state  : The pair's state.
 */
export function lookOf(
  game   : Game,
  hush   : number,
  plan   : Pick<Plan, 'loose' | 'size'>,
  shared : boolean,
  state  : State
): Look {
  const placed = clamp(state.p, 0, 1)
  const col    = shared ? state.col * smooth(placed * 1.6) : 0
  const edge   = edgeAt(state.u)
  const keep   = (1 - edge) * (1 - col)
  const low    = ALPHA.loose * hush

  const layers: [Layer, number][] = [
    ['ink', (low + (ALPHA.ink - low) * placed) * keep * (1 - placed)],
    [`plain-${game}`, (low + (ALPHA.set - low) * placed) * keep * placed],
    [`edged-${game}`, ALPHA.edge * edge * (1 - col)],
    ['run', ALPHA.run * col]
  ]

  return { layers, since: shared ? state.since : -1, size: plan.loose + (plan.size - plan.loose) * placed }
}
