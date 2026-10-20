// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { exampleOf }  from '../../../../lib/methods/example.ts'
import { placedAt }   from '../../../../lib/methods/squares.ts'
import { RunBoard }   from '../../../../theme/components/methods/board.ts'
import { standBoard } from '../../../common/board.ts'

const methods = exampleOf()
/**
 * The calls the board hands the resize observer, which a case makes in place of
 * a browser resizing the board.
 */
const observed = vi.hoisted((): (() => void)[] => [])

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useResizeObserver: (_: unknown, callback: () => void) => {
    observed.push(callback)
  }
}))

describe('RunBoard', () => {
  const wrapper = mount(RunBoard, { props: { example: methods, opening: 6 } })

  it('lays the squares out from a8, the light squares where a1 is dark', () => {
    const shades = wrapper.findAll('.sc-run-square').map(square => square.attributes('data-shade'))
    expect([shades.length, shades[0], shades[1], shades[56]]).toEqual([64, 'light', 'dark', 'dark'])
  })

  it('draws every piece the opening ply shows, each where it stands', () => {
    const pieces = wrapper.findAll('.sc-run-piece')
    expect(pieces).toHaveLength(placedAt(methods, 6).size)
    expect(wrapper.find("[data-id='g12']").attributes()).toMatchObject({
      'data-ghost' : '',
      'data-piece' : 'P',
      'style'      : 'opacity: 0.95; transform: translate(400%, 400%);'
    })
  })

  it('washes the four squares the two games differ on before they meet', () => {
    const washed = wrapper.findAll('.sc-run-wash').filter(wash => wash.attributes('data-kind'))
    expect(washed.map(wash => wash.attributes('data-kind')))
      .toEqual(['submitted', 'stored', 'stored', 'submitted'])
  })

  it('keeps the stamp hidden while the two games differ', () => {
    expect(wrapper.find('.sc-run-stamp').attributes('style')).toBe('opacity: 0;')
  })

  it('names each kind of square in the key', () => {
    expect(wrapper.findAll('.sc-run-tag').map(tag => tag.text()))
      .toEqual(['Submitted alone', 'Stored alone', 'Both differ'])
  })
})

describe('RunBoard as stepped', () => {
  it('moves the board to a ply through the call it exposes', () => {
    const shown = mount(RunBoard, { props: { example: methods, opening: 6 } })
    ;(shown.vm as unknown as { show: (ply: number) => void }).show(7)
    expect(shown.find('.sc-run-stamp').attributes('style')).toBe('opacity: 1;')
  })

  it('measures the key again whenever the board resizes', () => {
    const sized        = mount(RunBoard, { attachTo: document.body, props: { example: methods, opening: 6 } })
    const [board, key] = [sized.find('.sc-run-board').element, sized.find('.sc-run-key').element]
    standBoard(board, key)
    observed.at(-1)!()
    expect((sized.find('.sc-run-leader').element as HTMLElement).style.top).toBe('-256px')
  })

  it('stamps one position on a board opening where the two games meet', () => {
    const met = mount(RunBoard, { props: { example: methods, opening: 9 } })
    expect(met.find('.sc-run-stamp').attributes('style')).toBe('opacity: 1;')
  })
})
