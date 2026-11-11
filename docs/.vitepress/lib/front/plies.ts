import { type Front, type Game, moveAt } from './example.ts'

/**
 * Where a ply stands against the run: the starting position, apart before the
 * two games meet, the ply they meet at, inside the run, or past it.
 */
type Phase = (typeof PHASES)[number]

/**
 * What the readout of the front page's example names at a ply: the run so far
 * as its figure beside its unit, the sentence it reads as, and each game's move
 * reaching the ply, the stored game's past the run kept back for the Viewer.
 */
export interface PlyReading {
  figure : number
  moves  : Readonly<Record<Game, string>>
  say    : string
  unit   : string
}

/**
 * Each place a ply stands against the run, in the order a game reaches them.
 */
const PHASES = ['start', 'apart', 'met', 'run', 'parted'] as const
/**
 * The sentence and the unit the readout names in each phase.
 */
const WORDS: Readonly<Record<Phase, { say: string, unit: string }>> = {
  apart  : { say: 'The keys differ.', unit: 'no run yet' },
  met    : { say: 'Two orders of moves reach one position, a transposition.', unit: 'position shared' },
  parted : { say: 'The games have parted, and the run stands.', unit: 'positions shared' },
  run    : { say: 'The keys match again.', unit: 'positions shared' },
  start  : { say: 'Both games start from one position.', unit: 'no run yet' }
}

/**
 * Reads the last ply of the run the two games share.
 */
export function lastOf(front: Front): number {
  return front.example.run.start + front.example.run.length - 1
}

/**
 * Reads where a ply stands against the run.
 */
export function phaseOf(front: Front, ply: number): Phase {
  const { start } = front.example.run
  if (ply === 0) return 'start'
  if (ply < start) return 'apart'
  if (ply === start) return 'met'
  return ply <= lastOf(front) ? 'run' : 'parted'
}

/**
 * Writes what the readout names at a ply of the front page's example.
 */
export function readingAt(front: Front, ply: number): PlyReading {
  const phase   = phaseOf(front, ply)
  const counted = phase === 'met' || phase === 'run' || phase === 'parted'
  const stored  = phase === 'parted' ? 'Hidden' : moveAt(front, 'stored', ply)
  return {
    ...WORDS[phase],
    figure : counted ? Math.min(ply, lastOf(front)) - front.example.run.start + 1 : 0,
    moves  : { stored, submitted: moveAt(front, 'submitted', ply) }
  }
}
