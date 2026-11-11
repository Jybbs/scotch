// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as files        from '../../../../lib/data/files.ts'
import { Rail }          from '../../../../theme/components/data/rail.ts'
import { reduceMotion }  from '../../../common/motion.ts'
import { onScreen }      from '../../../common/unfold.ts'
import { SAMPLE_LISTED } from '../../../lib/data/fixtures/listed.ts'

const entries = files.entriesOf(SAMPLE_LISTED)
const decades = files.decadesOf(files.sectionOf(entries, 'Players'))

/**
 * Mounts the card on the entry listed under `path`.
 */
function railed(path: string): ReturnType<typeof mount> {
  return mount(Rail, { props: { decades, entries, entry: at(path) } })
}

/**
 * Finds the entry listed under `path`.
 */
function at(path: string): files.Entry {
  return entries.find(entry => entry.listed.file === path)!
}

describe('Rail', () => {
  it('names a player over its games, its section, path, and decades, a cell per decade, and its twin', () => {
    const rail = railed('players/Bird.zip')
    expect(rail.find('.sc-data-rail-name').text()).toBe('Henry Bird')
    expect(rail.find('.sc-data-rail-top b').text()).toBe('8held')
    expect(rail.find('.sc-data-rail-sub').text()).toBe('Playersplayers/Bird.zip1850s–1880s')
    expect(rail.findAll('.sc-data-rail-cells i')).toHaveLength(decades.length)
    expect(rail.findAll('.sc-data-rail-scale span').map(span => span.text())).toEqual(['1850s', '1880s'])
    expect(rail.find('.sc-data-rail-tab').text()).toBe('Also underOpeningsopenings/Bird.zip40 held')
  })

  it('sets the first decade left of its cell and the last right of its where the two sit close', () => {
    const rail = railed('players/Carlsen.zip')
    expect(rail.findAll('.sc-data-rail-scale span').map(span => span.classes()))
      .toEqual([['sc-data-before'], ['sc-data-after']])
  })

  it('names a file no other section holds as only under its own', () => {
    expect(railed('events/Linares1994.pgn').find('.sc-data-rail-tab').text()).toBe('Only underEvents')
  })

  it('sets an opening’s moves in place of the cells, over its place among the Openings', () => {
    const rail = railed('openings/Najdorf.zip')
    expect(rail.find('.sc-data-rail-cells').exists()).toBe(false)
    expect(rail.findAll('.sc-data-rail-moves code').map(move => move.text()))
      .toEqual(['1.e4', 'c5', '2.Nf3', 'd6'])
    expect(rail.find('.sc-data-rank').text()).toBe('No. 1 of 5 by games held')
  })

  it('lifts its name, its sub line, and its tab into place on a new file, one after the other', async () => {
    onScreen()
    const rail = railed('players/Bird.zip')
    await rail.setProps({ entry: at('players/Morphy.zip') })
    const delays = vi.mocked(Element.prototype.animate).mock.calls
      .map(([, options]) => (options as KeyframeAnimationOptions).delay)
    expect(delays).toEqual([0, 60, 120])
  })

  it('holds still on a new file for a reader who prefers reduced motion', async () => {
    reduceMotion()
    onScreen()
    const rail = railed('players/Bird.zip')
    await rail.setProps({ entry: at('players/Morphy.zip') })
    expect(Element.prototype.animate).not.toHaveBeenCalled()
    expect(rail.find('.sc-data-rail-top b').text()).toBe('10held')
  })
})
