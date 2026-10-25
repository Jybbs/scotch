import * as pieces                from '../site/pieces.ts'
import type { Example, Position } from './example.ts'

export type Mark = (typeof MARKS)[number]

/**
 * Where a piece stands at a ply and how strongly it shows, a stored piece
 * standing on a square the two games differ on drawn hollow as a ghost.
 */
export interface Placed {
  ghost   : boolean
  opacity : number
  piece   : pieces.Piece
  square  : number
}

/**
 * Each mark a square the two games differ on takes, by which game stands a
 * piece there, which the board washes in that game's color and the key names.
 */
export const MARKS = ['submitted', 'stored', 'both'] as const
/**
 * The name the key gives each mark.
 */
export const MARK_NAMES = {
  both      : 'Both differ',
  stored    : 'Stored alone',
  submitted : 'Submitted alone'
} as const satisfies Record<Mark, string>
/**
 * The opacity a piece takes on a square the two games share, on a square they
 * differ on, and as a stored game's ghost.
 */
export const OPACITIES = { differing: 1, ghost: 0.95, shared: 0.2 } as const

function occupancy(position: Position): Map<number, pieces.Piece> {
  return new Map(position.standing.map(({ piece, square }) => [square, piece]))
}

/**
 * Marks each square a ply's two positions differ on with the game standing a
 * piece there, or both where each game stands a different piece.
 */
export function marksAt(example: Example, ply: number): (Mark | undefined)[] {
  const submitted = occupancy(example.submitted[ply]!)
  const stored    = occupancy(example.stored[ply]!)
  const markOf    = (square: number): Mark => {
    if (submitted.has(square) && stored.has(square)) return 'both'
    return submitted.has(square) ? 'submitted' : 'stored'
  }
  return Array.from({ length: 64 }, (_, square) =>
    submitted.get(square) === stored.get(square) ? undefined : markOf(square))
}

/**
 * Picks the square the key names a mark at, the lowest-ranked square taking
 * that mark nearest the board's middle files.
 */
export function nearest(squares: readonly number[]): number | undefined {
  return squares.toSorted((a, b) =>
    Math.floor(a / 8) - Math.floor(b / 8) || Math.abs(a % 8 - 3.5) - Math.abs(b % 8 - 3.5))[0]
}

/**
 * Writes a piece as a whole SVG with no `id` of its own, so the many copies a
 * board draws never share one, a black piece drawn over a copy of itself the
 * stylesheet rings in the light squares' color so it reads on a dark square.
 */
export function pieceMarkup(piece: pieces.Piece): string {
  return pieces.svgOf(pieces.ringed(piece, 'sc-run-halo'))
}

/**
 * Lists every piece the board shows at a ply under the name its node keeps:
 * each piece of the line, full where the two games differ or where the move
 * reaching the ply landed and faint elsewhere, and the stored game's piece on
 * each square the two differ on as a ghost.
 */
export function placedAt(example: Example, ply: number): Map<string, Placed> {
  const marks  = marksAt(example, ply)
  const landed = example.submitted[ply]!.to
  const placed = new Map<string, Placed>()

  for (const { id, piece, square } of example.submitted[ply]!.standing) {
    const opacity = marks[square] || square === landed ? OPACITIES.differing : OPACITIES.shared
    placed.set(String(id), { ghost: false, opacity, piece, square })
  }
  for (const { id, piece, square } of example.stored[ply]!.standing) {
    if (marks[square]) placed.set(`g${id}`, { ghost: true, opacity: OPACITIES.ghost, piece, square })
  }
  return placed
}

/**
 * Reads whether a square is dark or light, a1 being dark.
 */
export function shadeOf(square: number): 'dark' | 'light' {
  return (square + Math.floor(square / 8)) % 2 ? 'light' : 'dark'
}

/**
 * Writes the transform that stands a piece on a square, in shares of the
 * piece's own size, which is one square of the board.
 */
export function squareAt(square: number): string {
  return `translate(${(square % 8) * 100}%, ${(7 - Math.floor(square / 8)) * 100}%)`
}

/**
 * Groups the squares a ply's marks name by the mark each takes, leaving out a
 * mark no square takes.
 */
export function squaresOf(marks: readonly (Mark | undefined)[]): Partial<Record<Mark, number[]>> {
  return Object.groupBy([...marks.keys()].filter(square => marks[square]), square => marks[square]!)
}
