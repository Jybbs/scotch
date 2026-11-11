// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, vi } from 'vitest'

import { MARKS }    from '../../../../lib/reference/marks.ts'
import { Marks }    from '../../../../theme/components/reference/marks.ts'
import { test }     from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { resized, unsized } from '../../../common/size.ts'
import { onScreen } from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

function settled(clock: typeof vi): ReturnType<typeof mount> {
  onScreen()
  reduceMotion()
  const drawn = mount(Marks)
  clock.runAllTimers()
  return drawn
}

describe('Marks', () => {
  test('rests on the lockup, widest of the stops, each stop stating its width', ({ clock }) => {
    const drawn = settled(clock)
    expect(drawn.find('.sc-ref-readout b').text()).toBe('Lockup')
    expect(drawn.find('.sc-ref-stops').text()).toContain('12 wide')
    expect(drawn.findAll('.sc-ref-stops button').map(stop => stop.find('span').text()))
      .toEqual(MARKS.stops.map(stop => stop.name))
    expect(drawn.find('.sc-ref-stack > [data-at]').text()).toBe(MARKS.stops.at(-1)!.sentence)
  })

  test('spaces the stops evenly', ({ clock }) => {
    expect(settled(clock).findAll('.sc-ref-stops button').map(stop => stop.attributes('style')))
      .toEqual(['left: 0%;', 'left: 25%;', 'left: 50%;', 'left: 75%;', 'left: 100%;'])
  })

  test('lays nothing out before it is measured', ({ clock }) => {
    unsized()
    expect(settled(clock).find('.sc-ref-zoom svg').exists()).toBe(false)
  })

  test('follows the range to any place, reading the size at that scale', async ({ clock }) => {
    const drawn = settled(clock)
    await drawn.find('input').setValue(0)
    expect(drawn.find('.sc-ref-readout').text()).toBe('Favicon12 by 16 px')
    expect(drawn.find('.sc-ref-stack > [data-at]').text()).toBe(MARKS.stops[0]!.sentence)
  })
})

describe('Marks, at each place', () => {
  test('states the scale a mark too wide for the column is shown at', ({ clock }) => {
    resized(342)
    const { height, width } = MARKS.stops.at(-1)!
    expect(settled(clock).find('.sc-ref-readout small').text())
      .toMatch(new RegExp(`^${width} by ${height} px, shown at \\d+%$`, 'u'))
  })

  test("reads the link card's own size at its stop and shows the card", async ({ clock }) => {
    const drawn = settled(clock)
    await drawn.findAll('.sc-ref-stops button')[3]!.trigger('click')
    await flushPromises()
    expect(drawn.find('.sc-ref-readout').text()).toContain('Link card')
    expect(drawn.find('.sc-ref-readout small').text()).toBe('400 by 200 px')
    expect(drawn.find('img').attributes('style')).toContain('opacity: 1')
  })

  test('marks the stop it stands nearest', ({ clock }) => {
    expect(settled(clock).findAll('.sc-ref-stops button').map(stop => stop.attributes('data-at') !== undefined))
      .toEqual([false, false, false, false, true])
  })

  test('grows from the favicon and ends on the lockup as it unfolds', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Marks)
    await show()
    await flushPromises()
    expect(drawn.find('.sc-ref-readout b').text()).toBe('Favicon')
    clock.advanceTimersByTime(5600)
    await flushPromises()
    expect(drawn.find('.sc-ref-readout b').text()).toBe('Lockup')
  })
})
