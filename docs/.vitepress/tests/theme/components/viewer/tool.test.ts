// @vitest-environment happy-dom
import { type VueWrapper, enableAutoUnmount, flushPromises }      from '@vue/test-utils'
import { type MockInstance, afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, shallowRef }                               from 'vue'
import { renderToString }                                         from 'vue/server-renderer'

import { EXAMPLES }       from '../../../../lib/viewer/examples.ts'
import * as links         from '../../../../lib/viewer/link.ts'
import { Matcher }        from '../../../../lib/viewer/matcher.ts'
import { Tool }           from '../../../../theme/components/viewer/tool.ts'
import { test }           from '../../../common/clock.ts'
import { fileOf, picked } from '../../../common/files.ts'
import { pressed }        from '../../../common/keys.ts'
import * as matches       from '../../../common/matches.ts'
import { reduceMotion }   from '../../../common/motion.ts'
import { mountedTool }    from '../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const length  = EXAMPLES.match.span!.length
const parting = matches.loaded.parting!
const stored  = EXAMPLES.match.stored!

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.replaceChildren()
  history.replaceState(null, '', location.pathname)
})

/**
 * Waits for each call made through `spy` to settle, and for what each sets off to run.
 */
async function settled(spy: MockInstance): Promise<void> {
  await Promise.all(spy.mock.results.map(({ value }) => value))
  await flushPromises()
}

/**
 * Reads, at the last position the two games share, whether the live region
 * names the stored game's next move, how many boards draw each game's arrow,
 * and the band's stored move as a reader hears it and as it is marked.
 */
function parted(wrapper: VueWrapper): unknown[] {
  const named = wrapper.get('[aria-label="The match and your game"] p + p [data-game="stored"]')
  const drawn = (party: string): number =>
    wrapper.findAll(`svg g[data-game="${party}"][data-on]`).length
  return [
    said(wrapper)[1]!.includes(`the stored game played ${parting} next`),
    drawn('stored'),
    drawn('submitted'),
    named.find('.sr-only').exists() ? named.get('.sr-only').text() : named.text(),
    named.find('[aria-hidden="true"]').exists(),
    named.attributes('data-covered')
  ]
}

/**
 * Presses or releases the pointer on a square of the stored board as it faces
 * White, or right of the board for a negative square, the board's own units
 * standing in for the page's.
 */
function point(wrapper: VueWrapper, square: number, type: 'pointerdown' | 'pointerup'): void {
  const board  = wrapper.find('figure[data-game="stored"] svg').element
  const [x, y] = square < 0 ? [400, 20] : [(square % 8) * 45 + 20, (7 - (square >> 3)) * 45 + 20]
  board.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }))
}

/**
 * Types text into the field taking a move and offers it.
 */
