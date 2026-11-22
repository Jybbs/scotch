// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick }             from 'vue'

import { PACE }                      from '../../../../lib/methods/stepping.ts'
import { Run }                       from '../../../../theme/components/methods/run.ts'
import { test }                      from '../../../common/clock.ts'
import { pauseMotion, reduceMotion } from '../../../common/motion.ts'

/**
 * Mounts the widget holding still, as a reader preferring reduced motion
 * meets it.
 */
function still(): ReturnType<typeof mount<typeof Run>> {
  reduceMotion()
  return mount(Run)
}

const status = (wrapper: ReturnType<typeof mount<typeof Run>>): string => wrapper.find('[role=status]').text()

describe('Run as drawn', () => {
  it('opens inside the run where the drawings hold still', () => {
    const wrapper = still()
    expect(status(wrapper)).toBe('Ply 12 · one position, 6 in a row')
    expect(wrapper.find('[aria-live]').text()).toBe('6')
  })

  it('opens on the start and plays where the drawings move', () => {
    const wrapper = mount(Run)
    expect(status(wrapper)).toBe('Ply 0 · one position, 1 in a row')
    expect(wrapper.find('[aria-pressed=true]').text()).toBe('Pause')
  })

  it('names the run the match counts under the track', () => {
    expect(still().text()).toContain('Run of 11 · plies 7 to 17')
  })

  it('names the stored game as the page names it', () => {
    expect(still().text()).toContain('Timman – Klein, 2015')
  })

  it('fills the meter to the count in a row, of the longest run', () => {
    const meter = still().findAll('i.bg-run')
    expect(meter).toHaveLength(6)
    expect(still().text()).toContain('Of 11, the longest run the two games share')
  })

  it('writes each game\'s move at the ply in view', async () => {
    const wrapper = still()
    await wrapper.findAll('svg rect')[7]!.trigger('click')
    const moves = wrapper.findAll('.tabular-nums').map(node => node.text())
    expect(moves).toContain('4. e4')
    expect(moves).toContain('4. d4')
  })

  it('names the last ply under the track', () => {
    expect(still().text()).toContain('Ply 18')
  })

  it('stamps one position under the board while the two games share it', () => {
    expect(still().text()).toContain('One position')
  })
})

describe('Run as stepped', () => {
  it('steps back and on through its buttons', async () => {
    const wrapper = still()
    const [, back, next] = wrapper.findAll('button')
    await back!.trigger('click')
    expect(status(wrapper)).toBe('Ply 11 · one position, 5 in a row')
    await next!.trigger('click')
    await next!.trigger('click')
    expect(status(wrapper)).toBe('Ply 13 · one position, 7 in a row')
  })

  it('names the washes the board shows once the two games stand apart', async () => {
    const wrapper = still()
    await wrapper.findAll('svg rect')[6]!.trigger('click')
    expect(status(wrapper)).toBe('Ply 6 · two positions')
    expect(wrapper.text()).toContain('Line alone')
    expect(wrapper.text()).toContain('Stored alone')
  })

  it('names the parting once past the run', async () => {
    const wrapper = still()
    await wrapper.findAll('svg rect')[18]!.trigger('click')
    expect(status(wrapper)).toBe('Ply 18 · they part')
    expect(wrapper.find('[aria-live]').text()).toBe('0')
    expect(wrapper.text()).toContain('Positions differ, the count starts over')
  })

  test('plays a ply on each interval while the drawings move', async ({ clock }) => {
    const wrapper = mount(Run)
    await nextTick()
    clock.advanceTimersByTime(PACE.interval * 7)
    await nextTick()
    expect(status(wrapper)).toBe('Ply 7 · one position, 1 in a row')
  })

  it('stops playing once the reader pauses the motion switch', async () => {
    const wrapper = mount(Run)
    await pauseMotion()
    expect(wrapper.find('button').text()).toBe('Play')
  })
})

describe('Run at a picked ply', () => {
  it('washes each square the stored game differs on, on the line\'s board', async () => {
    const wrapper = still()
    await wrapper.findAll('svg rect')[6]!.trigger('click')
    const marked = wrapper.findAll('i[data-mark]').map(square => square.attributes('data-mark'))
    expect(marked.toSorted()).toEqual(['stored', 'stored', 'submitted', 'submitted'])
    expect((wrapper.find("[data-id='11']").element as HTMLElement).style.transform).toBe('translate(300%, 400%)')
  })

  it('heads the count as the first shared position where a run begins', async () => {
    const wrapper = still()
    await wrapper.findAll('svg rect')[7]!.trigger('click')
    expect(wrapper.text()).toContain('Position shared, the first in a row')
  })

  it.each([[0, 1], [18, 2]])('quiets the button stepping past ply %i', async (ply, button) => {
    const wrapper = still()
    await wrapper.findAll('svg rect')[ply]!.trigger('click')
    expect(wrapper.findAll('button').map(one => one.attributes('disabled') !== undefined))
      .toEqual([false, button === 1, button === 2])
  })
})
