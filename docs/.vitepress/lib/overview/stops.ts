import { type Game, hexOf }     from '../front/example.ts'
import type { Shown }           from '../methods/drawn.ts'
import { Pair, type Run }       from '../methods/runs.ts'
import { tracked }              from '../methods/standing.ts'
import rendered                 from '../rendered/keys.json' with { type: 'json' }
import store                    from '../rendered/store.json' with { type: 'json' }
import { EXAMPLES, type Match } from '../viewer/examples.ts'
import { movesOf, surname }     from '../viewer/games.ts'

/**
 * The demo game's way to its match as the overview draws it: the stops, the
 * pair of games the track draws up to a few plies past the parting, each
 * game's move and pieces at each ply, the name set under each game's board,
 * and the stored game's players and event.
 */
export interface Route extends Shown {
  players : string
  stops   : readonly Stop[]
}

/**
 * One stop of the demo game's way to its match: the page it opens, the game
 * and the ply its board stands at, the ply the track's marker stands at, and
 * the sentence it says.
 */
interface Stop {
  board : { game: Game, ply: number }
  page  : string
  ply   : number
  says  : string
}

/**
 * The plies a track draws past the parting, so the two lines show apart.
 */
const PAST = 6

/**
 * Writes the five stops of the demo game's way to its match from what the route
 * reads of the match: its moves, the key where the two games meet, the run they
 * share, the ply they part at, and the stored game's players.
 */
function stopsOf(
  match  : { key: string, moves: Shown['moves'], part: number, players: string, span: Run },
  counts : { games: string, positions: string }
): Stop[] {
  const { key, moves, part, players, span } = match
  const plies = moves.submitted.length - 1
  return [{
    board : { game: 'submitted', ply: plies },
    page  : 'reading',
    ply   : 0,
    says  : `The demo game plays ${plies} plies of its mainline, so it reaches ${plies + 1} positions, `
          + 'from the start to the one after its last move.'
  }, {
    board : { game: 'submitted', ply: 0 },
    page  : 'indexing',
    ply   : 0,
    says  : `Each of those positions is looked up in an index of ${counts.games} games `
          + `and the ${counts.positions} positions they reach.`
  }, {
    board : { game: 'submitted', ply: span.start },
    page  : 'keys',
    ply   : span.start,
    says  : `Each position goes in as its key. After ${moves.submitted[span.start]} the key is ${key}, `
          + `which ${players} reach too, by another order.`
  }, {
    board : { game: 'submitted', ply: part - 1 },
    page  : 'runs',
    ply   : span.start + Math.floor(span.length / 2),
    says  : `From ply ${span.start} the two games share ${span.length} positions in a row, the longest run `
          + `any stored game holds with the demo game, so ${players} is the match.`
  }, {
    board : { game: 'stored', ply: part },
    page  : 'limits',
    ply   : part,
    says  : `They part at ply ${part}, where the stored game plays ${moves.stored[part]} in place of `
          + `${moves.submitted[part]}. The match shows that move and scores neither.`
  }]
}

/**
 * Reads where a stop's station sits along the track, as a share of its width,
 * the second stop set a few plies past the first so the two never sit on one
 * point.
 */
export function placeOf(route: Route, index: number): number {
  return (route.stops[index]!.ply + (index === 1 ? 3 : 0)) / route.pair.plies[0]
}

/**
 * Reads the title and the question of each page the overview's table lists,
 * keyed by the page's file name without `.md`.
 */
export function questionsOf(overview: string): Map<string, { question: string, title: string }> {
  return new Map([...overview.matchAll(/^\| \[([^\]]+)\]\(([a-z]+)\.md\) \| \*(.+)\* \|$/gmu)]
    .map(([, title, page, question]) => [page!, { question: question!, title: title! }]))
}

/**
 * Builds the demo game's way to its match: the stops from the positions it
 * reaches, through the index it looks them up in, the key of the position where
 * the two games meet, and the run they share, to the move where they part.
 *
 * Args:
 *   match  : The match the Viewer opens on.
 *   keys   : The key of each position the demo game reaches.
 *   counts : The games and the positions the index holds, as the page writes
 *     them.
 */
export function routeOf(
  match  : Match,
  keys   : readonly string[],
  counts : { games: string, positions: string }
): Route {
  const stored  = match.stored!
  const span    = match.span!
  const part    = span.start + span.length
  const shown   = Math.min(part + PAST, match.submitted.moves.length)
  const both    = Math.min(shown, stored.moves.length)
  const moves   = { stored: movesOf(stored), submitted: movesOf(match.submitted) }
  const pairing = `${surname(stored.headers.White ?? '')} – ${surname(stored.headers.Black ?? '')}`
  const players = `${pairing}, ${stored.headers.Event} ${stored.headers.Date?.slice(0, 4)}`
  const key     = hexOf(keys[span.start]!).toUpperCase().match(/.{4}/gu)!.join(' ')
  return {
    moves   : moves,
    names   : { stored: pairing, submitted: 'Demo game' },
    pair    : new Pair([shown, both], [{ length: 1, offset: 0, start: 0 }, span]),
    pieces  : { stored: tracked(stored.placements), submitted: tracked(match.submitted.placements) },
    players : players,
    stops   : stopsOf({ key, moves, part, players, span }, counts)
  }
}

/**
 * The way from the demo game to the match the Viewer opens on, through an
 * index holding the games and positions `scotch render docs` counts.
 */
export const demoRoute = routeOf(EXAMPLES.match, rendered.viewer, {
  games     : store.games.toLocaleString('en-US'),
  positions : store.positions.toLocaleString('en-US')
})
