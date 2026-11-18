// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as sieve                    from '../../../../lib/data/sieve.ts'
import { Sieve }                     from '../../../../theme/components/data/sieve.ts'
import { test }                      from '../../../common/clock.ts'
import { pressed }                   from '../../../common/keys.ts'
import { pauseMotion, reduceMotion } from '../../../common/motion.ts'
import { onScreen }                  from '../../../common/unfold.ts'

describe('Sieve', () => {
  test('plays through its steps once in view and rests on the stored games', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Sieve)
    const rail  = drawn.find('[role="slider"]')
    expect(rail.attributes('aria-valuenow')).toBe('1')
    await show()
    await clock.runAllTimersAsync()
    expect(rail.attributes('aria-valuenow')).toBe(String(sieve.STEPS.length))
    const gone = sieve.SQUARES.filter(kind => kind !== 'stored')
    expect(drawn.findAll('.sc-sieve-cell[data-gone]')).toHaveLength(gone.length)
  })

  test('holds still on the step the reader moves to, by the keys or the pointer', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Sieve)
    const rail  = drawn.find('[role="slider"]')
    expect(await pressed(rail.element, 'End')).toBe(true)
    expect(await pressed(rail.element, 'ArrowLeft')).toBe(true)
    expect(await pressed(rail.element, 'ArrowUp')).toBe(false)
    await show()
    await clock.runAllTimersAsync()
    expect(rail.attributes('aria-valuenow')).toBe('3')
    vi.spyOn(rail.element, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 300 } as DOMRect)
    rail.element.setPointerCapture = vi.fn<() => void>()
    rail.element.hasPointerCapture = vi.fn<() => boolean>().mockReturnValueOnce(true).mockReturnValue(false)
    await rail.trigger('pointerdown', { clientX: 0, pointerId: 1 })
    expect(rail.attributes('aria-valuenow')).toBe('1')
    await rail.trigger('pointermove', { clientX: 200, pointerId: 1 })
    await rail.trigger('pointermove', { clientX: 300, pointerId: 1 })
    expect(rail.attributes('aria-valuetext')).toBe(`${sieve.STEPS[2]!.name}: ${sieve.STEPS[2]!.say}`)
  })

  it('rests on the stored games while the site’s drawings hold still', () => {
    reduceMotion()
    expect(mount(Sieve).find('[role="slider"]').attributes('aria-valuenow')).toBe(String(sieve.STEPS.length))
  })
})

describe('Sieve under a pause', () => {
  test('goes to the stored games once the reader pauses the drawings mid-play', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Sieve)
    await show()
    await pauseMotion()
    expect(drawn.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(sieve.STEPS.length))
    expect(clock.getTimerCount()).toBe(0)
  })
})
