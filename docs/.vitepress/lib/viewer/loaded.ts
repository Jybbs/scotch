import { clamp } from '@vueuse/core'

import type { Match, Side }             from './examples.ts'
import * as games                       from './games.ts'
import { type Hop, moveTo, standingOf } from './placements.ts'

/**
 * One move the two games played in another order before they meet, as the
 * cursor that reaches it in either game.
 */
export interface Pair {
  stored    : number
  submitted : number
}

/**
 * Either game of a match, by the part it plays in it.
 */
export type Party = (typeof PARTIES)[number]

/**
 * The run of positions the two games share, in the submitted game's plies: the
 * first and the last of them, how many it holds, and the ply where the two
 * part, one past the last.
 */
export interface Shared {
  last   : number
  length : number
  meet   : number
  part   : number
}

/**
 * What the Viewer says of one cursor: how many squares the boards differ on
 * once the games part, or nothing where none differ, the line the slider reads
 * out, the short line under the controls the count follows, and the sentence
 * the live region reads.
 */
export interface Status {
  count : string
  line  : string
  say   : string
  short : string
}

/**
 * What the Viewer says where no stored game shares a position with the
 * submitted one.
 */
export const NOTHING = 'No stored game shares a position with this game'
/**
 * The two games of a match in the order the Viewer sets them, the submitted
 * game first.
 */
export const PARTIES = ['submitted', 'stored'] as const

/**
 * Reads each move a game plays before ply `plies`, as the piece standing where
 * it lands, the square it left, and the square it reached, beside the cursor
 * that reaches it.
 */
function movesBefore(
  plies   : number,
  side    : Side,
  reachOf : (ply: number) => number
): { key: string, reach: number }[] {
  return Array.from({ length: Math.max(0, plies) }, (_, at) => {
    const hop   = moveTo(side.placements, at + 1)
    const piece = hop && standingOf(side.placements[at + 1]!)[hop.to]
    return hop ? [{ key: `${piece} ${hop.from} ${hop.to}`, reach: reachOf(at + 1) }] : []
  }).flat()
}

/**
 * Pairs each move the submitted game plays before the two meet with the same
 * piece's move between the same two squares in the stored game, each move
 * paired once, leaving out a move both games play at the same ply.
 */
function pairsOf(match: Match, offset: number, shared?: Shared): Pair[] {
  if (!shared || !match.stored) return []
  const left = movesBefore(shared.meet + offset, match.stored, ply => ply - offset)
  return movesBefore(shared.meet, match.submitted, ply => ply).flatMap(({ key, reach }) => {
    const at   = left.findIndex(move => move.key === key)
    const twin = at < 0 ? undefined : left.splice(at, 1)[0]!.reach
    return twin === undefined || twin === reach ? [] : [{ stored: twin, submitted: reach }]
  })
}

/**
 * Reads a game's ply at a cursor through the run's offset, before it is held to
 * the game's own plies.
 */
function plyAt(cursor: number, offset: number, party: Party): number {
  return party === 'submitted' ? cursor : cursor + offset
}

/**
 * One loaded match, holding the cursor's range in the submitted game's plies
 * and the run the two games share, each game's ply derived from the cursor
 * through the run's offset, so a cursor inside the run shows one position on
 * both boards and a cursor past one game's end leaves the other moving.
 */
export class Loaded {
  readonly first   : number
  readonly last    : number
  readonly leaving : string | undefined
  readonly match   : Match
  readonly offset  : number
  readonly pairs   : readonly Pair[]
  readonly partAt  : number | undefined
  readonly parting : string | undefined
  readonly shared  : Shared | undefined

  /**
   * Reads the cursor's range and the run from a match, the range reaching from
   * the earlier of the two games' starts to the later of their ends.
   */
  constructor(match: Match) {
    const { span, stored, submitted } = match
    const length                      = submitted.moves.length
    this.match                        = match
    this.offset                       = span?.offset ?? 0
    this.first                        = stored && this.offset > 0 ? -this.offset : 0
    this.last                         = stored ? Math.max(length, stored.moves.length - this.offset) : length
    this.shared                       = span ? {
      last   : span.start + span.length - 1,
      length : span.length,
      meet   : span.start,
      part   : span.start + span.length
    } : undefined
    this.leaving = this.shared && this.shared.last < length
                 ? games.numbered(submitted, this.shared.last)
                 : undefined
    const parted = this.shared && plyAt(this.shared.last, this.offset, 'stored')
    this.parting = stored && parted !== undefined && parted < stored.moves.length
                 ? games.numbered(stored, parted)
                 : undefined
    this.partAt = this.shared && Math.min(this.shared.last, this.last)
    this.pairs  = pairsOf(match, this.offset, this.shared)
  }

