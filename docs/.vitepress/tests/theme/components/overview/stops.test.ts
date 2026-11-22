// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h }       from 'vue'

import { TRACK }            from '../../../../lib/methods/runs.ts'
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
    ['ArrowDown', 'The Longest Run'], ['ArrowUp', 'Building the Index'],
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

describe('Stops at each stop', () => {
  it.each([
    [0, 'The demo game at ply 107', 0],
    [1, 'The demo game at ply 0', 0],
    [2, 'The demo game at ply 7', 7],
    [3, 'The demo game at ply 42', 25],
    [4, 'The stored game at ply 43', 43]
  ])('stands stop %i at its board and its marker', async (index, board, ply) => {
    const wrapper = mount(Stops)
    await wrapper.findAll('[role=tab]')[index]!.trigger('click')
    expect(wrapper.findAll('[role=img]').at(-1)!.attributes('aria-label')).toBe(board)
    const rider = wrapper.find('circle.fill-ink').element as SVGElement
    expect(rider.style.transform.startsWith(`translate(${ply * TRACK.step}px, `)).toBe(true)
  })

  it.each([
    [0, 'p12', 'translate(400%, 500%)', '54. Qc1#'],
    [1, 'p11', 'translate(300%, 600%)', 'Start'],
    [2, 'p11', 'translate(300%, 400%)', '4. d4'],
    [3, 'p5', 'translate(300%, 500%)', '21...b6'],
    [4, 'p5', 'translate(200%, 600%)', '22. Bc2']
  ])('sets stop %i\'s pieces and its move at its ply', async (index, id, square, move) => {
    const wrapper = mount(Stops)
    await wrapper.findAll('[role=tab]')[index]!.trigger('click')
    const piece = wrapper.findAll('[role=img]').at(-1)!.find(`[data-id='${id}']`).element as HTMLElement
    expect(piece.style.transform).toBe(square)
    expect(wrapper.find('.tabular-nums').text()).toBe(move)
  })

  it('names the run under the track', () => {
    expect(mount(Stops).text()).toContain('Run of 36')
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
