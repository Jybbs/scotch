// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, vi } from 'vitest'

import { hexOf }   from '../../../../lib/identity/tokens.ts'
import * as lib    from '../../../../lib/reference/palette.ts'
import { Palette } from '../../../../theme/components/reference/palette.ts'
import { test }    from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { resized } from '../../../common/size.ts'
import { onScreen } from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const held = (at: number): number => lib.heldOf(lib.TOKENS[at]!, 'page', 'light')

describe('Palette', () => {
  test('sets a square per color, the first picked, its hex written on it', ({ clock }) => {
    onScreen()
    const drawn = mount(Palette)
    clock.runAllTimers()
    const squares = drawn.findAll('.sc-ref-square')
    expect(squares.length).toBe(lib.TOKENS.length)
    expect(squares[0]!.text()).toBe(hexOf(lib.TOKENS[0]!))
    expect(squares[0]!.attributes('aria-pressed')).toBe('true')
  })

  test("shows a picked color's card and each of its ratios on the grounds", async ({ clock }) => {
    onScreen()
    reduceMotion()
    const drawn = mount(Palette)
    clock.runAllTimers()
    await drawn.findAll('.sc-ref-square')[4]!.trigger('click')
    await flushPromises()
    expect(drawn.find('.sc-ref-stack > [data-at] small').text()).toContain(hexOf(lib.TOKENS[4]!))
    expect(drawn.findAll('.sc-ref-cell b')[0]!.text()).toBe(held(4).toFixed(2))
  })

  test('reserves the widest ratio beside each level, so a count moves nothing', ({ clock }) => {
    onScreen()
    const drawn  = mount(Palette)
    clock.runAllTimers()
    const widest = Math.max(...lib.TOKENS.flatMap(token => lib.SCHEMES.flatMap(scheme =>
      lib.GROUNDS.map(ground => lib.heldOf(token, ground, scheme).toFixed(2).length))))
    const styles = drawn.findAll('.sc-ref-cell b').map(figure => figure.attributes('style'))
    expect(new Set(styles)).toEqual(new Set([`min-width: ${widest}ch;`]))
  })

  test('glides one ring to the picked square, at six columns once the column is narrow', async ({ clock }) => {
    onScreen()
    reduceMotion()
    resized(342)
    const drawn = mount(Palette)
    clock.runAllTimers()
    await drawn.findAll('.sc-ref-square')[7]!.trigger('click')
    expect(drawn.find('.sc-ref').attributes('data-narrow')).toBe('')
    expect(drawn.find('.sc-ref-ring').attributes('style')).toContain('translate(100%, 100%)')
  })
})

describe('Palette, as it unfolds', () => {
  test('hides the rank and the card until the drawing comes on screen', async () => {
    onScreen()
    const drawn = mount(Palette)
    await flushPromises()
    expect(drawn.find('.sc-ref-picked').attributes('data-off')).toBe('')
    expect(drawn.find('.sc-ref-rank').attributes('data-off')).toBe('')
  })

  test('unfolds through its colors and settles on the first', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Palette)
    await show()
    await flushPromises()
    expect(Element.prototype.animate).toHaveBeenCalledTimes(lib.TOKENS.length)
    clock.advanceTimersByTime(2800)
    await flushPromises()
    expect(drawn.findAll('.sc-ref-square')[4]!.attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(1700)
    await flushPromises()
    expect(drawn.findAll('.sc-ref-square')[11]!.attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(4000)
    await flushPromises()
    expect(drawn.findAll('.sc-ref-square')[0]!.attributes('aria-pressed')).toBe('true')
    expect(drawn.find('.sc-ref-picked').attributes('data-off')).toBeUndefined()
  })

  test('states every value at once for a reader who prefers reduced motion', async ({ clock }) => {
    reduceMotion()
    onScreen()
    const drawn = mount(Palette)
    clock.runAllTimers()
    await flushPromises()
    expect(drawn.find('.sc-ref-picked').attributes('data-off')).toBeUndefined()
    expect(drawn.findAll('.sc-ref-cell b')[0]!.text()).toBe(held(0).toFixed(2))
  })

  test('writes a color no role takes as a chart series', ({ clock }) => {
    onScreen()
    const drawn = mount(Palette)
    clock.runAllTimers()
    expect(drawn.text()).toContain('No role, a chart series')
  })
})
