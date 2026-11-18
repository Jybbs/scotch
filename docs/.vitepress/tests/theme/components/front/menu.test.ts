// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as studying from '../../../../lib/front/studying.ts'
import { Menu }      from '../../../../theme/components/front/menu.ts'
import { test }      from '../../../common/clock.ts'
import { pressed }   from '../../../common/keys.ts'

describe('Menu', () => {
  it('lists each run beside the section it answers and opens on the first run printed whole', () => {
    const drawn = mount(Menu)
    expect(drawn.findAll('button > span:last-child').map(say => say.text())).toEqual(
      studying.RUNS.map(({ heading }) => `-- ${heading.toLowerCase()}`)
    )
    expect(drawn.findAll("[role='region'] [data-out]")).toHaveLength(studying.RUNS[0]!.lines.length)
    expect(drawn.find("[role='region'] [data-answer]").exists()).toBe(true)
    expect(drawn.find("[data-kind='program']").text()).toBe('scotch')
  })

  test('types a picked run into the screen and keeps its last line in view', async ({ clock }) => {
    const drawn  = mount(Menu, { attachTo: document.body })
    const screen = drawn.find("[role='region']").element
    const scroll = vi.fn<(options?: ScrollToOptions) => void>()
    screen.scrollTo = scroll as typeof screen.scrollTo
    Object.defineProperty(screen, 'scrollHeight', { value: 480 })
    await drawn.findAll("[role='group'] button")[4]!.trigger('click')
    await clock.runAllTimersAsync()
    expect(drawn.find("[role='region']").attributes('aria-label')).toBe(studying.RUNS[4]!.heading)
    expect(drawn.find('[data-columns]').exists()).toBe(true)
    expect(scroll).toHaveBeenLastCalledWith({ top: 480 })
    drawn.unmount()
  })

  it('moves the menu’s stop by the up and down keys, wrapping', async () => {
    const drawn   = mount(Menu, { attachTo: document.body })
    const choices = drawn.findAll("[role='group'] button")
    expect(await pressed(choices[0]!.element, 'ArrowUp')).toBe(true)
    expect(document.activeElement).toBe(choices.at(-1)!.element)
    expect(choices.at(-1)!.attributes('aria-current')).toBe('true')
    expect(await pressed(choices[0]!.element, 'ArrowLeft')).toBe(false)
    drawn.unmount()
  })
})
