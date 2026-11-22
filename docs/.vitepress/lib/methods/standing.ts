import type { Piece }    from '../site/pieces.ts'
import { standingOf }    from '../viewer/placements.ts'
import type { Position } from './example.ts'

/**
 * One piece of a position under the name it keeps from the line's first
 * position, gone once captured, while it stays on its last square to fade out.
 */
export interface Standing {
  gone   : boolean
  id     : string
  piece  : Piece
  square : number
}

const distance = (a: number, b: number): number =>
  Math.abs(a % 8 - b % 8) + Math.abs(Math.floor(a / 8) - Math.floor(b / 8))

/**
 * Reads each piece of a placement, the first field of a FEN, on its square.
 */
function placed(placement: string): Pick<Standing, 'piece' | 'square'>[] {
  return standingOf(placement).flatMap((piece, square) => piece ? [{ piece, square }] : [])
}

/**
 * Moves each piece of one position into the next: a piece still on its square
 * keeps its name, a piece that moved takes the name of the nearest piece of its
 * kind that left a square, a promoted piece that of the nearest pawn of its side
 * that left one, and a piece no square holds any longer stays named and gone.
 */
function stepped(before: readonly Standing[], placement: string, ply: number): Standing[] {
  const left  = new Set(before.filter(it => !it.gone))
  const next  : Standing[] = []
  const fresh : Pick<Standing, 'piece' | 'square'>[] = []
  for (const it of placed(placement)) {
    const kept = [...left].find(old => old.square === it.square && old.piece === it.piece)
    if (!kept) {
      fresh.push(it)
      continue
    }
    left.delete(kept)
    next.push(kept)
  }
  for (const it of fresh) {
    const pawn  = it.piece === it.piece.toUpperCase() ? 'P' : 'p'
    const same  = [...left].filter(old => old.piece === it.piece)
    const pool  = same.length > 0 ? same : [...left].filter(old => old.piece === pawn)
    const moved = pool.toSorted((a, b) => distance(a.square, it.square) - distance(b.square, it.square))[0]
    if (moved) left.delete(moved)
    next.push({ gone: false, id: moved?.id ?? `n${ply}-${it.square}`, piece: it.piece, square: it.square })
  }
  const taken = [...left].map(({ id, piece, square }) => ({ gone: true, id, piece, square }))
  return [...next, ...taken, ...before.filter(it => it.gone)]
}

/**
 * Follows each piece of a line's positions by the number it keeps from the
 * line's first position, a captured piece staying on its last square, gone.
 */
export function framed(positions: readonly Position[]): Standing[][] {
  let last = new Map<string, Standing>()
  return positions.map(({ standing }) => {
    const now = new Map(standing.map(({ id, piece, square }) =>
      [String(id), { gone: false, id: String(id), piece, square }]))
    for (const [id, it] of last) if (!now.has(id)) now.set(id, { ...it, gone: true })
    last = now
    return [...now.values()]
  })
}

/**
 * Follows every piece through a line's placements, so a piece keeps one name as
 * it moves from square to square.
 */
export function tracked(placements: readonly string[]): Standing[][] {
  const [first, ...rest] = placements
  const lines            = [placed(first!).map(({ piece, square }, at) =>
    ({ gone: false, id: `p${at}`, piece, square }))]
  for (const [ply, placement] of rest.entries()) lines.push(stepped(lines.at(-1)!, placement, ply + 1))
  return lines
}
