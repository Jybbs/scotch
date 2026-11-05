// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { stacked, stepper } from '../../../../theme/components/reference/parts.ts'

function drawn(render: () => ReturnType<typeof h>): ReturnType<typeof mount> {
  return mount(defineComponent({ setup: () => render }))
}

describe('stacked', () => {
  it('shows the state at its place and hides every other from a screen reader', () => {
    const states = drawn(() => stacked(['one', 'two', 'three'], 1)).findAll('.sc-ref-stack > div')
    expect(states.map(state => state.attributes('data-at') !== undefined)).toEqual([false, true, false])
    expect(states.map(state => state.attributes('aria-hidden'))).toEqual(['true', undefined, 'true'])
  })
})

describe('stepper', () => {
  const NAMES = ['one', 'two', 'three']

  it('reads the place and the name it stands on', () => {
    expect(drawn(() => stepper({ at: 1, names: NAMES, pick: vi.fn<(index: number) => void>() })).find('output').text()).toBe('2 of 3 · two')
  })

  it('wraps at either end', async () => {
    const pick    = vi.fn<(index: number) => void>()
    const buttons = drawn(() => stepper({ at: 0, names: NAMES, pick })).findAll('.sc-ref-button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(pick.mock.calls).toEqual([[2], [1]])
  })

  it('marks the place on its dots, those before it as seen, and picks the dot a reader presses', async () => {
    const pick = vi.fn<(index: number) => void>()
    const dots = drawn(() => stepper({ at: 1, names: NAMES, pick })).findAll('.sc-ref-dots button')
    expect(dots[0]!.attributes('data-seen')).toBe('')
    expect(dots[1]!.attributes('aria-current')).toBe('step')
    expect(dots[2]!.attributes('data-seen')).toBeUndefined()
    await dots[2]!.trigger('click')
    expect(pick).toHaveBeenCalledWith(2)
  })

  it('draws the cells it is given in place of the dots', () => {
    const step = drawn(() => stepper({ at: 0, cell: index => h('i', String(index)), names: NAMES, pick: vi.fn<(index: number) => void>() }))
    expect(step.find('.sc-ref-dots').exists()).toBe(false)
    expect(step.findAll('.sc-ref-cells i').map(cell => cell.text())).toEqual(['0', '1', '2'])
  })
})
