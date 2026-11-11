// @vitest-environment happy-dom
import { mount }                              from '@vue/test-utils'
import { type Mock, describe, expect, it, vi } from 'vitest'

import { Clock }   from '../../../../theme/components/front/clock.ts'
import { pressed } from '../../../common/keys.ts'

const NAMES = ['One', 'Two', 'Three', 'Four', 'Five']

/**
 * Mounts the clock line at a step, a box 400 pixels wide, beside the pick its
 * presses call.
 */
function clocked(at = 2): { line: HTMLElement, pick: Mock<(step: number) => void> } {
  const pick  = vi.fn<(step: number) => void>()
  const props = { at, label: 'Steps', names: NAMES, pick }
  const line  = mount(Clock, { attachTo: document.body, props }).element as HTMLElement
  vi.spyOn(line, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 400, 20))
  line.setPointerCapture = vi.fn<(id: number) => void>()
  return { line, pick }
}

describe('Clock as drawn', () => {
  it('names the step in view as the ARIA slider pattern sets out', () => {
    const { line } = clocked()
    expect(line.getAttribute('role')).toBe('slider')
    expect(['valuemin', 'valuemax', 'valuenow', 'valuetext'].map(name => line.getAttribute(`aria-${name}`)))
      .toEqual(['1', '5', '3', 'Three'])
    expect(line.querySelector('span')!.textContent).toBe('Three')
  })

  it('marks each tick played so far and fills the line to the step in view', () => {
    const { line } = clocked()
    expect([...line.querySelectorAll('i')].map(tick => 'on' in tick.dataset))
      .toEqual([true, true, true, false, false])
    expect(line.style.getPropertyValue('--sc-front-clock')).toBe('50%')
  })

  it('fills the whole line where it holds one step', () => {
    const line = mount(Clock, { props: { at: 0, label: 'Steps', names: ['One'], pick: vi.fn<(step: number) => void>() } }).element
    expect((line as HTMLElement).style.getPropertyValue('--sc-front-clock')).toBe('100%')
  })

})

describe('Clock under input', () => {
  it.each([
    ['ArrowRight', 3], ['ArrowUp', 3], ['ArrowLeft', 1], ['ArrowDown', 1], ['Home', 0], ['End', 4]
  ] as const)('moves on %s to step %i', async (key, step) => {
    const { line, pick } = clocked()
    expect(await pressed(line, key)).toBe(true)
    expect(pick).toHaveBeenCalledWith(step)
  })

  it('holds a press past either end at that end', async () => {
    const { line, pick } = clocked(4)
    await pressed(line, 'ArrowRight')
    expect(pick).toHaveBeenCalledWith(4)
  })

  it('leaves a key it does not answer to the browser', async () => {
    const { line, pick } = clocked()
    expect(await pressed(line, 'a')).toBe(false)
    expect(pick).not.toHaveBeenCalled()
  })

  it('picks the step under a press and follows a drag until the pointer lifts', () => {
    const { line, pick } = clocked()
    line.dispatchEvent(new PointerEvent('pointermove', { clientX: 500 }))
    expect(pick).not.toHaveBeenCalled()
    line.dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, pointerId: 1 }))
    line.dispatchEvent(new PointerEvent('pointermove', { clientX: 600 }))
    line.dispatchEvent(new PointerEvent('pointerup'))
    line.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }))
    expect(pick.mock.calls).toEqual([[1], [4]])
    expect(line.setPointerCapture).toHaveBeenCalledWith(1)
  })
})
