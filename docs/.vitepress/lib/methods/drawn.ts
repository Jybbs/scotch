import type { Game }             from '../front/example.ts'
import { figureOf }              from '../markdown/figures.ts'
import { movesOf }               from '../viewer/games.ts'
import page                      from '../../../pages/methods/runs.md?raw'
import type { Example }          from './example.ts'
import { Pair }                  from './runs.ts'
import { type Standing, framed } from './standing.ts'

/**
 * Two games as a widget shows them: each game's move and pieces at each ply,
 * the name it gives each game, and the pair of games its track draws.
 */
export interface Shown {
  moves  : Record<Game, string[]>
  names  : Record<Game, string>
  pair   : Pair
  pieces : Record<Game, Standing[][]>
}

/**
 * The example as The Longest Run's widget shows it, with the last ply both
 * games play and the stored game's players.
 */
export interface Drawn extends Shown {
  last    : number
  players : string
}

/**
 * Reads the example as the widget draws it, the stored game named by the
 * players and year the page quotes.
 */
export function drawnOf(example: Example): Drawn {
  const stored = `${figureOf(page, 'methods-white')} – ${figureOf(page, 'methods-black')}`
  const moves  = (game: Game): string[] =>
    movesOf({ headers: {}, moves: example[game].slice(1).map(position => position.san!) })
  return {
    last    : Math.min(example.submitted.length, example.stored.length) - 1,
    moves   : { stored: moves('stored'), submitted: moves('submitted') },
    names   : { stored: `${stored}, ${figureOf(page, 'methods-year')}`, submitted: 'The line' },
    pair    : new Pair([example.submitted.length - 1, example.stored.length - 1], example.runs),
    pieces  : { stored: framed(example.stored), submitted: framed(example.submitted) },
    players : stored
  }
}
