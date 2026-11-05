import { MARKS } from './marks.ts'

/**
 * Each subpath of the mark's one compound path, as path data of its own.
 */
export const SUBPATHS = MARKS.mark.paths[0]!.split(/(?=M)/u)
/**
 * The box the construction's drawing shows, wide enough for the figures beside
 * the mark.
 */
export const PLAN = '-120 -895 860 940'

const TICK = 12

/**
 * Writes a guide's two ticks and the line between them, as one path a dash can
 * reveal from one tick to the other.
 */
export function guidePath({ at, axis, end, start }: Pick<typeof MARKS.guides[number], 'at' | 'axis' | 'end' | 'start'>): string {
  return axis === 'x'
    ? `M${start} ${at - TICK}V${at + TICK}M${start} ${at}H${end}M${end} ${at - TICK}V${at + TICK}`
    : `M${at - TICK} ${start}H${at + TICK}M${at} ${start}V${end}M${at - TICK} ${end}H${at + TICK}`
}
