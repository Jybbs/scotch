import examples       from '../rendered/examples.json' with { type: 'json' }
import type { Piece } from '../site/pieces.ts'
import type { Run }   from './runs.ts'

/**
 * The line the widget steps through beside the stored game it meets, the run
 * of positions the index matched, and every run the two share.
 */
export interface Example {
  run       : { length: number, start: number }
  runs      : readonly Run[]
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
    runs      : raw.runs,
    stored    : raw.stored.frames.map(frame => positionOf(frame)),
    submitted : raw.submitted.frames.map(frame => positionOf(frame))
  }
}
