import { counted }            from '../data/numbers.ts'
import { STORE }              from '../data/store.ts'
import { type Front, moveAt } from './example.ts'

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
 * Lists the three commands a reader runs from a fresh clone, each beside what
 * it prints, the match naming the front page's example and the move where the
 * reader's game parts from the stored one.
 */
export function commandsOf(front: Front): Command[] {
  const { length, start } = front.example.run
  return [
    {
      command : 'scotch fetch games',
      figure  : counted(STORE.files.length),
      out     : [`${counted(STORE.files.length)} archives from PGN Mentor`],
      unit    : 'archives',
      verb    : 'Fetch'
    },
    {
      command : 'scotch index games',
      figure  : counted(STORE.positions),
      out     : [`${counted(STORE.games)} games`, `${counted(STORE.positions)} positions keyed`],
      unit    : 'positions',
      verb    : 'Index'
    },
    {
      command : 'scotch match game front.pgn',
      figure  : String(length),
      out     : [`${length} positions shared from ply ${start}`,
                 `parting at your ${moveAt(front, 'submitted', start + length)}`],
      unit    : 'positions shared',
      verb    : 'Match'
    }
  ]
}