async function typed(wrapper: VueWrapper, text: string): Promise<void> {
  await wrapper.find('#sc-viewer-guess-field').setValue(text)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

/**
 * Reads the status line, the line the live region reads, and the count of the
 * moves offered that match.
 */
function said(wrapper: VueWrapper): string[] {
  return ['p:has(> button[title])', 'p[role=status]', '#sc-viewer-guess-note']
    .map(name => wrapper.get(name).text())
}

describe('Tool as the build renders it', () => {
  it('draws both boards, the sheets, and the band at the first position the two share', async () => {
    const html = await renderToString(createSSRApp(Tool))
    const host = Object.assign(document.createElement('div'), { innerHTML: html })
    expect(host.querySelectorAll('[data-piece]')).toHaveLength(64)
    expect([...host.querySelectorAll('[aria-current="step"] > span:first-child')]
      .map(move => move.textContent))
      .toEqual([EXAMPLES.match.submitted.moves[matches.meet - 1], stored.moves[matches.meet - 1]])
    expect(host.querySelector('b')?.textContent).toBe(String(length))
    expect(host.querySelector('p:has(> button[title])')?.textContent).toBe(`Same position · 1 of ${length}`)
    expect(host.querySelector('dl')?.textContent).toBe('Games435,321')
  })

  it('hydrates the rendered markup at that position with nothing moved', async () => {
    const html     = await renderToString(createSSRApp(Tool))
    const host     = Object.assign(document.createElement('div'), { innerHTML: html })
    const rendered = host.innerHTML
    document.body.append(host)
    createSSRApp(Tool).mount(host)
    await flushPromises()
    expect(host.innerHTML).toBe(rendered)
  })
})

describe('Tool, its legend', () => {
  it('names each game in its color in the corner, the submitted game first', async () => {
    const { wrapper } = mountedTool()
    const marks       = wrapper.findAll('[role=listitem]')
    expect(marks.map(mark => [mark.attributes('aria-label'), mark.attributes('style')])).toEqual([
      ['Your game', '--sc-data-tone: var(--sc-submitted);'],
      ['The stored game', '--sc-data-tone: var(--sc-stored);']
    ])
    await marks[1]!.trigger('pointerenter')
    expect(wrapper.find('[role=list] + p').text()).toBe('The stored game')
  })

  it('opens the line beneath the boards', () => {
    const { wrapper } = mountedTool()
    const legend      = wrapper.get('[role=list]').element.parentElement!.parentElement!
    const under       = legend.parentElement!
    expect([under.firstElementChild === legend, under.querySelector('canvas') !== null])
      .toEqual([true, true])
  })
})

describe('Tool as a reader steps it', () => {
  test('steps on the controls’ keys, marking whether the boards share a position', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    expect(await pressed(root, 'ArrowRight')).toBe(true)
    expect(wrapper.find('p:has(> button[title])').text()).toBe(`Same position · 2 of ${length}`)
    expect(root.style.getPropertyValue('--sc-viewer-step')).not.toBe('0ms')
    expect(await pressed(root, 'Home')).toBe(true)
    expect([wrapper.find('p:has(> button[title])').text(), root.dataset.shared])
      .toEqual([`Different · meet at ply ${matches.meet}`, 'no'])
    expect(await pressed(root, 'Home')).toBe(false)
    clock.advanceTimersByTime(5000)
  })

  test('captions each board with the start mark at the starting position and with a move after it', async () => {
    const { root, wrapper } = mountedTool()
    const captions          = (): string[] => wrapper.findAll('figcaption > span:last-child')
      .map(move => move.text())
    expect(captions().every(move => /^\d+\./u.test(move))).toBe(true)
    await pressed(root, 'Home')
    expect(captions()).toEqual(['Start', 'Start'])
    expect(wrapper.findAll('figcaption > span:last-child [data-start] svg')).toHaveLength(2)
  })

  test('turns both boards on F, pressing the flip', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'f')
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('true')
    await pressed(root, 'F')
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('false')
    clock.advanceTimersByTime(5000)
  })

  test.for([
    ['with a modifier held', 'ArrowRight', { metaKey: true }],
    ['that no control takes', 'x', {}]
  ] as const)('leaves a key pressed %s to the page', async ([, key, held]) => {
    const { root, wrapper } = mountedTool()
    expect(await pressed(root, key, held)).toBe(false)
    expect(wrapper.find('p:has(> button[title])').text()).toBe(`Same position · 1 of ${length}`)
  })

  test('leaves a key pressed inside a field to the field', async () => {
    const { wrapper } = mountedTool()
    expect(await pressed(wrapper.find('textarea').element, 'ArrowRight')).toBe(false)
  })
})

