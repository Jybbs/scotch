import { clamp } from '@vueuse/core'

import { counted, percent } from './numbers.ts'
import { OMISSIONS }        from './omitted.ts'

/**
 * What a square of the sieve stands for: games under the floor, games another
 * file already holds, or stored games.
 */
export type Sifted = 'below' | 'repeat' | 'stored'

/**
 * One step of the sieve: its name, the figure it reads as, the sentence saying
 * what it drops, and the games left after it.
 */
export interface Step {
  figure : string
  name   : string
  say    : string
  total  : number
}

/**
 * The games each kind of square stands for, the games the reader cannot play
 * counted beside them, summed across the sections `docs:render` writes.
 */
const totals = Object.fromEntries((['below', 'files', 'kept', 'repeat', 'unread', 'variant'] as const)
  .map(key => [key, OMISSIONS.sections.reduce((total, section) => total + section[key], 0)]))
/**
 * The games a square stands for.
 */
export const PER_SQUARE = 1e4
/**
 * The squares a row of the sieve holds.
 */
export const COLUMNS = 32
/**
 * The games fetched, which every later step counts down from.
 */
const fetched = totals.below! + totals.repeat! + totals.kept! + totals.unread! + totals.variant!
/**
 * The games of each kind of square.
 */
const COUNTS: Readonly<Record<Sifted, number>> = {
  below  : totals.below!,
  repeat : totals.repeat!,
  stored : totals.kept!
}
/**
 * The first step past which each kind of square draws as dropped.
 */
export const DROPPED: Readonly<Record<Sifted, number>> = { below: 1, repeat: 2, stored: 4 }
/**
 * What the key beside the sieve calls each kind of square.
 */
export const KEY: readonly { kind: Sifted, label: string }[] = [
  { kind: 'stored', label: 'Stored, on light and dark squares' },
  { kind: 'repeat', label: 'Repeated' },
  { kind: 'below', label: `Under the ${counted(OMISSIONS.floor.floor)} floor` }
]
/**
 * Each square of the sieve, ten thousand games of one kind, the stored ones
 * first.
 */
export const SQUARES: readonly Sifted[] = (['stored', 'repeat', 'below'] as const)
  .flatMap(kind => Array.from(
    { length: Math.round(COUNTS[kind] / PER_SQUARE) },
    () => kind
  ))
/**
 * The four steps from the games fetched to the games stored, in the order
 * `scotch index games` drops them: the floor and the unread games as it reads
 * each file, then the repeats as it builds the index.
 */
export const STEPS: readonly Step[] = [
  {
    figure : counted(fetched),
    name   : 'Fetched',
    say    : `Every game the ${counted(totals.files!)} fetched files hold, one square for each ten thousand.`,
    total  : fetched
  },
  {
    figure : `− ${counted(totals.below!)}`,
    name   : 'The floor',
    say    : `Reading each Openings file drops ${counted(totals.below!)} games where neither player reaches `
           + `${counted(OMISSIONS.floor.floor)}, and ${counted(totals.unread! + totals.variant!)} games the `
           + 'reader cannot play.',
    total  : fetched - totals.below! - totals.unread! - totals.variant!
  },
  {
    figure : `− ${counted(totals.repeat!)}`,
    name   : 'Repeats',
    say    : `Building the index drops ${counted(totals.repeat!)} games another file declared first `
           + 'already holds.',
    total  : totals.kept!
  },
  {
    figure : `= ${counted(totals.kept!)}`,
    name   : 'Stored',
    say    : `What a match reads: ${percent(totals.kept! / fetched)} of the games fetched.`,
    total  : totals.kept!
  }
]

/**
 * Reads the step nearest a pointer `share` of the way along the slider's rail.
 */
export function stepAt(share: number): number {
  return clamp(Math.round(share * (STEPS.length - 1)), 0, STEPS.length - 1)
}
