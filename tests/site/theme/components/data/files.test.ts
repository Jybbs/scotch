// @vitest-environment happy-dom
import { type DOMWrapper, type VueWrapper, flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi }                               from 'vitest'

import * as files       from '../../../../../docs/.vitepress/lib/data/files.ts'
import { Files }        from '../../../../../docs/.vitepress/theme/components/data/files.ts'
import { test }         from '../../../common/clock.ts'
import { pressed }      from '../../../common/keys.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { resized }      from '../../../common/size.ts'
import { onScreen }     from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

vi.mock('../../../../../docs/.vitepress/lib/data/files.ts', async original => ({
  ...await original<typeof import('../../../../../docs/.vitepress/lib/data/files.ts')>(),
  LISTED: (await import('../../../lib/data/fixtures/listed.ts')).SAMPLE_LISTED
}))

/**
 * Finds the bands of the Openings drawing, each a group round its shaded rect.
 */
function bands(list: VueWrapper): DOMWrapper<Element>[] {
  return list.findAll('svg g').filter(group => group.find('rect[fill-opacity]').exists())
}

/**
 * Reads the name the card shows.
 */
function shown(list: VueWrapper): string {
  return list.findAll('p').at(-1)!.text()
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
    expect(list.findAll('circle[style]')).toHaveLength(3)
    expect(shown(list)).toBe('Henry Bird')
    expect(list.find('p').text()).toBe(files.LEGENDS.Players)
    expect(list.find('label span').text()).toBe('14 files')
  })

  it('draws a taller drawing at a narrow width, and no drawing before the width is measured', () => {
    resized(390)
    expect(mount(Files).find('svg[role=group]').attributes('height')).toBe('200')
    resized(0)
    expect(mount(Files).find('svg[role=group]').exists()).toBe(false)
  })

  it('moves the card to the mark a pointer rests on and rings it', async () => {
    const list = mount(Files)
    await list.findAll('circle[style]').at(-1)!.trigger('pointerenter')
    expect(shown(list)).toBe('Magnus Carlsen')
    expect(list.findAll('[data-at]')).toHaveLength(1)
  })

  it('steps the card along the marks on the arrow keys', async () => {
    const list = mount(Files)
    const svg  = list.find('svg[role=group]').element
    expect(await pressed(svg, 'ArrowRight')).toBe(true)
    expect(shown(list)).toBe('Magnus Carlsen')
    expect(await pressed(svg, 'Tab')).toBe(false)
  })

  it('dims the marks the query passes over and tallies the rest', async () => {
    const list = mount(Files)
    await list.find('input').setValue('  MORPHY ')
    expect(list.findAll('[data-dim]')).toHaveLength(2)
    expect(list.find('label span').text()).toBe('1 of 3 Players')
    expect(list.findAll('[role="tab"] small').map(count => count.text())).toEqual(['1', '0', '0'])
  })
})

describe('Files, across the sections', () => {
  it('stacks the Events as bricks and opens on the latest World Championship', async () => {
    const list = mount(Files)
    await picked(list, 'Events')
    expect(list.findAll('rect[style]')).toHaveLength(4)
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
    expect(bands(list)).toHaveLength(7)
    expect(list.findAll('rect[style]')).toHaveLength(5)
    expect(list.findAll('text').at(-1)!.text()).toBe('All openings')
    expect(shown(list)).toBe('Bird')
  })

  it('opens a band on a press, at once while drawings hold still, and steps back on a second', async () => {
    reduceMotion()
    const list = mount(Files)
    await picked(list, 'Openings')
    await bands(list)[0]!.trigger('click')
    await flushPromises()
    expect(list.findAll('text').at(-1)!.text())
      .toBe('All openings  ›  1.e4   ·   press the open band to step back')
    await bands(list)[0]!.trigger('click')
    await flushPromises()
    expect(list.findAll('text').at(-1)!.text()).toBe('All openings')
  })

  it('moves the card to the busiest file under a band a pointer rests on', async () => {
    const list = mount(Files)
    await picked(list, 'Openings')
    await bands(list)[0]!.trigger('pointerenter')
    expect(shown(list)).toBe('Najdorf')
    await bands(list)[3]!.trigger('pointerenter')
    expect(shown(list)).toBe('Najdorf')
  })
})

describe('Files, as it comes into view', () => {
  test('unfolds its marks once, then stops', async ({ clock }) => {
    const report = onScreen()
    const list   = mount(Files)
    await report()
    expect(list.find('svg[data-unfold]').exists()).toBe(true)
    clock.advanceTimersByTime(1800)
    await flushPromises()
    expect(list.find('svg[data-unfold]').exists()).toBe(false)
  })

  it('holds still for a reader who prefers reduced motion', async () => {
    reduceMotion()
    const report = onScreen()
    const list   = mount(Files)
    await report()
    expect(list.find('svg[data-unfold]').exists()).toBe(false)
  })
})
