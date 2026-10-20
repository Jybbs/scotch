// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { MatchBoard, readingOrder } from '../../../lib/methods/board.ts'
import { type Example, exampleOf }  from '../../../lib/methods/example.ts'
import { RunBoard }                 from '../../../theme/components/methods/board.ts'
import { standBoard }               from '../../common/board.ts'

/**
 * A line of two plies standing a white pawn on a7 and promoting it on a8,
 * beside a stored game whose pawn stays, so a node changes its piece.
 */
const PROMOTING: Example = {
  run: { length: 1, start: 0 },

  stored: [
    { san: null, standing: [{ id: 8, piece: 'P', square: 48 }], to: null },
    { san: 'a8=Q', standing: [{ id: 8, piece: 'P', square: 48 }], to: null }
  ],

  submitted: [
    { san: null, standing: [{ id: 8, piece: 'P', square: 48 }], to: null },
    { san: 'a8=Q', standing: [{ id: 8, piece: 'Q', square: 56 }], to: 56 }
  ]
}
const methods = exampleOf()

/**
 * Draws a board at a ply and takes it over with a `MatchBoard` of its own.
 */
function drawn(example: Example, ply: number): { board: HTMLElement, driver: MatchBoard, key: HTMLElement } {
  const wrapper = mount(RunBoard, { attachTo: document.body, props: { example, opening: ply } })
  const board   = wrapper.find('.sc-run-board').element as HTMLElement
  const key     = wrapper.find('.sc-run-key').element as HTMLElement
  return { board, driver: new MatchBoard(board, example, key, ply), key }
}

describe('readingOrder', () => {
  it('runs from a8 across and down to h1', () => {
    expect([readingOrder[0], readingOrder[7], readingOrder[56], readingOrder[63]]).toEqual([56, 63, 0, 7])
  })
})

describe('MatchBoard', () => {
  it('washes each square the two games differ on and clears it once they meet', () => {
    const { board, driver } = drawn(methods, 6)
    const shown             = (): number => board.querySelectorAll(".sc-run-wash[style*='opacity: 1']").length
    expect(shown()).toBe(4)
    driver.show(7)
    expect(shown()).toBe(0)
  })

  it('colors each square it washes anew by the game standing a piece there', () => {
    const { board, driver } = drawn(methods, 7)
    driver.show(18)
    const kinds = [...board.querySelectorAll<HTMLElement>(".sc-run-wash[style*='opacity: 1']")]
      .map(wash => wash.dataset.kind)
    expect(kinds).toEqual(['stored', 'submitted', 'stored', 'both'])
  })

  it('stamps one position where the two games meet and lifts it where they part', () => {
    const { board, driver } = drawn(methods, 6)
    const stamp             = board.querySelector<HTMLElement>('.sc-run-stamp')!
    driver.show(7)
    expect(stamp.style.opacity).toBe('1')
    driver.show(18)
    expect(stamp.style.opacity).toBe('0')
  })

  it('fades out a ghost the next ply no longer shows', () => {
    const { board, driver } = drawn(methods, 6)
    driver.show(7)
    expect(board.querySelector<HTMLElement>("[data-id='g11']")!.style.opacity).toBe('0')
  })

  it('mounts a ghost the opening ply never drew and keeps it mounted', () => {
    const { board, driver } = drawn(methods, 7)
    driver.show(18)
    driver.show(7)
    const ghost = board.querySelector<HTMLElement>("[data-id='g57']")!
    expect([ghost.style.opacity, ghost.dataset.ghost]).toEqual(['0', ''])
  })

  it('draws a promoted piece anew in the node it keeps', () => {
    const { board, driver } = drawn(PROMOTING, 0)
    driver.show(1)
    const node = board.querySelector<HTMLElement>("[data-id='8']")!
    expect([node.dataset.piece, node.style.transform, board.querySelectorAll("[data-id='8']").length])
      .toEqual(['Q', 'translate(0%, 0%)', 1])
    expect(node.querySelector('g')?.getAttribute('class')).toBe('white queen')
  })
})

describe('MatchBoard in motion', () => {
  it('ends what one step left running before the next', () => {
    const cancel = vi.fn<() => void>()
    vi.spyOn(Element.prototype, 'animate')
      .mockImplementation(() => ({ cancel, playState: 'finished' }) as unknown as Animation)
    const { driver } = drawn(methods, 6)
    driver.show(7, 'glide')
    expect(cancel).not.toHaveBeenCalled()
    driver.show(8, 'glide')
    expect(cancel).toHaveBeenCalled()
  })
})

describe('MatchBoard key', () => {
  it('leaves the key hidden while the board has no size', () => {
    const { driver, key } = drawn(methods, 6)
    driver.measure()
    const leaders = [...key.querySelectorAll<HTMLElement>('.sc-run-leader')]
    expect(leaders.map(leader => leader.style.opacity === '1')).toEqual([false, false, false])
  })

  it('reaches each leader from the board down to its tag once measured, each tag on a row of its own', () => {
    const { board, driver, key } = drawn(methods, 6)
    standBoard(board, key)
    driver.measure()
    const leaders = [...key.querySelectorAll<HTMLElement>('.sc-run-leader')]
    expect(leaders.map(leader => [leader.style.top, leader.style.height]))
      .toEqual([['-256px', '263px'], ['-256px', '281px'], ['-256px', '299px']])
    expect([...key.querySelectorAll<HTMLElement>('.sc-run-tag')].map(tag => tag.style.top))
      .toEqual(['7px', '25px', '43px'])
    expect(leaders.map(leader => leader.style.opacity === '1')).toEqual([true, true, false])
  })

  it('names each kind of square at the ply in view and hides a kind the ply lacks', () => {
    const { board, driver, key } = drawn(methods, 6)
    standBoard(board, key)
    driver.measure()
    driver.show(18)
    expect([...key.querySelectorAll<HTMLElement>('.sc-run-tag')].map(tag => tag.style.opacity))
      .toEqual(['1', '1', '1'])
    driver.show(7)
    expect([...key.querySelectorAll<HTMLElement>('.sc-run-tag')].map(tag => tag.style.opacity))
      .toEqual(['0', '0', '0'])
  })
})
