import { squareNamed }      from '../reference/pieces.ts'
import type { Piece }       from '../site/pieces.ts'
import type { Side }        from './examples.ts'
import { type Hop, moveTo } from './placements.ts'

/**
 * What a player offered at one covered ply once its move shows: the offer as
 * the Viewer writes it, and whether it matches the move the stored game
 * played, both missing where the player stepped on without offering one.
 */
export interface Guess {
  matched? : boolean
  offered? : string
}

/**
 * A move a player offers at a covered ply: the squares a piece was moved
 * between on the stored board, or the text typed in SAN.
 */
export type Offer = { hop: Hop, typed?: undefined } | { hop?: undefined, typed: string }

/**
 * A move written in SAN, as the kind of piece it moves, the square it reaches,
 * the file and the rank of the square it leaves where the text names them, the
 * piece a pawn promotes to, and the side a king castles to.
 */
export interface Read {
  kind       : Lowercase<Piece>
  castle?    : 'king' | 'queen'
  file?      : number
  promotion? : Lowercase<Piece>
  rank?      : number
  to?        : number
}

/**
 * What the Viewer says of the stored move a step on just showed while the
 * stored game is covered: whether the move the player offered there matches,
 * as a short line and as the sentence the live region reads.
 */
export interface Verdict {
  line : string
  say  : string
}

/**
 * A move in SAN as the PGN standard writes it (Section 8.2.3), the piece letter
 * and the file or rank or square it leaves before an optional `x` and the
 * square it reaches, an optional promotion, and either castling, followed by a
 * check or mate sign and a suffix annotation of at most two characters
 * (Section 8.2.3.8). The castling written with zeros and the promotion written
 * without `=` are read as python-chess's `parse_san` reads them.
 */
const SAN = /^(?:(?<castle>O-O(?:-O)?|0-0(?:-0)?)|(?<piece>[KQRBN])?(?<file>[a-h])?(?<rank>[1-8])?x?(?<to>[a-h][1-8])(?:=?(?<promotion>[QRBN]))?)[+#]?[!?]{0,2}$/u

/**
 * Judges a move offered at the stored game's ply `ply` against the move the
 * stored game played there, and only against it. A dragged move matches where
 * it moves between the same two squares, a pawn reaching the last rank taken as
 * promoting to a queen. A typed move matches where it moves the same kind of
 * piece to the same square, or castles to the same side, promotes to the same
 * piece, a queen where it names none, and leaves from a square whose file and
 * rank agree with every one it names, naming at least one where the stored
 * move's own SAN does.
 *
 * Returns:
 *   Whether the offer matches, or `undefined` where the text is no move in SAN
 *   or the stored game plays no move from that ply.
 */
export function judge(offer: Offer, side: Side, ply: number): boolean | undefined {
  const stored = readSan(side.moves[ply] ?? '')
  const hop    = stored && moveTo(side.placements, ply + 1)
  if (!hop || !stored) return undefined
  if (offer.hop) {
    return offer.hop.from === hop.from && offer.hop.to === hop.to && (stored.promotion ?? 'q') === 'q'
  }
  const read = readSan(offer.typed)
  if (!read) return undefined
  if (read.castle || stored.castle) return read.castle === stored.castle
  const named = stored.file !== undefined || stored.rank !== undefined
  return read.kind === stored.kind
      && read.to === hop.to
      && (read.promotion ?? (stored.promotion && 'q')) === stored.promotion
      && (read.file ?? hop.from % 8) === hop.from % 8
      && (read.rank ?? hop.from >> 3) === hop.from >> 3
      && (!named || read.file !== undefined || read.rank !== undefined)
}

/**
 * Reads a move written in SAN, or `undefined` where the text is none.
 */
export function readSan(text: string): Read | undefined {
  const groups = SAN.exec(text.trim())?.groups
  if (!groups) return undefined
  const { castle, file, piece, promotion, rank, to } = groups
  if (castle) return { castle: castle.length > 3 ? 'queen' : 'king', kind: 'k' }
  return {
    kind : (piece?.toLowerCase() ?? 'p') as Lowercase<Piece>,
    to   : squareNamed(to!),
    ...file ? { file: file.codePointAt(0)! - 97 } : {},
    ...promotion ? { promotion: promotion.toLowerCase() as Lowercase<Piece> } : {},
    ...rank ? { rank: Number(rank) - 1 } : {}
  }
}

/**
 * Counts the moves offered at covered plies and how many of them match.
 */
export function tallyOf(guesses: ReadonlyMap<number, Guess>): { matched: number, offered: number } {
  const offered = guesses.values().filter(guess => guess.offered !== undefined).toArray()
  return { matched: offered.filter(guess => guess.matched).length, offered: offered.length }
}
