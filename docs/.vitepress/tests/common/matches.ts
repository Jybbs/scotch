import { EXAMPLES, type Match, type Side } from '../../lib/viewer/examples.ts'
import { Loaded, type Party }              from '../../lib/viewer/loaded.ts'

/**
 * The example match as the Viewer loads it.
 */
export const loaded = new Loaded(EXAMPLES.match)
/**
 * The first and the last position the example match's two games share, in the
 * submitted game's plies.
 */
export const { last, meet } = loaded.shared!

/**
 * Drops a game's first `count` moves, so its plies start that many later.
 */
function cut(side: Side, count: number): Side {
  return { ...side, moves: side.moves.slice(count), placements: side.placements.slice(count) }
}

/**
 * Ends one game of the example match, its submitted game unless `party` names
 * the stored one, at ply `ply`.
 */
export function endedAt(ply: number, party: Party = 'submitted'): Match {
  const side  = EXAMPLES.match[party]!
  const ended = { ...side, moves: side.moves.slice(0, ply), placements: side.placements.slice(0, ply + 1) }
  return { ...EXAMPLES.match, [party]: ended }
}

/**
 * Builds a match whose two games share the starting position and 1. e4, then
 * part on positions that differ on one square, the stored game's lacking the
 * pawn on h7.
 */
export function oneApart(): Match {
  const { stored, submitted } = EXAMPLES.match
  const opening               = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR'
  ]
  const played = (side: Side, placement: string): Side => ({
    ...side,
    moves      : ['e4', 'e5'],
    placements : [...opening, placement]
  })
  return {
    ...EXAMPLES.match,
    span      : { length: 2, offset: 0, start: 0 },
    stored    : played(stored!, 'rnbqkbnr/pppp1pp1/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR'),
    submitted : played(submitted, 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR')
  }
}

/**
 * Moves the example match's run to another offset: a positive `by` drops that
 * many of the stored game's first moves, so its plies trail the submitted
 * game's by `by`, and a negative one drops that many of the submitted game's,
 * so the stored game's plies lead.
 */
export function shifted(by: number): Match {
  const { span, stored, submitted } = EXAMPLES.match
  const offset                      = span!.offset - by
  return by >= 0
    ? { ...EXAMPLES.match, span: { ...span!, offset }, stored: cut(stored!, by) }
    : {
      ...EXAMPLES.match,
      span      : { ...span!, offset, start: span!.start + by },
      submitted : cut(submitted, -by)
    }
}
