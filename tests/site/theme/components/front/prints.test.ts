// @vitest-environment happy-dom
import { flushPromises, mount }            from '@vue/test-utils'
import { afterEach, describe, expect, vi } from 'vitest'

import { Prints }       from '../../../../../docs/.vitepress/theme/components/front/prints.ts'
import { homed, test }  from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementVisibility: () => ({ value: true })
}))

afterEach(() => {
  sessionStorage.clear()
})

describe('Prints', () => {
  test("draws each position's key as 16 digits, a track per game", async () => {
    const prints = mount(Prints)
    await flushPromises()
    const tracks = prints.findAll('div[data-game]')
    expect(tracks.map(each => each.attributes('data-game'))).toEqual(['submitted', 'stored'])
    expect(tracks[0]!.findAll('span[title]')[0]!.findAll('i')).toHaveLength(16)
    expect(tracks[0]!.find('span[title]').attributes('title'))
      .toMatch(/^Your game, ply 0, 0x[\da-f]{16}$/u)
  })

  test('ties the shared positions and spans the run once the clock passes it', async () => {
    reduceMotion()
    const prints = mount(Prints)
    await flushPromises()
    expect(prints.findAll('div[aria-hidden] > i[data-on]')).toHaveLength(7)
    expect(prints.find('div[aria-hidden] > b').attributes('data-on')).toBe('')
    expect(prints.find('div[aria-hidden] > b + span').text()).toBe('The run · 6')
    expect(prints.find('[data-spoken]').text()).toBe('6')
    expect(prints.find('[data-unit]').text()).toBe('positions shared')
  })

  test('moves to the ply a fingerprint is pressed on', async () => {
    const prints = mount(Prints)
    await flushPromises()
    await prints.findAll('div[data-game]')[1]!.findAll('span[title]')[7]!.trigger('click')
    expect(prints.find('[role=slider]').attributes('aria-valuetext')).toBe('Ply 7')
    expect(prints.findAll('dl dd').map(value => value.text()).at(-1)).toBe('Equal')
  })

  test('steps a ply at a time on the clock', async ({ clock }) => {
    const prints = mount(Prints)
    await flushPromises()
    await homed(prints)
    clock.advanceTimersByTime(650)
    await flushPromises()
    expect(prints.find('[role=slider]').attributes('aria-valuetext')).toBe('Ply 1')
    expect(prints.findAll('dl dd').map(value => value.text()).at(-1)).toBe('Differ')
  })
})
