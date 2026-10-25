import { type Piece, ringed } from '../site/pieces.ts'
import { standingOf }         from './placements.ts'
import * as trails            from './trail.ts'

/**
 * One piece's node as a board draws it at rest: the piece, the square it stands
 * on, its drawing, and the transform standing it there.
 */
export interface PieceDrawing {
  markup    : string
  piece     : Piece
  square    : number
  transform : string
}

/**
 * The stroke each mark of the last move's two squares is drawn with, in the
 * board's units, the mark standing half of it inside its square's edge so the
 * whole stroke falls inside the square.
 */
export const HOP_STROKE = 3.5

/**
 * Lays out a move as an arrow from the middle of the square it leaves to the
 * middle of the one it reaches as the board faces, its head pushed `apart`
 * board units to its left, so two arrows reaching one square stay apart.
 *
 * Returns:
 *   The arrow's line and its head as SVG paths.
 */
export function arrowOf(
  apart  : number,
  facing : trails.Facing,
  hop    : { from: number, to: number }
): { head: string, line: string } {
  const from     = trails.cornerOf(hop.from, facing)
  const to       = trails.cornerOf(hop.to, facing)
  const [x, y]   = [from.x + trails.SQUARE / 2, from.y + trails.SQUARE / 2]
  const length   = Math.hypot(to.x - from.x, to.y - from.y)
  const [dx, dy] = [(to.x - from.x) / length, (to.y - from.y) / length]
  const [u, v]   = [to.x + trails.SQUARE / 2 - dy * apart, to.y + trails.SQUARE / 2 + dx * apart]
  const [ex, ey] = [u - dx * 13, v - dy * 13]
  return {
    head : `M${u} ${v}L${ex - dy * 9} ${ey + dx * 9}L${ex + dy * 9} ${ey - dx * 9}Z`,
    line : `M${x + dx * 8} ${y + dy * 8}L${ex} ${ey}`
  }
}

/**
 * Reads where the mark of one of the last move's squares stands as the board
 * faces, half its stroke inside the square's corner.
 */
export function hopAt(square: number, facing: trails.Facing): trails.Point {
  const { x, y } = trails.cornerOf(square, facing)
  return { x: x + HOP_STROKE / 2, y: y + HOP_STROKE / 2 }
}

/**
 * Writes the transform standing a piece at a place on the board, grown by `s`
 * about the middle of its square.
 */
export function matrixOf({ s, x, y }: { s: number, x: number, y: number }): string {
  const shift = trails.SQUARE / 2 * (s - 1)
  return `matrix(${s} 0 0 ${s} ${x - shift} ${y - shift})`
}

/**
 * Lists every piece a placement stands, each as its node draws it at rest on
 * its square as the board faces, the board's drawing at one position with no
 * motion and no page to draw it in, which the build renders and the board's
 * motion takes over.
 */
export function piecesAt(placement: string, facing: trails.Facing = 'white'): PieceDrawing[] {
  return standingOf(placement).flatMap((piece, square) => {
    if (!piece) return []
    const transform = matrixOf({ s: 1, ...trails.cornerOf(square, facing) })
    return [{ markup: ringed(piece, 'sc-viewer-halo'), piece, square, transform }]
  })
}
