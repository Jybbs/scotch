// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import * as numbers   from '../../../../lib/data/numbers.ts'
import * as omitted   from '../../../../lib/data/omitted.ts'
import { GameLedger } from '../../../../theme/components/data/ledger.ts'
import { pressed }    from '../../../common/keys.ts'

const sections = omitted.OMISSIONS.sections
const openings = sections.find(({ section }) => section === 'Openings')!

describe('GameLedger', () => {
  it('draws a bar per section and a segment per count, pressing the Openings games under the floor', () => {
    const drawn = mount(GameLedger)
    expect(drawn.findAll('.sc-data-ledger-section').length).toBe(sections.length)
    expect(drawn.findAll('.sc-data-ledger-segment').length).toBe(omitted.segments.length)
    expect(drawn.find('[aria-pressed="true"]').attributes('data-k')).toBe('below')
    expect(drawn.find('.sc-data-big').text()).toBe(numbers.counted(openings.below))
    expect(drawn.find('.sc-data-say').text()).toBe(omitted.ledgerSentence('below', openings))
  })

  it('names the pressed count and lists the files behind it in the drawer', async () => {
    const drawn   = mount(GameLedger)
    const players = sections.find(({ section }) => section === 'Players')!
    const files   = omitted.holding('repeat', 'Players')
    await drawn.find('.sc-data-ledger-segment[data-k="repeat"]').trigger('click')
    expect(drawn.find('.sc-data-say').text()).toBe(omitted.ledgerSentence('repeat', players))
    expect(drawn.findAll('.sc-data-drawer-files li').length).toBe(files.length)
    expect(drawn.find('summary').text()).toContain(numbers.counted(files.length))
  })

  it('presses the segment beside it on an arrow key and focuses it, and answers no other key', async () => {
    const drawn    = mount(GameLedger, { attachTo: document.body })
    const segments = () => drawn.findAll('.sc-data-ledger-segment')
    const at       = () => segments().findIndex(segment => segment.attributes('aria-pressed') === 'true')
    const start    = at()
    expect(await pressed(segments()[start]!.element, 'ArrowLeft')).toBe(true)
    await flushPromises()
    expect(at()).toBe(start - 1)
    expect(document.activeElement).toBe(segments()[start - 1]!.element)
    expect(await pressed(segments()[at()]!.element, 'ArrowRight')).toBe(true)
    expect(at()).toBe(start)
    expect(await pressed(segments()[at()]!.element, 'Enter')).toBe(false)
    drawn.unmount()
  })

  it('dims every segment but the kind a corner mark lights', async () => {
    const drawn = mount(GameLedger)
    await drawn.find('.sc-data-mark').trigger('pointerenter')
    const off = drawn.findAll('.sc-data-ledger-segment').filter(segment => segment.classes('sc-data-off'))
    expect(off.every(segment => segment.attributes('data-k') !== 'kept')).toBe(true)
    expect(off.length).toBe(omitted.segments.filter(({ kind }) => kind !== 'kept').length)
    await drawn.find('.sc-data-mark').trigger('pointerleave')
    expect(drawn.findAll('.sc-data-off').length).toBe(0)
  })
})
