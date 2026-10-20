import examples       from '../rendered/examples.json' with { type: 'json' }
import type { Piece } from '../site/pieces.ts'

type Cell = 'apart' | 'run' | 'start'

/**
 * The line the widget steps through beside the stored game it meets and the run
 * of positions the two share.
 */
export interface Example {
  run       : { length: number, start: number }
  stored    : readonly Position[]
  submitted : readonly Position[]
}

/**
 * One position of a line as the widget draws it, each piece standing on its
 * square under the number it keeps from the line's first position, beside the
 * move reaching it and the square that move landed on.
 */
export interface Position {
  san      : string | null
  standing : readonly Standing[]
  to       : number | null
}

type Raw = typeof examples.methods

interface Standing {
  id     : number
  piece  : Piece
  square : number
}

/**
 * How the widget steps: the pixels between two cells of the timeline, and the
 * milliseconds it waits between two plies while it plays the line through.
 */
export interface Tuning {
  gap      : number
  interval : number
}

/**
 * The tuning the widget steps by unless it is handed another.
 */
export const RUN_TUNING: Readonly<Tuning> = { gap: 3, interval: 720 }

function positionOf({ move, pieces, san }: Raw['stored']['frames'][number]): Position {
  return {
    san      : san,
    to       : move ? move[1]! : null,
    standing : pieces.map(([id, square, piece]) => ({
      id     : Number(id),
      piece  : piece as Piece,
      square : Number(square)
    }))
  }
}

/**
 * Reads whether the two games stand on one position at a ply, which holds
 * across the run.
 */
export function agrees(example: Example, ply: number): boolean {
  return ply >= example.run.start && ply < partOf(example)
}

/**
 * Reads the kind of cell the timeline draws for a ply: the starting position, a
 * ply inside the run, or a ply where the two positions stand apart.
 */
export function cellOf(example: Example, ply: number): Cell {
  if (ply === 0) return 'start'
  return agrees(example, ply) ? 'run' : 'apart'
}

/**
 * Reads the example the Methods pages step through out of the JSON `scotch
 * render docs` writes, the run being the span the index matched, which pairs
 * ply n of each game since the span's offset is 0.
 *
 * Raises:
 *   Error: Where the span pairs ply n of one game with another ply of the
 *     other, which the widget cannot set side by side.
 */
export function exampleOf(raw = examples.methods): Example {
  if (raw.span.offset !== 0) throw new Error(`the example's run is offset by ${raw.span.offset} plies`)
  return {
    run       : { length: raw.span.length, start: raw.span.start },
    stored    : raw.stored.frames.map(frame => positionOf(frame)),
    submitted : raw.submitted.frames.map(frame => positionOf(frame))
  }
}

/**
 * Chooses the ply the widget opens on, the one before the two games meet, so
 * the reader's first step shows the two reaching one position.
 */
export function openingOf(example: Example): number {
  return Math.max(0, example.run.start - 1)
}

/**
 * Reads the ply where the two games part, the first past the run.
 */
export function partOf(example: Example): number {
  return example.run.start + example.run.length
}

/**
 * Writes the status line for a ply, naming whether the two games stand on one
 * position there, differ before they meet, or have parted.
 */
export function statusAt(example: Example, ply: number): string {
  if (ply === 0) return 'Both open on the starting position'
  if (agrees(example, ply)) return `Ply ${ply} · one position`
  return `Ply ${ply} · ${ply > example.run.start ? 'parted' : 'the positions differ'}`
}

/**
 * Writes the transform that moves the timeline's marker onto a ply's cell, each
 * cell one marker wide and the cells `gap` pixels apart.
 */
export function timelineAt(gap: number, ply: number): string {
  return `translate(calc(${ply * 100}% + ${ply * gap}px), 0)`
}
