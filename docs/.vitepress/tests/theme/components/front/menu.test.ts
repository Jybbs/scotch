// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as studying from '../../../../lib/front/studying.ts'
import { Menu }      from '../../../../theme/components/front/menu.ts'
import { pressed }   from '../../../common/keys.ts'

describe('Menu', () => {
  it('lists each run beside the section it answers and opens on the first run printed whole', () => {
    const drawn = mount(Menu)
    expect(drawn.findAll('.sc-menu-say').map(say => say.text())).toEqual(
      studying.RUNS.map(({ heading }) => `-- ${heading.toLowerCase()}`)
    )
    expect(drawn.findAll('.sc-menu-run .sc-front-out')).toHaveLength(studying.RUNS[0]!.lines.length)
    expect(drawn.find('.sc-menu-run [data-answer]').exists()).toBe(true)
    expect(drawn.find('.sc-menu-program').text()).toBe('scotch')
  })

  it('types a picked run into the screen and keeps its last line in view', async () => {
    vi.useFakeTimers()
    const drawn  = mount(Menu, { attachTo: document.body })
    const screen = drawn.find('.sc-menu-run').element
    const scroll = vi.fn<(options?: ScrollToOptions) => void>()
    screen.scrollTo = scroll as typeof screen.scrollTo
    Object.defineProperty(screen, 'scrollHeight', { value: 480 })
    await drawn.findAll('.sc-menu-choice')[4]!.trigger('click')
    await vi.runAllTimersAsync()
    expect(drawn.find('.sc-menu-run').attributes('aria-label')).toBe(studying.RUNS[4]!.heading)
    expect(drawn.find('.sc-menu-lines').classes()).toContain('is-columns')
    expect(scroll).toHaveBeenLastCalledWith({ top: 480 })
    vi.useRealTimers()
    drawn.unmount()
  })

  it('moves the menu’s stop by the up and down keys, wrapping', async () => {
    const drawn   = mount(Menu, { attachTo: document.body })
    const choices = drawn.findAll('.sc-menu-choice')
    expect(await pressed(choices[0]!.element, 'ArrowUp')).toBe(true)
    expect(document.activeElement).toBe(choices.at(-1)!.element)
    expect(choices.at(-1)!.attributes('aria-current')).toBe('true')
    expect(await pressed(choices[0]!.element, 'ArrowLeft')).toBe(false)
    drawn.unmount()
  })
})
