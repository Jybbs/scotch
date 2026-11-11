import { counted }    from '../data/numbers.ts'
import { STORE }      from '../data/store.ts'
import type { Front } from './example.ts'
import { lastOf }     from './plies.ts'

/**
 * One beat of the session: the command it types into, how many of that
 * command's characters it has typed, and whether the command has printed what
 * it leaves.
 */
export interface Beat {
  done  : boolean
  step  : number
  typed : number
}

/**
 * One command of the session: its verb, what a reader types, the lines it
 * prints, and the figure the readout names beside its unit.
 */
export interface Command {
  command : string
  figure  : string
  out     : readonly string[]
  unit    : string
  verb    : string
}

/**
 * The characters the session types in one beat.
 */
const TYPED = 3

/**
 * Lists the beats the session plays: each command typed a few characters a
 * beat, then printing what it leaves.
 */
export function beatsOf(commands: readonly Command[]): Beat[] {
  return commands.flatMap(({ command }, step) => [
    ...Array.from({ length: Math.ceil(command.length / TYPED) + 1 }, (_, beat) =>
      ({ done: false, step, typed: Math.min(beat * TYPED, command.length) })),
    { done: true, step, typed: command.length }
  ])
}

/**
 * Lists the three commands a reader runs from a fresh clone, each beside the
 * last lines it prints, the match's report on the front page's example ending
 * on the run the two games share, ahead of the line naming the stored game's
 * move where they part.
 */
export function commandsOf(front: Front): Command[] {
  const { length, start } = front.example.run
  const plies             = `plies ${start} to ${lastOf(front)}`
  return [
    {
      command : 'scotch fetch games',
      figure  : counted(STORE.files.length),
      out     : STORE.files.slice(-2).map(({ address }) => `Fetched ${address}`),
      unit    : 'archives',
      verb    : 'Fetch'
    },
    {
      command : 'scotch index games',
      figure  : counted(STORE.positions),
      out     : [`Indexed ${counted(STORE.games)} games into .cache/data/index`],
      unit    : 'positions',
      verb    : 'Index'
    },
    {
      command : 'scotch match game docs/public/games/front.pgn',
      figure  : String(length),
      out     : [`Shares ${length} positions, ${plies} of the submitted game `
               + `and ${plies} of the stored game`],
      unit    : 'positions shared',
      verb    : 'Match'
    }
  ]
}
