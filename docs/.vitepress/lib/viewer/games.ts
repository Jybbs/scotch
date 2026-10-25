import type { Side } from './examples.ts'

/**
 * A move's number and whether White plays it.
 */
export interface Numbered {
  no    : number
  white : boolean
}

function surname(name: string): string {
  return name.split(',')[0]!
}

/**
 * Names a game by its players' surnames, by its event where neither player is
 * named, or as a game with no names where its event is unknown too.
 */
export function nameOf({ headers }: Side): string {
  const { Black: black = '?', Event: event = '?', White: white = '?' } = headers
  if (white !== '?' || black !== '?') return `${surname(white)} vs. ${surname(black)}`
  return event === '?' ? 'A game with no names' : event
}

/**
 * Writes the move at `index` of a game's moves behind its number, as `22. c6`
 * for one of White's and `21...b6` for one of Black's.
 */
export function numbered(side: Side, index: number): string {
  const { no, white } = numberingOf(side)(index)
  return `${no}${white ? '. ' : '...'}${side.moves[index]}`
}

/**
 * Numbers a game's moves from the position its `FEN` tag sets up, or from move
 * 1 with White to move where it carries none.
 */
export function numberingOf({ headers }: Side): (index: number) => Numbered {
  const fields = headers.FEN?.split(' ') ?? []
  const black  = fields[1] === 'b' ? 1 : 0
  const first  = Number(fields[5]) || 1
  return index => ({ no: first + Math.floor((index + black) / 2), white: (index + black) % 2 === 0 })
}

/**
 * Names where and when a game was played, its event and the year its date
 * names, leaving out either one its tag leaves unknown.
 */
export function whereOf({ headers }: Side): string {
  const year = (headers.Date ?? '????').slice(0, 4).replace('????', '')
  return [headers.Event === '?' ? undefined : headers.Event, year].filter(Boolean).join(' ')
}
