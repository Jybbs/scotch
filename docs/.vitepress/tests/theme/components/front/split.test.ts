// @vitest-environment happy-dom
import { flushPromises, mount }                        from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { frontOf }      from '../../../../lib/front/example.ts'
import { Split }        from '../../../../theme/components/front/split.ts'
import { test }         from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'

const { start } = frontOf().example.run

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementVisibility: () => ({ value: true })
}))

beforeEach(() => {
  const done = { cancel: vi.fn<() => void>(), playState: 'finished' } as unknown as Animation
  vi.spyOn(Element.prototype, 'animate').mockReturnValue(done)
})

afterEach(() => {
  sessionStorage.clear()
})

describe('Split', () => {
  test('names the step where the games part', async () => {
    reduceMotion()
    const split = mount(Split)
    await flushPromises()
    const line  = split.find('.sc-front-clock')
    const width = 1100
    vi.spyOn(line.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, width, 20))
    Object.assign(line.element, { setPointerCapture: vi.fn<(id: number) => void>() })
    await line.trigger('pointerdown', { clientX: 600, pointerId: 1 })
    expect(line.attributes('aria-valuetext')).toBe('The parting')
  })

  test('opens on one board, both games at the position they meet at by two orders', async () => {
    const split = mount(Split)
    await flushPromises()
    expect(split.find('.sc-front-split').attributes('data-apart')).toBeUndefined()
    expect(split.findAll('.sc-front-board').map(board => board.attributes('data-game')))
      .toEqual(['submitted', 'stored'])
    expect(split.find('.sc-data-say').text())
      .toBe('position shared. Two orders of moves reach one position, a transposition.')
    expect(split.findAll('.sc-data-read dd').map(value => value.text())).toEqual(['4. d4', 'Its own order'])
  })

  test('splits in two where the games part, the stored board under its cover', async () => {
    reduceMotion()
    const split = mount(Split)
    await flushPromises()
    expect(split.find('.sc-front-split').attributes('data-apart')).toBe('')
    expect(split.find('.sc-front-cover span').text()).toBe('White to move')
    expect(split.find('.sc-data-say').text())
      .toBe('positions shared. Your game parted at 7. O-O. How the stored game went on waits in the Viewer.')
    expect(split.findAll('.sc-data-read dd').map(value => value.text())).toEqual(['9...e5', 'Hidden'])
  })

  test("keeps the stored board at the run's last position as the reader's plays on", async () => {
    reduceMotion()
    const split  = mount(Split)
    await flushPromises()
    const pieces = (game: string): string[] => split
      .findAll(`.sc-front-board[data-game='${game}'] .sc-run-piece`)
      .map(node => (node.element as HTMLElement).style.transform)
    expect(pieces('submitted')).not.toEqual(pieces('stored'))
    expect(split.find(".sc-front-board[data-game='stored'] .sc-front-landed").attributes('style'))
      .toContain('opacity: 1')
  })

})

describe('Split on the clock', () => {
  test('glides a ply at a time on the clock', async ({ clock }) => {
    const split = mount(Split)
    await flushPromises()
    clock.advanceTimersByTime(700)
    await flushPromises()
    expect(Element.prototype.animate).toHaveBeenCalled()
    const clockLine = split.find('.sc-front-clock')
    expect(clockLine.attributes('aria-valuemax')).toBe(String(frontOf().example.submitted.length - start))
    expect(clockLine.attributes('aria-valuetext')).toBe('4...c5')
  })
})
