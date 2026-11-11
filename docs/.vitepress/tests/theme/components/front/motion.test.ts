// @vitest-environment happy-dom
import { flushPromises, mount }            from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import { MotionSwitch } from '../../../../theme/components/front/motion.ts'

afterEach(() => {
  sessionStorage.clear()
})

describe('MotionSwitch', () => {
  it('reads as a switch, on while the drawings move', async () => {
    const button = mount(MotionSwitch)
    await flushPromises()
    expect(button.attributes()).toMatchObject({
      'aria-checked' : 'true',
      'aria-label'   : 'Moving drawings',
      'role'         : 'switch',
      'title'        : 'Pause the moving drawings'
    })
    expect(button.find('path').attributes('d')).toMatch(/c/u)
  })

  it('pauses the drawings on a press, drawing a level line', async () => {
    const button = mount(MotionSwitch)
    await flushPromises()
    await button.trigger('click')
    expect(button.attributes('aria-checked')).toBe('false')
    expect(button.attributes('title')).toBe('Play the moving drawings')
    expect(button.find('path').attributes('d')).toBe('M3 8h10')
  })
})