describe('Tool answering Up and Down', () => {
  test('goes to either end on Up and Down outside the sheets and the track', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const slider            = wrapper.find('[role="slider"]')
    expect(await pressed(root, 'ArrowDown')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe(String(EXAMPLES.match.submitted.moves.length))
    expect(await pressed(root, 'ArrowUp')).toBe(true)
    expect(wrapper.find('p:has(> button[title])').text()).toBe(`Different · meet at ply ${matches.meet}`)
    clock.advanceTimersByTime(5000)
  })

  test('steps one ply on Up while focus sits on the track', async ({ clock }) => {
    const { wrapper } = mountedTool()
    const slider      = wrapper.find('[role="slider"]')
    expect(await pressed(slider.element, 'ArrowUp')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe(String(matches.meet + 1))
    clock.advanceTimersByTime(5000)
  })

  test('walks the sheets a row at a time on Up and Down, focus following', async ({ clock }) => {
    const { wrapper } = mountedTool()
    const move        = wrapper.find('[data-party="stored"][aria-current="step"]').element as HTMLElement
    move.focus()
    expect(await pressed(move, 'ArrowDown')).toBe(true)
    expect(document.activeElement?.textContent).toContain(stored.moves[matches.meet + 1])
    expect((document.activeElement as HTMLElement).dataset.party).toBe('stored')
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool as a reader moves through it', () => {
  test('moves the cursor to a move pressed in the sheets and to a control pressed', async ({ clock }) => {
    const { wrapper } = mountedTool()
    await wrapper.findAll('button[data-party][data-party="submitted"]')[19]!.trigger('click')
    expect(wrapper.find('p:has(> button[title])').text())
      .toBe(`Same position · ${20 - matches.meet + 1} of ${length}`)
    await wrapper.find('[data-control="end"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow'))
      .toBe(String(EXAMPLES.match.submitted.moves.length))
    clock.advanceTimersByTime(5000)
  })

  test('turns the boards from the flip, boards and track drawn from Black’s side', async ({ clock }) => {
    const { wrapper } = mountedTool()
    await wrapper.find('[data-control="flip"]').trigger('click')
    await flushPromises()
    const king = wrapper.find('figure[data-game="submitted"] [data-piece="K"]').element
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('true')
    expect(king.getAttribute('transform')).toMatch(/^matrix\(1 0 0 1 \d+ 0\)$/u)
    clock.advanceTimersByTime(5000)
  })

  test('marks the root as matched or not with each example loaded', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const [match, alone]    = wrapper.findAll('[aria-label="Examples"] button')
    await alone!.trigger('click')
    await flushPromises()
    expect(root.dataset.matched).toBe('no')
    await match!.trigger('click')
    await flushPromises()
    expect(root.dataset.matched).toBe('yes')
    clock.advanceTimersByTime(5000)
  })

  test('steps with no motion for a reader who prefers reduced motion', async ({ clock }) => {
    reduceMotion()
    const { root } = mountedTool()
    await pressed(root, 'ArrowRight')
    expect(root.style.getPropertyValue('--sc-viewer-step')).toBe('0ms')
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool showing the squares the boards differ on', () => {
  test('washes the squares once the games part while their count holds the pointer', async ({ clock }) => {
    const { wrapper } = mountedTool()
    const count       = wrapper.find('p > button[title]').element as HTMLButtonElement
    const washed      = (): number => wrapper.findAll('rect[data-differ]').length
    expect(count.hidden).toBe(true)
    await wrapper.find('[data-control="part"]').trigger('click')
    await wrapper.find('[data-control="next"]').trigger('click')
    await flushPromises()
    expect([wrapper.find('p:has(> button[title])').text(), count.hidden])
      .toEqual([`Parted at ply ${matches.meet + length} · 4 squares differ`, false])
    count.dispatchEvent(new PointerEvent('pointerenter'))
    await flushPromises()
    clock.advanceTimersByTime(10)
    expect(washed()).toBe(8)
    count.dispatchEvent(new PointerEvent('pointerleave'))
    await flushPromises()
    clock.advanceTimersByTime(10)
    expect(washed()).toBe(0)
  })

  test('moves the wash with each step while the count holds focus', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const washed            = (): number => wrapper.findAll('[data-game="submitted"] [data-differ]').length
    await wrapper.findAll('button[data-party][data-party="submitted"]')[stored.moves.length]!.trigger('click')
    await flushPromises()
    clock.advanceTimersByTime(5000)
    const count = wrapper.find('p > button[title]')
    await count.trigger('focus')
    clock.advanceTimersByTime(10)
    expect(washed()).toBe(0)
    await pressed(root, 'ArrowLeft')
    clock.advanceTimersByTime(5000)
    expect([washed(), count.text()]).toEqual([19, '19 squares differ'])
    await count.trigger('blur')
    clock.advanceTimersByTime(10)
    expect(wrapper.findAll('rect[data-differ]')).toHaveLength(0)
  })
})

describe('Tool and the page’s address', () => {
  test('writes the example, the ply, and the side into the address once moves land', async ({ clock }) => {
    const { root } = mountedTool()
    await pressed(root, 'ArrowRight')
    expect(location.hash).toBe('')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${matches.meet + 1}`)
    await pressed(root, 'f')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${matches.meet + 1}&side=black`)
  })

  test('writes nothing once the Viewer leaves the page before the moves land', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'ArrowRight')
    wrapper.unmount()
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe('')
  })

  test('writes a loaded file’s match into the address once it is encoded', async ({ clock }) => {
    const encoded     = await links.encodedOf(EXAMPLES.alone)
    const encoding    = vi.spyOn(links, 'encodedOf')
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json')])
    await settled(encoding)
    expect(location.hash).toBe(`#match=${encoded}&ply=0`)
    clock.advanceTimersByTime(5000)
  })

  it('writes nothing once the Viewer leaves the page before a loaded file’s match is encoded', async () => {
    const encoded = await links.encodedOf(EXAMPLES.alone)
    const held    = Promise.withResolvers<string>()
    vi.spyOn(links, 'encodedOf').mockReturnValue(held.promise)
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json')])
    wrapper.unmount()
    held.resolve(encoded)
    await flushPromises()
    expect(location.hash).toBe('')
  })
})

