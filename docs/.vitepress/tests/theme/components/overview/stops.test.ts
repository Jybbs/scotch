// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { OVERVIEW_WIDGETS } from '../../../../theme/components/overview/index.ts'
import { Stops }            from '../../../../theme/components/overview/stops.ts'

const picked = (wrapper: ReturnType<typeof mount>): string =>
  wrapper.find('[aria-selected=true]').attributes('aria-label')!
/**
 * Reads the text of each button naming the stop before or after the one
 * picked.
 */
const goes = (wrapper: ReturnType<typeof mount>): string[] =>
  wrapper.findAll('button:not([role])').map(one => one.text())

describe('Stops as drawn', () => {
  it('opens on the stop where the demo game meets its match', () => {
    const wrapper = mount(Stops)
    expect(picked(wrapper)).toBe('Position Keys')
    expect(wrapper.text()).toContain('Step 3 of 5 · Position Keys')
  })

  it('links the question of the stop picked to its page', () => {
    const link = mount(Stops).find('a')
    expect(link.attributes('href')).toBe('/methods/keys')
    expect(link.text()).toBe('What does a key cover, and how often do two positions share one by accident?')
  })

  it('names the stops before and after the one picked', () => {
    expect(goes(mount(Stops)))
      .toEqual(['← Stop before2 · Building the Index', 'Next stop →4 · The Longest Run'])
  })

  it('leads the stop picked down from its station in the run\'s color', () => {
    const leads = mount(Stops).findAll('svg.h-5 path').map(path => path.classes().includes('stroke-run'))
    expect(leads).toEqual([false, false, true, false, false])
  })
})

describe('Stops as stepped', () => {
  it('picks a stop once its station is pressed', async () => {
    const wrapper = mount(Stops)
    await wrapper.findAll('[role=tab]')[0]!.trigger('click')
    expect(picked(wrapper)).toBe('Reading a Game')
    expect(goes(wrapper)).toEqual(['Next stop →2 · Building the Index'])
  })

  it('moves to the next stop through its button', async () => {
    const wrapper = mount(Stops)
    await wrapper.findAll('button:not([role])')[1]!.trigger('click')
    expect(picked(wrapper)).toBe('The Longest Run')
  })

  it.each([
    ['ArrowRight', 'The Longest Run'], ['ArrowLeft', 'Building the Index'],
    ['End', 'Matches the Rule Passes Over'], ['Home', 'Reading a Game']
  ])('steps on %s to %s and moves the focus there', async (key, title) => {
    const wrapper = mount(Stops, { attachTo: document.body })
    await wrapper.find('[role=tablist]').trigger('keydown', { key })
    expect(picked(wrapper)).toBe(title)
    expect(document.activeElement?.getAttribute('aria-label')).toBe(title)
    wrapper.unmount()
  })

  it('leaves a key the steps do not answer to the page', async () => {
    const wrapper = mount(Stops)
    await wrapper.find('[role=tablist]').trigger('keydown', { key: 'Tab' })
    expect(picked(wrapper)).toBe('Position Keys')
  })

  it('stands the board on the stored game at the parting', async () => {
    const wrapper = mount(Stops)
    await wrapper.find('[role=tablist]').trigger('keydown', { key: 'End' })
    expect(wrapper.findAll('[role=img]').at(-1)!.attributes('aria-label')).toBe('The stored game at ply 43')
  })
})

describe('OVERVIEW_WIDGETS', () => {
  it('loads the stops with the page placing them', async () => {
    const widget = mount(defineComponent({ setup: () => () => h(OVERVIEW_WIDGETS.stops!) }))
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(widget.find('[role=tablist]').exists()).toBe(true)
  })
})
