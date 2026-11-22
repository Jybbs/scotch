// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { type VNode, defineComponent } from 'vue'

import { cells, reels } from '../../../../../docs/.vitepress/theme/components/methods/digits.ts'

/**
 * Mounts what `draw` draws.
 */
const drawn = (draw: () => VNode): ReturnType<typeof mount> => mount(defineComponent({ setup: () => draw }))

const BEFORE = '244716f4629e4be1'
const AFTER  = '244716f4629e4bf0'

describe('cells', () => {
  it('writes a key as sixteen digits in four groups, named for a reader who cannot see them', () => {
    const key = drawn(() => cells(BEFORE, () => false))
    expect(key.find('[role=img]').attributes('aria-label')).toBe('2447 16F4 629E 4BE1')
    expect(key.findAll('[aria-hidden=true]').map(group => group.text())).toEqual(['2447', '16F4', '629E', '4BE1'])
  })

  it('washes each digit it names', () => {
    const washed = drawn(() => cells(BEFORE, index => index > 13)).findAll('.bg-run\\/35')
    expect(washed.map(digit => digit.text())).toEqual(['E', '1'])
  })
})

describe('reels', () => {
  it('rolls each reel to its digit', () => {
    const strips = drawn(() => reels(AFTER, BEFORE, true)).findAll('span.absolute')
    expect(strips.map(strip => (strip.element as HTMLElement).style.transform).slice(-2))
      .toEqual(['translateY(-330px)', 'translateY(0px)'])
  })

  it('washes the reels the move turns and rolls them in turn', () => {
    const key    = drawn(() => reels(AFTER, BEFORE, true))
    const washed = key.findAll('.bg-run\\/22 > span')
    expect(washed.map(reel => (reel.element as HTMLElement).style.transitionDelay)).toEqual(['0ms', '22ms'])
  })

  it('washes no reel with no key before it', () => {
    expect(drawn(() => reels(AFTER, undefined, true)).findAll('.bg-run\\/22')).toHaveLength(0)
  })

  it('jumps each reel to its digit where the drawings hold still', () => {
    const strip = drawn(() => reels(AFTER, BEFORE, false)).find('span.absolute')
    expect(strip.classes()).not.toContain('transition-transform')
  })
})
