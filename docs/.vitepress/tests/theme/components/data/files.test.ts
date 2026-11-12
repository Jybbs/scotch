// @vitest-environment happy-dom
import { type VueWrapper, flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi }              from 'vitest'

import * as files       from '../../../../lib/data/files.ts'
import { Files }        from '../../../../theme/components/data/files.ts'
import { pressed }      from '../../../common/keys.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { resized }      from '../../../common/size.ts'
import { onScreen }     from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

vi.mock('../../../../lib/data/files.ts', async original => ({
  ...await original<typeof import('../../../../lib/data/files.ts')>(),
  LISTED: (await import('../../../lib/data/fixtures/listed.ts')).SAMPLE_LISTED
}))

/**
 * Reads the name the card shows.
 */
function shown(list: VueWrapper): string {
  return list.find('.sc-data-rail-name').text()
}

/**
 * Picks a section by its tab and waits for what it draws.
 */
async function picked(list: VueWrapper, section: files.Section): Promise<void> {
  await list.findAll('[role="tab"]').find(tab => tab.text().startsWith(section))!.trigger('click')
}

describe('Files', () => {
  it('opens on the Players, the archive under two sections on the card, a disc per dated archive', () => {
    const list = mount(Files)
    expect(list.findAll('[role="tab"]').map(tab => tab.text())).toEqual(['Players4', 'Events5', 'Openings5'])
    expect(list.find('[aria-selected="true"]').text()).toBe('Players4')
    expect(list.findAll('circle.sc-data-mark')).toHaveLength(3)
    expect(shown(list)).toBe('Henry Bird')
    expect(list.find('.sc-data-files-legend').text()).toBe(files.LEGENDS.Players)
    expect(list.find('.sc-data-files-find span').text()).toBe('14 files')
  })

  it('draws a taller drawing at a narrow width, and no drawing before the width is measured', () => {
    resized(390)
    expect(mount(Files).find('svg.sc-data-files-draw').attributes('height')).toBe('200')
    resized(0)
    expect(mount(Files).find('svg.sc-data-files-draw').exists()).toBe(false)
  })

  it('moves the card to the mark a pointer rests on and rings it', async () => {
    const list = mount(Files)
    await list.findAll('circle.sc-data-mark').at(-1)!.trigger('pointerenter')
    expect(shown(list)).toBe('Magnus Carlsen')
    expect(list.findAll('.sc-data-at')).toHaveLength(1)
  })

  it('steps the card along the marks on the arrow keys', async () => {
    const list = mount(Files)
    const svg  = list.find('svg.sc-data-files-draw').element
    expect(await pressed(svg, 'ArrowRight')).toBe(true)
    expect(shown(list)).toBe('Magnus Carlsen')
    expect(await pressed(svg, 'Tab')).toBe(false)
  })

  it('dims the marks the query passes over and tallies the rest', async () => {
    const list = mount(Files)
    await list.find('input').setValue('  MORPHY ')
    expect(list.findAll('.sc-data-dim')).toHaveLength(2)
    expect(list.find('.sc-data-files-find span').text()).toBe('1 of 3 Players')
    expect(list.findAll('[role="tab"] small').map(count => count.text())).toEqual(['1', '0', '0'])
  })
})

describe('Files, across the sections', () => {
  it('stacks the Events as bricks and opens on the latest World Championship', async () => {
    const list = mount(Files)
    await picked(list, 'Events')
    expect(list.findAll('rect.sc-data-mark')).toHaveLength(4)
    expect(shown(list)).toBe('Carlsen - Caruana 2018')
  })

  it('moves between the tabs on the arrow keys, Home, and End, and leaves another key alone', async () => {
    const list = mount(Files, { attachTo: document.body })
    const tabs = list.find('[role="tablist"]').element
    expect(await pressed(tabs, 'ArrowLeft')).toBe(true)
    expect(list.find('[aria-selected="true"]').text()).toBe('Openings5')
    expect(document.activeElement?.textContent).toBe('Openings5')
    await pressed(tabs, 'Home')
    expect(list.find('[aria-selected="true"]').text()).toBe('Players4')
    await pressed(tabs, 'End')
    expect(list.find('[aria-selected="true"]').text()).toBe('Openings5')
    expect(await pressed(tabs, 'Enter')).toBe(false)
    list.unmount()
  })
})

describe('Files, on the Openings', () => {
  it('draws a band per first move and reply and a mark per file, beside the trail', async () => {
    const list = mount(Files)
    await picked(list, 'Openings')
    expect(list.findAll('.sc-data-band')).toHaveLength(7)
    expect(list.findAll('rect.sc-data-mark')).toHaveLength(5)
    expect(list.findAll('text').at(-1)!.text()).toBe('All openings')
    expect(shown(list)).toBe('Bird')
  })

  it('opens a band on a press, at once while drawings hold still, and steps back on a second', async () => {
    reduceMotion()
    const list = mount(Files)
    await picked(list, 'Openings')
    await list.findAll('.sc-data-band')[0]!.trigger('click')
    await flushPromises()
    expect(list.findAll('text').at(-1)!.text())
      .toBe('All openings  ›  1.e4   ·   press the open band to step back')
    await list.findAll('.sc-data-band')[0]!.trigger('click')
    await flushPromises()
    expect(list.findAll('text').at(-1)!.text()).toBe('All openings')
  })

  it('moves the card to the busiest file under a band a pointer rests on', async () => {
    const list = mount(Files)
    await picked(list, 'Openings')
    await list.findAll('.sc-data-band')[0]!.trigger('pointerenter')
    expect(shown(list)).toBe('Najdorf')
    await list.findAll('.sc-data-band')[3]!.trigger('pointerenter')
    expect(shown(list)).toBe('Najdorf')
  })
})

describe('Files, as it comes into view', () => {
  it('unfolds its marks once, then stops', async () => {
    vi.useFakeTimers()
    const report = onScreen()
    const list   = mount(Files)
    await report()
    expect(list.find('.sc-data-unfold').exists()).toBe(true)
    vi.advanceTimersByTime(1800)
    await flushPromises()
    expect(list.find('.sc-data-unfold').exists()).toBe(false)
    vi.useRealTimers()
  })

  it('holds still for a reader who prefers reduced motion', async () => {
    reduceMotion()
    const report = onScreen()
    const list   = mount(Files)
    await report()
    expect(list.find('.sc-data-unfold').exists()).toBe(false)
  })
})
