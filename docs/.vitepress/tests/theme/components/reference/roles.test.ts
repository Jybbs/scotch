// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, vi } from 'vitest'

import { ORDER, START } from '../../../../lib/reference/roles.ts'
import * as palette     from '../../../../lib/reference/palette.ts'
import { Roles }        from '../../../../theme/components/reference/roles.ts'
import { test }         from '../../../common/clock.ts'
import { prevented }    from '../../../common/keys.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { resized }      from '../../../common/size.ts'
import { onScreen }     from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

describe('Roles', () => {
  test('sets the sample page in both schemes, the dark one over the light', ({ clock }) => {
    onScreen()
    const drawn = mount(Roles)
    clock.runAllTimers()
    expect(drawn.findAll('.sc-ref-sheet').length).toBe(2)
    expect(drawn.find('.sc-ref-sheet').attributes('style')).toContain(palette.colorOf('page', 'light'))
    expect(drawn.find('.sc-ref-over .sc-ref-sheet').attributes('style')).toContain(palette.colorOf('page', 'dark'))
  })

  test('names the run color first, with its hex, paint, and ratio in each scheme', ({ clock }) => {
    onScreen()
    const drawn = mount(Roles)
    clock.runAllTimers()
    const card = drawn.find('.sc-ref > .sc-ref-stack > [data-at]')
    expect(card.find('b').text()).toBe('run')
    expect(card.text()).toContain(palette.colorOf('run', 'light'))
    expect(card.text()).toContain(palette.colorOf('run', 'dark'))
    expect(card.text()).toContain(':1 on the page')
    expect(drawn.find('output [data-at]').text()).toBe(`${START + 1} of ${ORDER.length} · run`)
  })

  test('writes the page as itself rather than against itself', async ({ clock }) => {
    onScreen()
    reduceMotion()
    const drawn = mount(Roles)
    clock.runAllTimers()
    await drawn.findAll('.sc-ref-chip')[0]!.trigger('click')
    await flushPromises()
    expect(drawn.find('.sc-ref > .sc-ref-stack > [data-at]').text()).toContain('The page itself')
  })
})

describe('Roles, the seam', () => {
  test('moves the seam under the keyboard, held inside the drawing, and leaves other keys', async ({ clock }) => {
    onScreen()
    reduceMotion()
    const drawn = mount(Roles)
    clock.runAllTimers()
    const hold = drawn.find('.sc-ref-hold').element as HTMLElement
    vi.spyOn(hold, 'offsetWidth', 'get').mockReturnValue(600)
    const seam = drawn.find('.sc-ref-seam')
    const key  = async (name: string): Promise<boolean> => {
      const answered = prevented(seam.element, name)
      await flushPromises()
      return answered
    }
    expect(await key('ArrowRight')).toBe(true)
    expect(seam.attributes('style')).toContain('translateX(16px)')
    expect(await key('ArrowLeft')).toBe(true)
    expect(await key('ArrowLeft')).toBe(true)
    expect(seam.attributes('style')).toContain('translateX(0px)')
    expect(await key('a')).toBe(false)
  })

  test('drags the seam with a pointer it captures', async ({ clock }) => {
    onScreen()
    reduceMotion()
    const drawn = mount(Roles)
    clock.runAllTimers()
    const hold = drawn.find('.sc-ref-hold').element as HTMLElement
    vi.spyOn(hold, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 600 } as DOMRect)
    vi.spyOn(hold, 'offsetWidth', 'get').mockReturnValue(600)
    const seam = drawn.find('.sc-ref-seam')
    Object.assign(seam.element, { hasPointerCapture: vi.fn<() => boolean>(() => false), setPointerCapture: vi.fn<() => void>() })
    await seam.trigger('pointerdown', { clientX: 300, pointerId: 1 })
    expect(seam.element.setPointerCapture).toHaveBeenCalledWith(1)
    expect(seam.attributes('style')).toContain('translateX(300px)')
    await seam.trigger('pointermove', { clientX: 150 })
    expect(seam.attributes('style')).toContain('translateX(300px)')
    Object.assign(seam.element, { hasPointerCapture: vi.fn<() => boolean>(() => true) })
    await seam.trigger('pointermove', { clientX: 150 })
    expect(seam.attributes('style')).toContain('translateX(150px)')
  })
})

describe('Roles, as the column or the unfold changes it', () => {
  test('places the ring through a transform, so its glide moves nothing in the layout', ({ clock }) => {
    onScreen()
    reduceMotion()
    const drawn = mount(Roles)
    clock.runAllTimers()
    const style = drawn.find('.sc-ref-outline').attributes('style')
    expect(style).toMatch(/transform: translate\(-?[\d.]+px, -?[\d.]+px\)/u)
    expect(style).not.toMatch(/(^|;\s*)(left|top):/u)
  })

  test('remeasures once the column narrows', async ({ clock }) => {
    onScreen()
    reduceMotion()
    const drawn = mount(Roles)
    clock.runAllTimers()
    resized(342)
    await flushPromises()
    expect(drawn.find('.sc-ref').attributes('data-narrow')).toBe('')
  })

  test('opens the seam from the far edge and rings each role it unfolds through', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Roles)
    await show()
    await flushPromises()
    expect(drawn.find('.sc-ref-outline').attributes('data-off')).toBe('')
    clock.advanceTimersByTime(1600)
    await flushPromises()
    expect(drawn.find('.sc-ref-outline').attributes('data-off')).toBeUndefined()
    expect(drawn.find('output [data-at]').text()).toContain('ink')
    clock.advanceTimersByTime(1500)
    await flushPromises()
    expect(drawn.find('output [data-at]').text()).toContain('submitted')
    clock.advanceTimersByTime(1500)
    await flushPromises()
    expect(drawn.find('output [data-at]').text()).toContain('front_paper')
    clock.advanceTimersByTime(3000)
    await flushPromises()
    expect(drawn.find('output [data-at]').text()).toContain('run')
  })
})
