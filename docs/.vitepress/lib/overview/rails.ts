import { EXAMPLES }                             from '../viewer/examples.ts'
import * as games                               from '../viewer/games.ts'
import { DURATIONS }                            from '../motion/timing.ts'
import { Loaded, PARTIES, type Party }          from '../viewer/loaded.ts'

/**
 * One entry of the key beside the rails: the game it names or `both`, the
 * label set in mono capitals, and the move or the figure after it, the start
 * mark standing in for a move at the starting position.
 */
export interface Entry {
  game   : Party | 'both'
  label  : string
  move?  : string
  start? : boolean
}

/**
 * How one square moves when a reader points at the rails: the keyframes it runs
 * through, how long it waits first, and how long it runs.
 */
interface Replay {
  delay    : number
  duration : number
  keys     : Keyframe[]
}

/**
 * One square of the rails: the cursor it stands for, the game it belongs to or
 * `both` while the two share the position, its left edge, how far it sits off
 * the shared line, and how many squares it stands from the run, which sets when
 * a replay lifts it back in.
 */
export interface Square {
  away   : number
  cursor : number
  game   : Party | 'both'
  lift   : number
  x      : number
}

/**
 * The rails' geometry in SVG units: how many positions they draw, each square's
 * side and the gap after it, the height of the line both games share, the
 * picture's height, and how far a parted square lifts at most.
 */
export const RAILS = { cell: 9, columns: 60, gap: 1.5, height: 52, lift: 16, middle: 26 } as const
/**
 * The pace of a replay: how far each shared square rises in SVG units, and how
 * many milliseconds after the square before it each shared square rises and
 * each parted square lifts back in.
 */
const REPLAY = { rise: 3, stagger: 22, step: 11 } as const
/**
 * The example match the rails draw, the match the Viewer opens on.
 */
export const example = new Loaded(EXAMPLES.match)

/**
 * Reads how many positions a cursor stands from the run, 0 inside it.
 */
function awayOf(loaded: Loaded, cursor: number): number {
  const { last, meet } = loaded.shared!
  return Math.max(0, meet - cursor, cursor - last)
}

/**
 * Reads the left edge of a cursor's column in SVG units.
 */
function edgeOf(loaded: Loaded, cursor: number): number {
  return (cursor - loaded.first) * (RAILS.cell + RAILS.gap)
}

/**
 * Writes one entry per game, naming the game and the move reaching a cursor in
 * it, or the word given where the game holds no position there.
 */
function gamesAt(loaded: Loaded, cursor: number, missing?: string): Entry[] {
  return PARTIES.map(party => {
    const move = moveOf(loaded, party, cursor) ?? missing
    return { game: party, label: labelOf(loaded, party), move }
  })
}

/**
 * Names each game as the key labels it: the submitted game as yours, and the
 * stored game by its players.
 */
function labelOf(loaded: Loaded, party: Party): string {
  return party === 'submitted' ? 'Yours' : games.nameOf(loaded.sideOf('stored')!)
}

/**
 * Writes the move reaching a cursor in one game behind its number, or
 * `undefined` where the game holds no position there.
 */
function moveOf(loaded: Loaded, party: Party, cursor: number): string | undefined {
  const side = loaded.sideOf(party)
  const ply  = loaded.plyOf(party, cursor)
  return side && loaded.has(party, cursor) && ply ? games.numbered(side, ply - 1) : undefined
}

/**
 * Reads where the band behind the column at `cursor` starts, half a gap before
 * the column's squares.
 */
export function bandOf(loaded: Loaded, cursor: number): number {
  return edgeOf(loaded, cursor) - RAILS.gap / 2
}

/**
 * Reads the cursor under a point a share of the way across the rails.
 */
export function cursorAt(loaded: Loaded, share: number): number {
  const column = Math.floor(share * RAILS.columns)
  return Math.max(loaded.first, Math.min(lastOf(loaded), loaded.first + column))
}

/**
 * Reads where the dashed line marking the parting stands, midway through the
 * gap before the parting's column.
 */
export function cutOf(loaded: Loaded): number {
  return bandOf(loaded, loaded.shared!.part)
}

