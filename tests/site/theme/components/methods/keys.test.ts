// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick }             from 'vue'

import { keyedOf }                   from '../../../../../docs/.vitepress/lib/methods/keys.ts'
import { PACE }                      from '../../../../../docs/.vitepress/lib/methods/stepping.ts'
import { Keys }                      from '../../../../../docs/.vitepress/theme/components/methods/keys.ts'
import { test }                      from '../../../common/clock.ts'
import { pauseMotion, reduceMotion } from '../../../common/motion.ts'

type Wrapper = ReturnType<typeof mount<typeof Keys>>

/**
 * Mounts the widget holding still, as a reader preferring reduced motion meets
 * it, on the line's first move.
 */
function still(): Wrapper {
  reduceMotion()
  return mount(Keys)
}

const status = (wrapper: Wrapper): string => wrapper.find('[role=status]').text()

/**
 * Presses the button whose text is `text` `times` times.
 */
async function press(wrapper: Wrapper, text: string, times = 1): Promise<void> {
  const button = wrapper.findAll('button').find(each => each.text() === text)!.element
  Array.from({ length: times }, () => button.click())
  await nextTick()
}

/**
 * Reads whether the layer holding `text` is the one its cell shows.
 */
const showing = (wrapper: Wrapper, text: string): boolean => wrapper.findAll('[class*="[grid-area:1/1]"]')
  .findLast(layer => layer.text().includes(text))?.classes().includes('invisible') !== true

describe('Keys as drawn', () => {
  it('opens on the line\'s first move where the drawings hold still', () => {
    expect(status(still())).toBe('Ply 1 · 1. d4')
  })

  it('opens on the start and plays where the drawings move', () => {
    const wrapper = mount(Keys)
    expect(status(wrapper)).toBe('Ply 0 · the start')
    expect(wrapper.find('[aria-pressed=true]').text()).toBe('Pause')
  })

  it('writes the key after the move as its digits, grouped for a reader who cannot see them', async () => {
    const wrapper = still()
    await press(wrapper, 'Next', 6)
    const labels = wrapper.findAll('[role=img][aria-label]').map(key => key.attributes('aria-label'))
    expect(labels).toContain('325B 6964 4007 5D7D')
  })

  it('names each number the move takes out and puts in', () => {
    const text = still().text()
    expect(text).toContain('⊕ Out · White pawn d2')
    expect(text).toContain('⊕ In · White pawn d4')
  })

  it('washes the square the move leaves and the square it enters', () => {
    const marks = still().find('[class*="[grid-area:board]"]').findAll('i[data-mark]')
    expect(marks.map(square => square.attributes('data-mark')).toSorted()).toEqual(['from', 'to'])
  })

  it('washes in the key before exactly the digits the move turns', () => {
    const [start, first] = keyedOf().keys as [string, string]
    const before         = still().findAll('[role=img][aria-label]')[0]!.findAll('[aria-hidden] > span')
    expect(before.map(digit => digit.classes().includes('bg-run/35')))
      .toEqual([...start].map((digit, at) => digit !== first[at]))
  })

  it('writes the stored game\'s order and its key once the line meets it', async () => {
    const wrapper = still()
    expect(showing(wrapper, 'by another order')).toBe(false)
    await press(wrapper, 'Next', 6)
    expect(status(wrapper)).toBe('Ply 7 · 4. e4')
    expect(wrapper.text()).toContain('1. c4 Nf6 2. Nc3 g6 3. e4 Bg7 4. d4')
    expect(showing(wrapper, 'by another order')).toBe(true)
  })
})

