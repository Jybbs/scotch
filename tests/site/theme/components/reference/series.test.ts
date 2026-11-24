// @vitest-environment happy-dom
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { describe, expect, vi }             from 'vitest'

import * as lib         from '../../../../../docs/.vitepress/lib/reference/series.ts'
import { Series }       from '../../../../../docs/.vitepress/theme/components/reference/series.ts'
import { test }         from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { unsized }      from '../../../common/size.ts'
import { onScreen }     from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

function settled(clock: typeof vi): ReturnType<typeof mount> {
  onScreen()
  reduceMotion()
  const drawn = mount(Series)
  clock.runAllTimers()
  return drawn
}

describe('Series', () => {
  test('draws a line and a switch per charted file, each stating its games', ({ clock }) => {
    const drawn = settled(clock)
    expect(drawn.findAll("svg[role='img'] > path").length).toBe(lib.FILES.length)
    expect(drawn.findAll('button[aria-pressed]').map(item => item.find('em').text()))
      .toEqual(lib.FILES.map(file => `${file.games.toLocaleString('en-US')} games`))
  })

  test('lays out nothing before it is measured', ({ clock }) => {
    unsized()
    expect(settled(clock).find("svg[role='img']").exists()).toBe(false)
  })

  test('switches a line off and on again', async ({ clock }) => {
    const drawn  = settled(clock)
    const button = drawn.findAll('button[aria-pressed]')[0]!
    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(drawn.findAll("svg[role='img'] > path")[0]!.attributes('style')).toContain('opacity: 0')
    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(drawn.findAll("svg[role='img'] > path")[0]!.attributes('style')).toContain('opacity: 1')
  })
})

describe('Series, read and unfolded', () => {
  test('reads a decade under the pointer on every switch and lets go as it leaves', async ({ clock }) => {
    const drawn = settled(clock)
    const plot  = new DOMWrapper(drawn.element.firstElementChild!)
    await plot.trigger('pointermove', { clientX: 36 })
    expect(drawn.find("svg[role='img'] > line").exists()).toBe(true)
    expect(drawn.find('button[aria-pressed] em').text())
      .toBe(`${lib.FILES[0]!.counts[0]!.toLocaleString('en-US')} · ${lib.DECADES[0]!}s`)
    await plot.trigger('pointerleave')
    expect(drawn.find("svg[role='img'] > line").exists()).toBe(false)
  })

  test('holds the column it reads inside the decades', async ({ clock }) => {
    const drawn = settled(clock)
    await new DOMWrapper(drawn.element.firstElementChild!).trigger('pointermove', { clientX: 9000 })
    expect(drawn.find('button[aria-pressed] em').text()).toContain(`${lib.DECADES.at(-1)!}s`)
  })

  test('draws each line in turn and switches two off and on again as it unfolds', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Series)
    clock.advanceTimersByTime(0)
    await show()
    await flushPromises()
    expect(drawn.findAll("svg[role='img'] > path")[0]!.attributes('style')).toContain('stroke-dashoffset: 1')
    clock.advanceTimersByTime(4000)
    await flushPromises()
    expect(drawn.findAll('button[aria-pressed]')[4]!.attributes('aria-pressed')).toBe('false')
    clock.advanceTimersByTime(1000)
    await flushPromises()
    expect(drawn.findAll('button[aria-pressed]')[3]!.attributes('aria-pressed')).toBe('false')
    clock.advanceTimersByTime(4000)
    await flushPromises()
    expect(drawn.findAll('button[aria-pressed]').every(item => item.attributes('aria-pressed') === 'true'))
      .toBe(true)
  })
})