describe('Tool opened from a link', () => {
  test('opens on the example, the ply, and the side a link carries', async ({ clock }) => {
    history.replaceState(null, '', '#sample=alone&ply=3&side=black')
    const { wrapper } = mountedTool()
    await flushPromises()
    expect(wrapper.find('p:has(> button[title])').text()).toBe('Nothing matched')
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe('3')
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[aria-label="The two games"] > span').text()).toBe('demo.pgn')
    clock.advanceTimersByTime(5000)
  })

  test('opens on a match a link carries as encoded text, then writes it back as it steps', async ({ clock }) => {
    const encoded = await links.encodedOf(EXAMPLES.alone)
    history.replaceState(null, '', `#match=${encoded}&ply=5`)
    const read     = vi.spyOn(links, 'fromLink')
    const encoding = vi.spyOn(links, 'encodedOf')
    const { root, wrapper } = mountedTool()
    await settled(read)
    expect(wrapper.find('[aria-label="The two games"] > span').text()).toBe('A link')
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe('5')
    await settled(encoding)
    await pressed(root, 'ArrowRight')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#match=${encoded}&ply=6`)
  })

  it('names a link it cannot read, and clears the line once a match loads', async () => {
    history.replaceState(null, '', '#match=AAAA')
    const read        = vi.spyOn(links, 'fromLink')
    const { wrapper } = mountedTool()
    await settled(read)
    expect(wrapper.find('[role="alert"]').text()).toBe('The link holds no match, or was cut short or altered')
    await wrapper.find('[aria-label="Examples"] button').trigger('click')
    expect(wrapper.find('[role="alert"]').text()).toBe('')
  })

  test('names what a picked file lacks under the intake', async () => {
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf('[]', 'list.json')])
    expect(wrapper.find('[role="alert"]').text())
      .toBe('list.json: The file holds a list rather than an object')
  })
})