describe('Keys as stepped', () => {
  it('steps back and on through its buttons', async () => {
    const wrapper = still()
    await press(wrapper, 'Next', 4)
    expect(status(wrapper)).toBe('Ply 5 · 3. Nc3')
    await press(wrapper, 'Back')
    expect(status(wrapper)).toBe('Ply 4 · 2...g6')
  })

  it('hides the numbers before the first move, which no move reached', async () => {
    const wrapper = still()
    await press(wrapper, 'Back')
    expect(status(wrapper)).toBe('Ply 0 · the start')
    expect(wrapper.text()).toContain('The key of the starting position')
    expect(wrapper.find('[class*="[grid-area:board]"]').findAll('i[data-mark]')).toHaveLength(0)
  })

  it('keeps every ply\'s numbers drawn, showing only the ply in view', async () => {
    const wrapper = still()
    const drawn   = wrapper.findAll('[aria-label]').length
    await press(wrapper, 'Next', 3)
    expect(wrapper.findAll('[aria-label]')).toHaveLength(drawn)
  })

  it('opens and closes the en passant file before the line meets the stored game', async () => {
    const wrapper = still()
    expect(showing(wrapper, 'Can capture on d6')).toBe(false)
    await press(wrapper, 'The en passant file')
    expect(showing(wrapper, 'Can capture on d6')).toBe(true)
    expect(wrapper.text()).toContain('= the same key')
    expect(wrapper.find('button[aria-pressed=true]').text()).toBe('Hide the en passant file')
    await press(wrapper, 'Hide the en passant file')
    expect(wrapper.find('button[aria-pressed=true]').exists()).toBe(false)
  })

  test('plays a ply on each interval while the drawings move', async ({ clock }) => {
    const wrapper = mount(Keys)
    await nextTick()
    clock.advanceTimersByTime(PACE.interval * 3)
    await nextTick()
    expect(status(wrapper)).toBe('Ply 3 · 2. c4')
  })

  it('stops playing once the reader pauses the motion switch', async () => {
    const wrapper = mount(Keys)
    await pauseMotion()
    expect(wrapper.find('button').text()).toBe('Play')
  })
})

describe('Keys on a wide page', () => {
  it('sets the board beside the sum and its note, above the en passant box', () => {
    const wrapper = still()
    expect(wrapper.classes()).toContain('@container')
    const card = wrapper.get('[class*="grid-template-areas"]')
    expect(card.classes()).toEqual(expect.arrayContaining([
      'lg:gap-x-4',
      'lg:grid-cols-[minmax(min-content,1fr)_minmax(0,14rem)]',
      'lg:grid-rows-[auto_auto_auto_1fr_auto]',
      'lg:[grid-template-areas:"status_status"_"goal_goal"_"key_board"_"chain_board"_"end_end"]'
    ]))
    expect([...card.element.children].map(part => /\[grid-area:(\w+)\]/u.exec(part.className)?.[1]))
      .toEqual(['status', 'goal', 'key', 'board', 'chain', 'end'])
  })

  it.each([
    ['digit', '[role=img] [aria-hidden] > span', ['lg:w-[9px]', 'lg:@min-[680px]:w-[11px]']],
    ['key', '[role=img]', ['lg:gap-x-[5px]', 'lg:@min-[680px]:gap-x-[7px]']],
    ['row', '[class*="sm:grid-cols-[13.5rem_auto]"]', ['lg:grid-cols-[12rem_auto]', 'lg:gap-x-1.5']]
  ])('narrows every %s of the sum', (_, parts, narrowed) => {
    const drawn = still()
      .findAll(`[class*="[grid-area:key]"] ${parts}`)
      .map(part => part.classes())
    expect(drawn).toAllEqual(expect.arrayContaining(narrowed))
  })

  it('holds the label of every number at its full width, whatever face draws its sign', () => {
    const heads = still()
      .findAll('[class*="[grid-area:key]"] [class*="sm:grid-cols-[13.5rem_auto]"] > span')
      .filter(head => head.text().startsWith('⊕'))
    expect(heads.map(head => head.classes())).toAllEqual(expect.arrayContaining(['lg:*:shrink-0']))
  })
})

describe('Keys with the en passant file', () => {
  it('washes d6 as the capture square on the free board and as left out on the pinned one', async () => {
    const wrapper = still()
    await press(wrapper, 'The en passant file')
    const boards  = ['A pawn free', 'A pinned pawn'].map(label => wrapper.find(`[aria-label^="${label}"]`))
    expect(boards.map(board => board.findAll('i').findIndex(square => square.attributes('data-mark'))))
      .toEqual([19, 19])
    expect(boards.map(board => board.find('i[data-mark]').attributes('data-mark'))).toEqual(['to', 'from'])
  })
})
