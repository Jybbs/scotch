// @vitest-environment happy-dom
import { mount }                               from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EXAMPLES } from '../../../../lib/viewer/examples.ts'
import { Loaded }   from '../../../../lib/viewer/loaded.ts'
import { Controls } from '../../../../theme/components/viewer/controls.ts'

const loaded = new Loaded(EXAMPLES.match)
/**
 * The calls the controls hand the resize observer, which a case makes in place
 * of a browser resizing the row or its column.
 */
const observed = vi.hoisted((): (() => void)[] => [])

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useResizeObserver: (_: unknown, callback: () => void) => {
    observed.push(callback)
  }
}))

/**
 * Mounts the controls at a cursor, the boards facing a side.
 */
function mounted(
  cursor : number,
  facing : 'black' | 'white' = 'white',
  match  : Loaded            = loaded
): ReturnType<typeof mount<typeof Controls>> {
  return mount(Controls, { attachTo: document.body, props: { cursor, facing, loaded: match } })
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('Controls', () => {
  it('sets the four steps in one group and the shared run’s two beside the flip in another', () => {
    const groups = mounted(10).findAll('[role="group"] [role="group"]')
    expect(groups.map(group => group.findAll('button').map(button => button.attributes('data-control'))))
      .toEqual([['start', 'back', 'next', 'end'], ['meet', 'part', 'flip']])
  })

  it('names every key each control takes, a letter in its upper case, and shows the cap of the first', () => {
    const buttons = mounted(10).findAll('button')
    expect(buttons.map(button => button.attributes('aria-keyshortcuts')))
      .toEqual(['ArrowUp Home', 'ArrowLeft', 'ArrowRight', 'ArrowDown End', 'M', 'P', 'F'])
    expect(buttons.map(button => button.find('kbd').text())).toEqual(['↑', '←', '→', '↓', 'M', 'P', 'F'])
  })

  it.each([
    [0, ['start', 'back']],
    [loaded.shared!.meet, ['meet']],
    [loaded.last, ['next', 'end']]
  ])('disables each control that goes nowhere from cursor %i', (cursor, idle) => {
    const disabled = mounted(cursor).findAll('button[disabled]')
      .map(button => button.attributes('data-control'))
    expect(disabled).toEqual(idle)
  })

  it('disables the shared run’s controls where no stored game was matched', () => {
    const disabled = mounted(4, 'white', new Loaded(EXAMPLES.alone)).findAll('button[disabled]')
      .map(button => button.attributes('data-control'))
    expect(disabled).toEqual(['meet', 'part'])
  })
})

describe('Controls pressed and resized', () => {
  it('moves the cursor where a control goes', async () => {
    const wrapper = mounted(10)
    await wrapper.find('[data-control="next"]').trigger('click')
    await wrapper.find('[data-control="part"]').trigger('click')
    expect(wrapper.emitted('go')).toEqual([[11], [loaded.partAt]])
  })

  it.each([
    ['white', 'false', 'black'],
    ['black', 'true', 'white']
  ] as const)('turns the boards facing %s’s side to the other', async (facing, pressed, turned) => {
    const wrapper = mounted(10, facing)
    const flip    = wrapper.find('[data-control="flip"]')
    await flip.trigger('click')
    expect([flip.attributes('aria-pressed'), wrapper.emitted('turn')]).toEqual([pressed, [[turned]]])
  })

  it('moves the row onto a whole device pixel whenever it or its column resizes', () => {
    const wrapper = mounted(10)
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(10.25, 0, 40, 20))
    observed.at(-1)!()
    expect((wrapper.element as HTMLElement).style.translate).toBe('-0.250px 0')
  })
})
