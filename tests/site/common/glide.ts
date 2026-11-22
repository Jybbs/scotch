import type { VueWrapper } from '@vue/test-utils'
import type { vi }         from 'vitest'
import { nextTick }        from 'vue'

import { moveX }     from '../../../docs/.vitepress/lib/data/lengths.ts'
import { tenth }     from '../../../docs/.vitepress/lib/data/numbers.ts'
import { DURATIONS } from '../../../docs/.vitepress/lib/motion/timing.ts'

/**
 * Waits out the pointer's glide after an event, a little past its duration.
 */
export async function glided(clock: typeof vi): Promise<void> {
  await nextTick()
  clock.advanceTimersByTime(DURATIONS.move + 20)
  await nextTick()
}

/**
 * Reads where the line at the move a chart follows stands.
 */
export function mover(chart: VueWrapper): string {
  return (chart.get('[data-mover]').element as HTMLElement).style.transform
}

/**
 * Writes where the line stands at a move of a chart laid out as `layout` sets,
 * to the tenth of a pixel the chart writes it at.
 */
export function moverAt(layout: Parameters<typeof moveX>[0], move: number): string {
  return `${tenth(moveX(layout, move)).toString()}px`
}
