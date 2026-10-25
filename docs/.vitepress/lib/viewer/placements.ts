import { type Piece, pieceKind, white } from '../site/pieces.ts'

/**
 * What changes between two placements: each piece traveling from one square to
 * another, each square a piece leaves the board from, and each square a piece
 * appears on.
 */
export interface Changes {
  appear  : readonly { piece: Piece, square: number }[]
  travels : readonly Travel[]
  vanish  : readonly number[]
}

/**
 * A move as the square a piece left and the square it reached.
 */
export interface Hop {
  from : number
  to   : number
}

/**
 * One piece traveling between two squares, as the piece it was and the piece it
 * is once it lands, which differ where a pawn promotes.
 */
export interface Travel extends Hop {
  now : Piece
  was : Piece
}

/**
 * Reads what changes between two placements. A piece standing on a square it
 * did not stand on before travels from the nearest square a piece of its kind
 * left, a pawn leaving pairs with the piece of its color appearing on the last
 * rank, a square left with no traveler is where a capture or en passant took a
 * piece, and a square filled with no traveler is where a piece appears, as a
 * capture taken back fills one. The king travels ahead of the rook it castles
 * with.
 */
export function changesOf(before: string, after: string): Changes {
  const was     = standingOf(before)
  const now     = standingOf(after)
  const left    = was.keys().filter(square => was[square] && was[square] !== now[square]).toArray()
  const appear  = [] as number[]
  const travels = [] as Travel[]

  for (const [square, piece] of now.entries()) {
    if (!piece || piece === was[square]) continue
    const at = left.findIndex(from => was[from] === piece)
    if (at < 0) appear.push(square)
    else travels.push({ from: left.splice(at, 1)[0]!, now: piece, to: square, was: piece })
  }
  for (const square of appear.toReversed()) {
    const piece = now[square]!
    const at    = left.findIndex(from => white(was[from]!) === white(piece)
                                      && (pieceKind(was[from]!) === 'p' || pieceKind(piece) === 'p'))
    if (at < 0) continue
    const from = left.splice(at, 1)[0]!
    travels.push({ from, now: piece, to: square, was: was[from]! })
    appear.splice(appear.indexOf(square), 1)
  }
  return {
    appear  : appear.map(square => ({ piece: now[square]!, square })),
    travels : travels.toSorted((a, b) => Number(pieceKind(b.was) === 'k') - Number(pieceKind(a.was) === 'k')),
    vanish  : left
  }
}

/**
 * Reads the move between two placements as the square it left and the square it
 * reached, the king's where it castles, or `undefined` where no piece moved.
 */
export function lastMove(before: string, after: string): Hop | undefined {
  const was    = standingOf(before)
  const now    = standingOf(after)
  const filled = now.keys().filter(square => now[square] && now[square] !== was[square]).toArray()
  const left   = was.keys().filter(square => was[square] && !now[square]).toArray()
  const to     = filled.find(square => pieceKind(now[square]!) === 'k' && filled.length > 1) ?? filled[0]
  if (to === undefined) return undefined
  const from = left.find(square => was[square] === now[to])
            ?? left.find(square => white(was[square]!) === white(now[to]!))
  return from === undefined ? undefined : { from, to }
}

/**
 * Reads the move reaching ply `ply` of a game's placements, or `undefined` at
 * the position the game starts from.
 */
export function moveTo(placements: readonly string[], ply: number): Hop | undefined {
  return ply > 0 ? lastMove(placements[ply - 1]!, placements[ply]!) : undefined
}

/**
 * Reads a placement, the first field of a FEN, into the piece standing on each
 * square, a1 being 0 and h8 63.
 */
export function standingOf(placement: string): (Piece | undefined)[] {
  return placement.split('/')
    .toReversed()
    .flatMap(rank => Array.from(rank.replaceAll(/\d/gu, count => ' '.repeat(Number(count)))))
    .map(symbol => symbol === ' ' ? undefined : symbol as Piece)
}
