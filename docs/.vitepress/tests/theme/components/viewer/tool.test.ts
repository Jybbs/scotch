// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises }    from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, shallowRef }            from 'vue'
import { renderToString }                      from 'vue/server-renderer'

import { EXAMPLES }     from '../../../../lib/viewer/examples.ts'
import { Tool }         from '../../../../theme/components/viewer/tool.ts'
import { test }         from '../../../common/clock.ts'
import { pressed }      from '../../../common/keys.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { mountedTool }  from '../../../common/tool.ts'

vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: shallowRef({ stats: [{ label: 'Games', value: '435,321' }] }) })
}))

const meet   = EXAMPLES.match.span!.start
const length = EXAMPLES.match.span!.length

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.replaceChildren()
  history.replaceState(null, '', location.pathname)
})

describe('Tool as the build renders it', () => {
  it('draws both boards, the sheets, and the band at the first position the two share', async () => {
    const html = await renderToString(createSSRApp(Tool))
    const host = Object.assign(document.createElement('div'), { innerHTML: html })
    expect(host.querySelectorAll('.sc-viewer-piece')).toHaveLength(64)
    expect([...host.querySelectorAll('[aria-current="step"] .sc-viewer-san')].map(move => move.textContent))
      .toEqual([EXAMPLES.match.submitted.moves[meet - 1], EXAMPLES.match.stored!.moves[meet - 1]])
    expect(host.querySelector('.sc-viewer-count')?.textContent).toBe(String(length))
    expect(host.querySelector('.sc-viewer-status')?.textContent).toBe(`Same position · 1 of ${length}`)
    expect(host.querySelector('.sc-viewer-colophon')?.textContent).toBe('Games435,321')
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

describe('Tool as a reader steps it', () => {
  test('steps on the controls’ keys, marking whether the boards share a position', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    expect(await pressed(root, 'ArrowRight')).toBe(true)
    expect(wrapper.find('.sc-viewer-status').text()).toBe(`Same position · 2 of ${length}`)
    expect(root.style.getPropertyValue('--sc-viewer-step')).not.toBe('0ms')
    expect(await pressed(root, 'Home')).toBe(true)
    expect([wrapper.find('.sc-viewer-status').text(), root.dataset.shared])
      .toEqual([`Different · meet at ply ${meet}`, 'no'])
    expect(await pressed(root, 'Home')).toBe(false)
    clock.advanceTimersByTime(5000)
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
    expect(wrapper.find('.sc-viewer-status').text()).toBe(`Same position · 1 of ${length}`)
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
    expect(wrapper.find('.sc-viewer-status').text()).toBe(`Different · meet at ply ${meet}`)
    clock.advanceTimersByTime(5000)
  })

  test('steps one ply on Up while focus sits on the track', async ({ clock }) => {
    const { wrapper } = mountedTool()
    const slider      = wrapper.find('[role="slider"]')
    expect(await pressed(slider.element, 'ArrowUp')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe(String(meet + 1))
    clock.advanceTimersByTime(5000)
  })

  test('walks the sheets a row at a time on Up and Down, focus following', async ({ clock }) => {
    const { wrapper } = mountedTool()
    const move        = wrapper.find('[data-party="stored"][aria-current="step"]').element as HTMLElement
    move.focus()
    expect(await pressed(move, 'ArrowDown')).toBe(true)
    expect(document.activeElement?.textContent).toContain(EXAMPLES.match.stored!.moves[meet + 1])
    expect((document.activeElement as HTMLElement).dataset.party).toBe('stored')
    clock.advanceTimersByTime(5000)
  })
})

describe('Tool as a reader moves through it', () => {
  test('moves the cursor to a move pressed in the sheets and to a control pressed', async ({ clock }) => {
    const { wrapper } = mountedTool()
    await wrapper.findAll('.sc-viewer-move[data-party="submitted"]')[19]!.trigger('click')
    expect(wrapper.find('.sc-viewer-status').text()).toBe(`Same position · ${20 - meet + 1} of ${length}`)
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
    const king = wrapper.find('[data-game="submitted"] .sc-viewer-piece[data-piece="K"]').element
    expect(wrapper.find('[data-control="flip"]').attributes('aria-pressed')).toBe('true')
    expect(king.getAttribute('transform')).toMatch(/^matrix\(1 0 0 1 \d+ 0\)$/u)
    clock.advanceTimersByTime(5000)
  })

  test('marks the root as matched or not with each example loaded', async ({ clock }) => {
    const { root, wrapper } = mountedTool()
    const [match, alone]    = wrapper.findAll('.sc-viewer-examples button')
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
    const count       = wrapper.find('.sc-viewer-differing').element as HTMLButtonElement
    const washed      = (): number => wrapper.findAll('.sc-viewer-square[data-differ]').length
    expect(count.hidden).toBe(true)
    await wrapper.find('[data-control="part"]').trigger('click')
    await wrapper.find('[data-control="next"]').trigger('click')
    await flushPromises()
    expect([wrapper.find('.sc-viewer-status').text(), count.hidden])
      .toEqual([`Parted at ply ${meet + length} · 4 squares differ`, false])
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
    const stored            = EXAMPLES.match.stored!.moves.length
    const washed            = (): number => wrapper.findAll('[data-game="submitted"] [data-differ]').length
    await wrapper.findAll('.sc-viewer-move[data-party="submitted"]')[stored]!.trigger('click')
    await flushPromises()
    clock.advanceTimersByTime(5000)
    const count = wrapper.find('.sc-viewer-differing')
    await count.trigger('focus')
    clock.advanceTimersByTime(10)
    expect(washed()).toBe(0)
    await pressed(root, 'ArrowLeft')
    clock.advanceTimersByTime(5000)
    expect([washed(), count.text()]).toEqual([19, '19 squares differ'])
    await count.trigger('blur')
    clock.advanceTimersByTime(10)
    expect(wrapper.findAll('.sc-viewer-square[data-differ]')).toHaveLength(0)
  })
})