/**
 * Writes how the dashed line marking the parting moves in a replay, fading in
 * once the run has passed, as the parted squares start to lift back in.
 */
export function cutReplayOf(loaded: Loaded, replay: Record<keyof typeof REPLAY, number> = REPLAY): Replay {
  return {
    delay    : loaded.shared!.length * replay.step,
    duration : DURATIONS.enter,
    keys     : [{ opacity: 0 }, { opacity: 1 }]
  }
}

/**
 * Writes the key for the position under the pointer: the start mark at the
 * starting position, the position's place in the run and the move reaching it
 * while the two share it, and otherwise each game's move there beside how far
 * the position stands from the run.
 */
export function keyAt(loaded: Loaded, cursor: number): Entry[] {
  const { last, length, meet } = loaded.shared!
  if (cursor === loaded.first) return [{ game: 'both', label: 'both games', start: true }]
  if (loaded.sharing(cursor)) {
    const moves = gamesAt(loaded, cursor)
    const place = `Position ${cursor - meet + 1} of ${length}`
    return moves[0]!.move === moves[1]!.move
      ? [{ game: 'both', label: place, move: moves[0]!.move }]
      : [{ game: 'both', label: place }, ...moves]
  }
  const away = awayOf(loaded, cursor)
  return [
    ...gamesAt(loaded, cursor, 'ended'),
    { game: 'both', label: cursor > last ? `${away} after parting` : `${away} before meeting` }
  ]
}

/**
 * Reads the last cursor the rails draw, the match's last or the last column.
 */
export function lastOf(loaded: Loaded): number {
  return Math.min(loaded.last, loaded.first + RAILS.columns - 1)
}

/**
 * Writes how a square moves in a replay: a shared square rises and settles in
 * the order the run reaches it, and once the run has passed, a parted square
 * lifts from the shared line out to its place, the nearest to the run first.
 */
export function replayOf(
  loaded : Loaded,
  square : Square,
  replay : Record<keyof typeof REPLAY, number> = REPLAY
): Replay {
  const { length, meet } = loaded.shared!
  const lifted           = { opacity: 0.35, transform: `translateY(${-square.lift}px)` }
  const risen            = { offset: 0.5, transform: `translateY(${-replay.rise}px)` }
  const still            = { transform: 'none' }
  return square.game === 'both'
    ? { delay: (square.cursor - meet) * replay.step, duration: DURATIONS.enter, keys: [still, risen, still] }
    : {
      delay    : length * replay.step + (square.away - 1) * replay.stagger,
      duration : DURATIONS.settle,
      keys     : [lifted, { opacity: 1, transform: 'none' }]
    }
}

/**
 * Writes the key the rails show at rest: how many positions the run holds,
 * then each game's move where the two part.
 */
export function restingKey(loaded: Loaded): Entry[] {
  const { length, part } = loaded.shared!
  return [{ game: 'both', label: 'positions shared', move: String(length) }, ...gamesAt(loaded, part)]
}

/**
 * Lays out a square for every position the rails draw, one square on the
 * shared line while the two games share the position and one per game holding
 * it elsewhere, each lifted off the line by 3 more units for each position it
 * stands from the run, up to `RAILS.lift`.
 */
export function squaresOf(loaded: Loaded): Square[] {
  return Array.from({ length: lastOf(loaded) - loaded.first + 1 }, (_, column) => {
    const cursor = loaded.first + column
    const x      = edgeOf(loaded, cursor)
    const away   = awayOf(loaded, cursor)
    if (loaded.sharing(cursor)) return [{ away, cursor, game: 'both' as const, lift: 0, x }]
    const lift = Math.min(RAILS.lift, 1 + 3 * away)
    return PARTIES.filter(party => loaded.has(party, cursor))
      .map(party => ({ away, cursor, game: party, lift: party === 'submitted' ? -lift : lift, x }))
  }).flat()
}

/**
 * Reads how wide the rails draw, from the first column's left edge to the last
 * column's right.
 */
export function widthOf(loaded: Loaded): number {
  return edgeOf(loaded, lastOf(loaded) + 1) - RAILS.gap
}
