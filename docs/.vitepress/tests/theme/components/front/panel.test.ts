// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h, shallowRef }            from 'vue'

import type { Drive } from '../../../../lib/front/drive.ts'
import { Panel }      from '../../../../theme/components/front/panel.ts'

/**
 * Mounts a panel at its second step, holding a drawing, beside the drive it
 * reads.
 */
function paneled(): { drive: Drive, panel: ReturnType<typeof mount> } {
  const drive   = {
    at   : shallowRef(1),
    go   : vi.fn<(step: number) => void>(),
    hold : vi.fn<(held: boolean) => void>()
  }
  const readout = { big: '42', readings: [['Label', 'Value']], say: 'games shared' }
  const panel   = mount(Panel, {
    props : { drive, label: 'Steps', names: ['One', 'Two'], readout },
    slots : { default: () => h('svg', { class: 'drawn' }) }
  })
  return { drive, panel }
}

describe('Panel', () => {
  it("sets the drawing and the clock line on the Data widgets' plate", () => {
    const { panel } = paneled()
    expect(panel.find('.sc-data-plate .sc-data-big').text()).toBe('42')
    expect(panel.find('.sc-data-say').text()).toBe('games shared')
    expect(panel.find('.sc-front-draw svg.drawn').exists()).toBe(true)
    expect(panel.find('[role=slider]').attributes('aria-valuetext')).toBe('Two')
    expect(panel.find('.sc-data-read dd').text()).toContain('Value')
  })

  it.each([
    ['focusin', true], ['focusout', false], ['pointerenter', true], ['pointerleave', false]
  ] as const)('holds the drive on %s: %s', async (event, held) => {
    const { drive, panel } = paneled()
    await panel.trigger(event)
    expect(drive.hold).toHaveBeenCalledWith(held)
  })

  it('moves the drive to the step the clock line picks', async () => {
    const { drive, panel } = paneled()
    await panel.find('[role=slider]').trigger('keydown', { key: 'Home' })
    expect(drive.go).toHaveBeenCalledWith(0)
  })
})
