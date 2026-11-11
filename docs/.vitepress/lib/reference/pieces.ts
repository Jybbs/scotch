import homes from '../rendered/homes.json' with { type: 'json' }

import type { Piece } from '../site/pieces.ts'

/**
 * Each piece in the order the tray sets them, White's above Black's.
 */
export const TYPES: readonly Piece[] = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p']
/**
 * The square a pick first stands each piece on, as `scotch render docs` writes
 * them from the one table the page's squares come from.
 */
export const HOMES = Object.fromEntries(
  Object.entries(homes).map(([piece, name]) => [piece, squareNamed(name)])
) as Readonly<Record<Piece, number>>
/**
 * The pieces and squares the unfold walks through, ending on the pawn's double
 * step.
 */
export const WALK: readonly (readonly [Piece, number])[] = [['Q', 45], ['N', 42], ['R', 31], ['B', 54], ['K', 36], ['P', 27]]

const NAMES: Readonly<Record<string, string>> = {
  b: 'bishop', k: 'king', n: 'knight', p: 'pawn', q: 'queen', r: 'rook'
}
const ROOK:   readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const BISHOP: readonly (readonly [number, number])[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const KNIGHT: readonly (readonly [number, number])[] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]
const SLIDES: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  b: BISHOP, q: [...ROOK, ...BISHOP], r: ROOK
}

function pawn(piece: Piece, file: number, rank: number): number[] {
  const direction = piece === 'P' ? 1 : -1
  const double    = rank === (piece === 'P' ? 1 : 6)
  return [rank + direction, ...double ? [rank + 2 * direction] : []].map(to => to * 8 + file)
}

/**
 * Places a square on the board, as its file from the left and its rank from the
 * top.
 */
export function placeOf(square: number): readonly [number, number] {
  return [square % 8, 7 - (square >> 3)]
}

/**
 * Names a piece as a reader reads it, such as `White queen`.
 */
export function pieceName(piece: Piece): string {
  return `${piece === piece.toUpperCase() ? 'White' : 'Black'} ${NAMES[piece.toLowerCase()]!}`
}

function inside(to: number): boolean {
  return to >= 0 && to < 8
}

/**
 * Lists the squares a piece reaches from a square on an otherwise empty board.
 */
export function reach(piece: Piece, square: number): number[] {
  const [file, rank] = [square % 8, square >> 3]
  const kind         = piece.toLowerCase()

  if (kind === 'p') return pawn(piece, file, rank)
  const hops = kind in SLIDES
    ? SLIDES[kind]!.flatMap(([across, up]) => Array.from({ length: 7 }, (_, step) => [across * (step + 1), up * (step + 1)] as const))
    : kind === 'n' ? KNIGHT : [...ROOK, ...BISHOP]
  return hops
    .map(([across, up]) => [file + across, rank + up] as const)
    .filter(([toFile, toRank]) => inside(toFile) && inside(toRank))
    .map(([toFile, toRank]) => toRank * 8 + toFile)
}

/**
 * Names a square, such as `d4`.
 */
export function squareName(square: number): string {
  return `${'abcdefgh'[square % 8]!}${(square >> 3) + 1}`
}

/**
 * Reads the square a name such as `d4` names, a1 being 0 and h8 63.
 */
export function squareNamed(name: string): number {
  return 'abcdefgh'.indexOf(name[0]!) + (Number(name[1]) - 1) * 8
}