describe('Tool copying the match', () => {
  test('copies a link opening on the match where it stands', async () => {
    const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { wrapper } = mountedTool()
    await wrapper.find('div:has(> [popover]) > button').trigger('click')
    await flushPromises()
    expect(written)
      .toHaveBeenCalledWith(`${location.origin}${location.pathname}#sample=match&ply=${matches.meet}`)
  })

  test('copies the submitted game as PGN, the stored game’s moves as a variation', async () => {
    const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { wrapper } = mountedTool()
    await wrapper.findAll('div:has(> [popover]) > button')[1]!.trigger('click')
    await flushPromises()
    expect(written.mock.calls[0]![0]).toMatch(/^\[Event "The Viewer's example"\][^]+\( \{[^}]+\} /u)
  })

  test('copies a link carrying a loaded file’s match as encoded text', async ({ clock }) => {
    const encoded  = await links.encodedOf(EXAMPLES.alone)
    const copied   = Promise.withResolvers<string>()
    const encoding = vi.spyOn(links, 'encodedOf')
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(text => {
      copied.resolve(text)
      return Promise.resolve()
    })
    const { wrapper } = mountedTool()
    await picked(wrapper, [fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json')])
    await wrapper.find('div:has(> [popover]) > button').trigger('click')
    expect(await copied.promise).toBe(`${location.origin}${location.pathname}#match=${encoded}&ply=0`)
    await settled(encoding)
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#match=${encoded}&ply=0`)
  })
})

describe('Tool covering the stored game', () => {
  test('covers the stored moves past the cursor on C, the entry kept in place, then shows them', async ({
    clock
  }) => {
    const { root, wrapper } = mountedTool()
    const covered           = (): number => wrapper.findAll('button[data-party][data-covered]').length
    const entry             = wrapper.find('form').element as HTMLFormElement
    expect([covered(), entry.inert]).toEqual([0, true])
    expect(await pressed(root, 'c')).toBe(true)
    await flushPromises()
    expect([covered(), entry.inert, wrapper.find('[data-control="cover"]').attributes('aria-pressed')])
      .toEqual([stored.moves.length - matches.meet, false, 'true'])
    expect(wrapper.find('button[data-party][data-covered]').attributes('aria-label')).toBe('A covered move')
    expect(wrapper.find('[aria-label="The match and your game"] p + p [data-covered]').exists()).toBe(true)
    await pressed(root, 'C')
    await flushPromises()
    const marked = wrapper.find('[aria-label="The match and your game"] p + p [data-covered]')
    expect([covered(), entry.inert, marked.exists()]).toEqual([0, true, false])
    clock.advanceTimersByTime(5000)
  })

  test('covers the stored game from the control and writes it into the address', async ({ clock }) => {
    const { wrapper } = mountedTool()
    await wrapper.find('[data-control="cover"]').trigger('click')
    clock.advanceTimersByTime(5000)
    expect(location.hash).toBe(`#sample=match&ply=${matches.meet}&cover=1`)
  })

  test('opens covered from a link that carries the cover', async ({ clock }) => {
    history.replaceState(null, '', `#sample=match&ply=${matches.meet}&cover=1`)
    const { wrapper } = mountedTool()
    await flushPromises()
    expect(wrapper.find('[data-control="cover"]').attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(5000)
  })

  test('takes no cover from the control or its key where no game is stored', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await wrapper.findAll('[aria-label="Examples"] button')[1]!.trigger('click')
    await pressed(root, 'c')
    await flushPromises()
    const control = wrapper.find('[data-control="cover"]')
    expect([control.attributes('disabled'), control.attributes('aria-pressed')]).toEqual(['', 'false'])
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool covering where the two games part', () => {
  test('leaves the stored game’s next move out of the status, the boards, and the band', async ({
    clock
  }) => {
    history.replaceState(null, '', `#sample=match&ply=${matches.last}&cover=1`)
    const { wrapper } = mountedTool()
    await flushPromises()
    clock.advanceTimersByTime(5000)
    expect(parted(wrapper)).toEqual([false, 0, 2, 'A covered move', true, ''])
  })

  test('names the stored game’s next move again once the cover lifts', async ({ clock }) => {
    history.replaceState(null, '', `#sample=match&ply=${matches.last}&cover=1`)
    const { root, wrapper } = mountedTool()
    await flushPromises()
    await pressed(root, 'C')
    await flushPromises()
    clock.advanceTimersByTime(5000)
    expect(parted(wrapper)).toEqual([true, 2, 2, parting, false, undefined])
  })

  test('clears the moves offered once a match loads while covered', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await typed(wrapper, 'Bb4')
    await wrapper.findAll('[aria-label="Examples"] button')[0]!.trigger('click')
    await flushPromises()
    expect([said(wrapper)[2], wrapper.find('[data-control="cover"]').attributes('aria-pressed')])
      .toEqual(['0 of 0 offered match', 'true'])
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool taking a move while covered', () => {
  test('shows the stored move once a typed one is offered, naming the match and counting it', async ({
    clock
  }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await typed(wrapper, 'Bb4')
    expect(said(wrapper)).toEqual([
      '4...Bb4 · matches',
      'The stored game played 4...Bb4, matching yours. Ply 8, one position, 2 of the 36 the two share.',
      '1 of 1 offered match'
    ])
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(matches.meet + 1))
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool taking a move made on the stored board', () => {
  test('names the stored move beside a dragged one that differs', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await flushPromises()
    point(wrapper, 61, 'pointerdown')
    point(wrapper, 34, 'pointerup')
    await flushPromises()
    expect(said(wrapper)[0]).toBe('4...Bb4 · you offered Bf8-c5')
    expect(said(wrapper)[2]).toBe('0 of 1 offered match')
    clock.advanceTimersByTime(5000)
  })

  test('outlines a piece tapped on the stored board until a second tap lets it go', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const mark              = (): boolean => wrapper.find('[data-picked]').exists()
    await pressed(root, 'c')
    await flushPromises()
    point(wrapper, 61, 'pointerdown')
    point(wrapper, 61, 'pointerup')
    await flushPromises()
    expect(mark()).toBe(true)
    point(wrapper, 61, 'pointerdown')
    await flushPromises()
    expect(mark()).toBe(false)
    clock.advanceTimersByTime(5000)
  })

  test('offers nothing for a press right of the board and a release on it', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await flushPromises()
    point(wrapper, -1, 'pointerdown')
    point(wrapper, 34, 'pointerup')
    await flushPromises()
    expect([wrapper.find('[data-picked]').exists(), said(wrapper)[2]])
      .toEqual([false, '0 of 0 offered match'])
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool stepping on with a piece picked', () => {
  test('lets a picked piece go once the cursor steps on', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await flushPromises()
    point(wrapper, 61, 'pointerdown')
    point(wrapper, 61, 'pointerup')
    await flushPromises()
    await pressed(root, 'ArrowRight')
    await flushPromises()
    expect(wrapper.find('[data-picked]').exists()).toBe(false)
    point(wrapper, 34, 'pointerdown')
    point(wrapper, 34, 'pointerup')
    await flushPromises()
    expect(said(wrapper)[2]).toBe('0 of 0 offered match')
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool taking a move while covered at the edges of the stored game', () => {
  test('clears the field once it takes a move, keeping text it cannot take', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const input             = wrapper.find('#sc-viewer-guess-field').element as HTMLInputElement
    const field             = (): string => input.value
    await pressed(root, 'c')
    await typed(wrapper, 'hello')
    const kept = field()
    await typed(wrapper, 'Bb4')
    expect([kept, field()]).toEqual(['hello', ''])
    clock.advanceTimersByTime(5000)
  })

  test('marks text that is no move in SAN and stays at the cursor', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await typed(wrapper, 'hello')
    expect([wrapper.find('#sc-viewer-guess-field').attributes('aria-invalid'), said(wrapper)[2]])
      .toEqual(['true', 'Not a move in SAN'])
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(matches.meet))
    clock.advanceTimersByTime(5000)
  })

  test('counts no offer for a move stepped past and says nothing of it', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await pressed(root, 'ArrowRight')
    await flushPromises()
    expect(said(wrapper)[0]).toBe('Same position · 2 of 36')
    expect(said(wrapper)[2]).toBe('0 of 0 offered match')
    clock.advanceTimersByTime(5000)
  })

  test('takes no move where the stored game plays none from the cursor', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    await pressed(root, 'c')
    await pressed(root, 'ArrowDown')
    await flushPromises()
    expect(wrapper.find('#sc-viewer-guess-field').attributes('disabled')).toBeDefined()
    expect(wrapper.find('figure[data-game="stored"] svg').attributes('data-taking')).toBeUndefined()
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool matching a pasted game', () => {
  it('loads the match the game makes and steps to another of the tied games from the tally', async () => {
    const tied        = [{ ...EXAMPLES.match, ties: 1 }, { ...matches.oneApart(), ties: 1 }]
    const submitted   = vi.spyOn(Matcher.prototype, 'submit')
      .mockResolvedValue({ matches: matches.answered(...tied) })
    const { wrapper } = mountedTool()
    const field       = wrapper.find('textarea[placeholder]')
    await field.setValue('1. Nf3 *')
    await field.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(submitted).toHaveBeenCalledWith('the pasted game', '1. Nf3 *')
    expect([wrapper.find('[aria-label="The two games"] > span').text(), wrapper.find('b').text()])
      .toEqual(['the pasted game', String(length)])
    await wrapper.find('button[aria-pressed][title]:not([data-control])').trigger('click')
    await flushPromises()
    expect([wrapper.find('[aria-label="The two games"] > span').text(), wrapper.find('b').text()])
      .toEqual(['the pasted game', '2'])
  })

  it('names the problem a pasted game carries under the intake', async () => {
    vi.spyOn(Matcher.prototype, 'submit').mockResolvedValue({ problem: 'Found no game in the pasted game' })
    const { wrapper } = mountedTool()
    const field       = wrapper.find('textarea[placeholder]')
    await field.setValue('nothing')
    await field.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('Found no game in the pasted game')
  })
})
