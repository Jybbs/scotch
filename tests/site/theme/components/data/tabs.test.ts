// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { Tabs }    from '../../../../../docs/.vitepress/theme/components/data/tabs.ts'
import { pressed } from '../../../common/keys.ts'

const PROPS = { controls: (name: string) => `panel-${name}`, label: 'Parts', names: ['a', 'b', 'c'], on: 'b' }

describe('Tabs', () => {
  it('draws a tab per name, the picked one the only stop for the keyboard', () => {
    const tabs = mount(Tabs, { props: PROPS }).findAll('[role="tab"]')
    const read = tabs.map(tab => [tab.text(), tab.attributes('tabindex'), tab.attributes('aria-controls')])
    expect(read).toEqual([
      ['a', '-1', 'panel-a'], ['b', '0', 'panel-b'], ['c', '-1', 'panel-c']
    ])
  })

  it.each([
    { key: 'ArrowRight', to: 'c' },
    { key: 'ArrowLeft', to: 'a' },
    { key: 'End', to: 'c' }
  ])('picks and focuses $to on $key', async ({ key, to }) => {
    const props = { ...PROPS, tabOf: (name: string) => `tab-${name}` }
    const bar   = mount(Tabs, { attachTo: document.body, props })
    expect(await pressed(bar.findAll('[role="tab"]')[1]!.element, key)).toBe(true)
    expect(bar.emitted('update:on')).toEqual([[to]])
    expect(document.activeElement?.id).toBe(`tab-${to}`)
    bar.unmount()
  })

  it('picks a tab on a press and leaves other keys alone', async () => {
    const bar = mount(Tabs, { props: PROPS })
    await bar.findAll('[role="tab"]')[0]!.trigger('click')
    expect(await pressed(bar.element, 'x')).toBe(false)
    expect(bar.emitted('update:on')).toEqual([['a']])
  })
})
