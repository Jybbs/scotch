// @vitest-environment happy-dom
import { type VueWrapper, mount } from '@vue/test-utils'
import { describe, expect, vi }   from 'vitest'
import { nextTick }               from 'vue'

import * as lengths  from '../../../../lib/data/lengths.ts'
import { useMove }   from '../../../../lib/data/move.ts'
import * as ridges   from '../../../../lib/data/ridges.ts'
import { DURATIONS } from '../../../../lib/motion/timing.ts'
import { Eras }      from '../../../../theme/components/data/eras.ts'
import { Results }   from '../../../../theme/components/data/results.ts'
import { test }      from '../../../common/clock.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const eraLayout    = ridges.ridgesLayout(ridges.ridgesOf().length, 600)
const resultLayout = lengths.sharesLayout(600)

/**
 * Waits out the pointer's glide after an event, a little past its duration.
 */
async function glided(clock: typeof vi): Promise<void> {
  await nextTick()
  clock.advanceTimersByTime(DURATIONS.move + 20)
  await nextTick()
}

/**
 * Reads where the line at the move a chart follows stands.
 */
function mover(chart: VueWrapper): string {
  return (chart.get('.sc-data-mover').element as HTMLElement).style.transform
}

/**
 * Writes where the line stands at a move of a chart laid out as `layout` sets,
 * to the tenth of a pixel the chart writes it at.
 */
function moverAt(layout: Parameters<typeof lengths.moveX>[0], move: number): string {
  return `${(Math.round(lengths.moveX(layout, move) * 10) / 10).toString()}px`
}

describe('Results, its glide', () => {
  test.for([
    ['pointermove', { clientX: lengths.moveX(resultLayout, 30) }, true],
    ['keydown', { key: 'End' }, false]
  ] as const)(
    'keeps the pointer glide for a later pointer and takes the longer one again for a key, here a %s',
    async ([type, init, reached], { clock }) => {
      useMove().value = lengths.CHART.opening
      const results   = mount(Results)
      const slider    = results.find('[role="slider"]')
      await slider.trigger('pointermove', { clientX: lengths.moveX(resultLayout, 20) })
      await glided(clock)
      await slider.trigger(type, init)
      await glided(clock)
      const at = moverAt(resultLayout, Number(slider.attributes('aria-valuenow')))
      expect(mover(results).startsWith(`translate3d(${at}`)).toBe(reached)
    }
  )
})

describe('Eras, its glide', () => {
  test('has the line at the move within the pointer glide after a pointer moves', async ({ clock }) => {
    useMove().value = lengths.CHART.opening
    const eras      = mount(Eras)
    const point     = { clientX: lengths.moveX(eraLayout, 30), clientY: eraLayout.top }
    await eras.find('[role="listbox"]').trigger('pointermove', point)
    await glided(clock)
    expect(mover(eras)).toContain(moverAt(eraLayout, 30))
  })

  test('takes the longer glide again for a key once a pointer has moved the line', async ({ clock }) => {
    useMove().value = lengths.CHART.opening
    const eras      = mount(Eras)
    const list      = eras.find('[role="listbox"]')
    await list.trigger('pointermove', { clientX: lengths.moveX(eraLayout, 30), clientY: eraLayout.top })
    await glided(clock)
    await list.trigger('keydown', { key: 'End' })
    await glided(clock)
    expect(mover(eras)).not.toContain(moverAt(eraLayout, lengths.CHART.plotted))
  })
})
