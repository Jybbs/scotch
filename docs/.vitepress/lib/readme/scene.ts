import { type Front, type Game, frontOf } from '../front/example.ts'
import type { Position }                  from '../methods/example.ts'
import type { Match }                     from '../viewer/examples.ts'
import { Loaded }                         from '../viewer/loaded.ts'

/**
 * One frame of the preview: the plies it moves between, how many milliseconds
 * into that move or hold it falls, and how long the move takes, a hold moving
 * from a ply to itself.
 */
export interface Frame {
  from : number
  span : number
  t    : number
  to   : number
}

/**
 * What the preview plays: the front page's example, the match the Viewer
 * loads from it, and its frames in order.
 */
export interface Scene {
  front  : Front
  frames : readonly Frame[]
  loaded : Loaded
}

/**
 * How the preview steps through the example in milliseconds: the length of a
 * frame, the hold on the opening position, each ply's step and the slide
 * inside it, the hold where the games part, and the slide back to the start.
 */
export interface Pace {
  back  : number
  frame : number
  hold  : number
  rest  : number
  slide : number
  step  : number
}

/**
 * The pace the preview plays at, its frame the 20 milliseconds a GIF stores as
 * two hundredths of a second, the shortest delay every browser plays at its
 * true speed.
 */
export const PACE: Readonly<Pace> = { back: 1100, frame: 20, hold: 3200, rest: 1400, slide: 620, step: 1100 }

/**
 * Writes the placement field of a FEN from the pieces standing on a position's
 * squares, a1 being 0 and h8 63.
 */
function placementOf(position: Position): string {
  const squares = Array.from<string>({ length: 64 }).fill('1')
  for (const { piece, square } of position.standing) squares[square] = piece
  return Array.from({ length: 8 }, (_, rank) => squares.slice(56 - 8 * rank, 64 - 8 * rank).join(''))
    .join('/')
    .replaceAll(/1+/gu, ones => String(ones.length))
}

/**
 * Lists the frames the preview draws: the hold on the starting position, each
 * ply's slide and hold up to the ply where the two games part, the longer hold
 * there, and the slide back to the start, each a whole number of frames.
 */
export function framesOf(part: number, pace: Readonly<Pace> = PACE): Frame[] {
  const legs = [{ from: 0, ms: pace.rest, to: 0 }]
  for (let ply = 1; ply <= part; ply++) {
    const stay = (ply === part ? pace.hold : pace.step) - pace.slide
    legs.push({ from: ply - 1, ms: pace.slide, to: ply }, { from: ply, ms: stay, to: ply })
  }
  legs.push({ from: part, ms: pace.back, to: 0 })
  return legs.flatMap(({ from, ms, to }) => Array.from({ length: Math.round(ms / pace.frame) }, (_, at) =>
    ({ from, span: ms, t: (at + 1) * pace.frame, to })))
}

/**
 * Loads the front page's example as the Viewer loads a match, each game's moves
 * up to the last position the example carries for both.
 */
export function matchOf(front: Front): Match {
  const side = (game: Game): Match['submitted'] => {
    const positions = front.example[game]
    return {
      headers    : {},
      moves      : front.moves[game].slice(0, positions.length - 1),
      placements : positions.map(position => placementOf(position))
    }
  }
  const { length, start } = front.example.run
  return { span: { length, offset: 0, start }, stored: side('stored'), submitted: side('submitted'), ties: 0 }
}

/**
 * Sets up the preview from the front page's example.
 */
export function sceneOf(front: Front = frontOf(), pace: Readonly<Pace> = PACE): Scene {
  const loaded = new Loaded(matchOf(front))
  return { frames: framesOf(loaded.shared!.part, pace), front, loaded }
}
