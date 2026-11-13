// @vitest-environment happy-dom
import { flushPromises, mount }                            from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { frontOf }      from '../../../../lib/front/example.ts'
import { lastOf }       from '../../../../lib/front/plies.ts'
import { squareAt }     from '../../../../lib/methods/squares.ts'
import { Split }        from '../../../../theme/components/front/split.ts'
import { test }         from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'

const front     = frontOf()
const { start } = front.example.run

vi.mock('../../../../lib/front/example.ts', async original => {
  const example = await original<typeof import('../../../../lib/front/example.ts')>()
  return { ...example, frontOf: vi.fn<typeof example.frontOf>(example.frontOf) }
})

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
    expect(split.find('.sc-front-unit').text()).toBe('position shared')
    expect(split.find('.sc-front-say').text())
      .toBe('Two orders of moves reach one position, a transposition.')
    expect(split.findAll('.sc-data-read dd').map(value => value.text())).toEqual(['4. d4', 'Its own order'])
  })

  test('splits in two where the games part, the stored board under its cover', async () => {
    reduceMotion()
    const split = mount(Split)
    await flushPromises()
    expect(split.find('.sc-front-split').attributes('data-apart')).toBe('')
    expect(split.find('.sc-front-cover span').text()).toBe('White to move')
    expect(split.find('.sc-front-unit').text()).toBe('positions shared')
    expect(split.find('.sc-front-say').text())
      .toBe('Your game parted at 7. O-O. '
          + 'The link scotch match game --link prints opens both games in the Viewer.')
    expect(split.findAll('.sc-data-read dd').map(value => value.text())).toEqual(['9...e5', 'Hidden'])
  })

})

describe('Split past the run', () => {
  test("keeps the stored board at the run's last position as the reader's plays on", async () => {
    reduceMotion()
    const split  = mount(Split)
    await flushPromises()
    const pieces = (game: string): string[] => split
      .findAll(`.sc-front-board[data-game='${game}'] .sc-run-piece`)
      .filter(node => (node.element as HTMLElement).style.opacity === '1')
      .map(node => `${node.attributes('data-id')} ${(node.element as HTMLElement).style.transform}`)
      .toSorted()
    const standing = front.example.stored[lastOf(front)]!.standing
      .map(({ id, square }) => `${id} ${squareAt(square)}`)
      .toSorted()
    expect(pieces('stored')).toEqual(standing)
    expect(pieces('submitted')).not.toEqual(standing)
    expect(split.find(".sc-front-board[data-game='stored'] .sc-front-landed").attributes('style'))
      .toContain('opacity: 1')
  })

  test('names Black under the cover where the run ends on a move of White', async () => {
    reduceMotion()
    const early = { ...front.example, run: { length: 5, start } }
    vi.mocked(frontOf).mockReturnValueOnce({ ...front, example: early })
    const split = mount(Split)
    await flushPromises()
    expect(split.find('.sc-front-cover span').text()).toBe('Black to move')
  })

  it.each([
    [5, undefined, 'Both games, one position.'],
    [6, '', 'Your game parted at']
  ])('splits the boards only past the run, at %i', async (step, apart, say) => {
    reduceMotion()
    const split = mount(Split)
    await flushPromises()
    const line  = split.find('.sc-front-clock')
    vi.spyOn(line.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1100, 20))
    Object.assign(line.element, { setPointerCapture: vi.fn<(id: number) => void>() })
    await line.trigger('pointerdown', { clientX: step * 100, pointerId: 1 })
    expect(split.find('.sc-front-split').attributes('data-apart')).toBe(apart)
    expect(split.find('.sc-front-say').text()).toContain(say)
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
