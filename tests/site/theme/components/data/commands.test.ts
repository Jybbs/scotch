// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { Commands } from '../../../../../docs/.vitepress/theme/components/data/commands.ts'
import { pressed }  from '../../../common/keys.ts'

/**
 * Reads the label of each reading beneath the grid.
 */
function readings(grid: ReturnType<typeof mount>): string[] {
  return grid.findAll('dl dt').map(label => label.text())
}

describe('Commands', () => {
  it('draws a row per command under its verb and a mark where it writes or reads a file', () => {
    const grid = mount(Commands)
    expect(grid.findAll('tbody th[scope="row"]')).toHaveLength(8)
    expect(grid.findAll('td[data-kind="writes"]')).toHaveLength(5)
    expect(grid.findAll('td[data-kind="reads"]')).toHaveLength(22)
    expect(grid.find('td[data-kind] span').text())
      .toBe('scotch fetch games writes downloads/www.pgnmentor.com/')
    expect(grid.findAll('thead th[scope=colgroup]').map(folder => folder.text()))
      .toEqual(['downloads/1.1 GB', 'index/459.9 MB'])
  })

  it('lights the rows a verb tab picks and moves between the tabs by the arrow keys', async () => {
    const grid = mount(Commands, { attachTo: document.body })
    const tabs = grid.findAll('[role="tab"]')
    await tabs[3]!.trigger('click')
    expect(grid.findAll('tbody[data-in]')).toHaveLength(1)
    expect(grid.find('dl dd').text()).toBe('2')
    expect(await pressed(tabs[3]!.element, 'ArrowRight')).toBe(true)
    expect(document.activeElement?.textContent).toContain('show')
    expect(await pressed(tabs[4]!.element, 'a')).toBe(false)
    grid.unmount()
  })

  it.each([
    { aim: 'thead th[scope=col]', read: ['File', 'Written by', 'Read by', 'Folder'] },
    { aim: 'td[data-kind]', read: ['Command', 'File', 'Does', 'Folder'] },
    { aim: 'tbody th[scope="row"]', read: ['Command', 'Writes', 'Reads', 'Touches'] }
  ])('reads out what $aim names while the pointer rests on it', async ({ aim, read }) => {
    const grid = mount(Commands)
    await grid.get(aim).trigger('pointerenter')
    expect(readings(grid)).toEqual(read)
    expect(grid.findAll('[data-on]').length).toBeGreaterThan(0)
    await grid.get(aim).trigger('pointerleave')
    expect(readings(grid)).toEqual(['Commands', 'Writes', 'Reads', 'Touches'])
  })

  it('reads out the header the focus rests on until it leaves', async () => {
    const grid = mount(Commands)
    await grid.get('thead th[scope=col]').trigger('focus')
    expect(readings(grid)).toEqual(['File', 'Written by', 'Read by', 'Folder'])
    await grid.get('thead th[scope=col]').trigger('blur')
    expect(readings(grid)).toEqual(['Commands', 'Writes', 'Reads', 'Touches'])
  })
})