  /**
   * Reads each game's move from the last position the two share, the move where
   * the two part, leaving out a game that ends there.
   */
  get partings(): Partial<Record<Party, Hop>> {
    if (!this.shared) return {}
    return Object.fromEntries(PARTIES.flatMap(party => {
      const side = this.sideOf(party)!
      const ply  = plyAt(this.shared!.last, this.offset, party)
      if (ply >= side.moves.length) return []
      return [[party, moveTo(side.placements, ply + 1)!]]
    }))
  }

  /**
   * Reads the cursor at which a game reaches its ply `ply`, the stored game's
   * through the run's offset.
   */
  cursorOf(party: Party, ply: number): number {
    return party === 'submitted' ? ply : ply - this.offset
  }

  /**
   * Lists the squares the two boards differ on at a cursor past the last
   * position the two share, where both games hold a position there.
   */
  differing(cursor: number): number[] {
    if (!this.shared || cursor <= this.shared.last) return []
    if (!this.has('stored', cursor) || !this.has('submitted', cursor)) return []
    const stored    = standingOf(this.match.stored!.placements[this.plyOf('stored', cursor)]!)
    const submitted = standingOf(this.match.submitted.placements[this.plyOf('submitted', cursor)]!)
    return submitted.keys().filter(square => submitted[square] !== stored[square]).toArray()
  }

  /**
   * Reads whether a game holds a position at a cursor, the stored game holding
   * none before it starts or past its end.
   */
  has(party: Party, cursor: number): boolean {
    const ply = plyAt(cursor, this.offset, party)
    const end = this.sideOf(party)?.moves.length
    return end !== undefined && ply >= 0 && ply <= end
  }

  /**
   * Reads a game's ply at a cursor, held to the game's own plies.
   */
  plyOf(party: Party, cursor: number): number {
    const side = this.sideOf(party)
    return side ? clamp(plyAt(cursor, this.offset, party), 0, side.moves.length) : 0
  }

  /**
   * Reads whether the two games show one position at a cursor.
   */
  sharing(cursor: number): boolean {
    return !!this.shared && cursor >= this.shared.meet && cursor <= this.shared.last
  }

  /**
   * Reads one game of the match, or `null` for the stored game where no stored
   * game shares a position with the submitted one.
   */
  sideOf(party: Party): Side | null {
    return this.match[party]
  }

  /**
   * Writes what the Viewer says at a cursor: the ply, and whether the two games
   * show one position there, have yet to meet, or have parted.
   */
  status(cursor: number): Status {
    const ply = this.plyOf('submitted', cursor)
    if (!this.shared) return this.#alone(ply)
    const { last, length, meet, part } = this.shared
    if (this.sharing(cursor)) {
      const at   = cursor - meet + 1
      const next = cursor === last && this.parting ? `, and the stored game played ${this.parting} next` : ''
      return {
        count : '',
        line  : `Ply ${ply} · same position · ${at} of ${length}`,
        say   : `Ply ${ply}, one position, ${at} of the ${length} the two share${next}.`,
        short : `Same position · ${at} of ${length}`
      }
    }
    const moves = `${this.#moveAt('submitted', cursor)} in the submitted game, `
                + `${this.#moveAt('stored', cursor)} in the stored game`
    if (cursor < meet) {
      return {
        count : '',
        line  : `Ply ${ply} · they meet at ply ${meet}`,
        say   : `Ply ${ply}, ${moves}. They meet at ply ${meet}.`,
        short : `Different · meet at ply ${meet}`
      }
    }
    return this.#parted(cursor, moves, part, ply)
  }

  #alone(ply: number): Status {
    const move = ply ? `, ${games.numbered(this.match.submitted, ply - 1)}` : ', the starting position'
    return {
      count : '',
      line  : `Ply ${ply} of ${this.match.submitted.moves.length}`,
      say   : `Ply ${ply}${move}. ${NOTHING}.`,
      short : 'Nothing matched'
    }
  }

  #moveAt(party: Party, cursor: number): string {
    const ply = this.plyOf(party, cursor)
    return ply ? games.numbered(this.sideOf(party)!, ply - 1) : 'the start'
  }

  /**
   * Writes what the Viewer says once the two games have parted, naming the
   * stored game's move where they parted and how many squares the boards differ
   * on.
   */
  #parted(cursor: number, moves: string, part: number, ply: number): Status {
    const count = this.differing(cursor).length
    const named = count === 1 ? '1 square differs' : `${count} squares differ`
    const where = this.parting ? `, where the stored game played ${this.parting}` : ''
    return {
      count : count ? named : '',
      line  : `Ply ${ply} · parted at ply ${part}${count ? ` · ${named}` : ''}`,
      say   : `Ply ${ply}, ${moves}. They parted at ply ${part}${where}${count ? `, and ${named}` : ''}.`,
      short : `Parted at ply ${part}`
    }
  }
}
