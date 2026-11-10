// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

import { NARROW, narrowAt, pickable, shareAlong } from '../../../lib/reference/pick.ts'

interface Picking {
  'aria-pressed' : string
  'onClick'      : () => void
  'onKeydown'    : (event: Partial<KeyboardEvent>) => void
  'tabindex'     : number
}

type Pick = (index: number) => void

function row(): HTMLElement[] {
  const buttons = [0, 1, 2].map(() => document.createElement('button'))
  document.createElement('div').append(...buttons)
  return buttons
}

describe('narrowAt', () => {
  it.each([[0, false], [NARROW - 1, true], [NARROW, false]])('reads %i pixels as narrow: %s', (width, narrow) => {
    expect(narrowAt(width)).toEqual({ height: 0, narrow, width })
  })
})

describe('pickable', () => {
  it('presses the place picked and gives the set one tab stop', () => {
    const [picked, other] = [pickable(1, 1, 3, vi.fn<Pick>()), pickable(0, 1, 3, vi.fn<Pick>())] as unknown as Picking[]
    expect([picked!['aria-pressed'], picked!.tabindex]).toEqual(['true', 0])
    expect([other!['aria-pressed'], other!.tabindex]).toEqual(['false', -1])
  })

  it('picks its place on a click', () => {
    const pick = vi.fn<Pick>()
    ;(pickable(2, 0, 3, pick) as unknown as Picking).onClick()
    expect(pick).toHaveBeenCalledWith(2)
  })

  it.each([['ArrowRight', 0, 2], ['ArrowDown', 0, 2], ['ArrowLeft', 2, 0], ['ArrowUp', 2, 0]])(
    'moves %s from the last place, wrapping, and focuses the place it reaches',
    (key, reached, from) => {
      const buttons = row()
      const pick    = vi.fn<Pick>()
      const stop    = vi.fn<() => void>()
      const focus   = vi.spyOn(buttons[reached]!, 'focus')
      ;(pickable(from, from, 3, pick) as unknown as Picking).onKeydown({
        currentTarget  : buttons[from]!,
        key            : key,
        preventDefault : stop
      })
      expect(pick).toHaveBeenCalledWith(reached)
      expect(stop).toHaveBeenCalled()
      expect(focus).toHaveBeenCalled()
    }
  )

  it('leaves any other key to the browser', () => {
    const pick = vi.fn<Pick>()
    ;(pickable(0, 0, 3, pick) as unknown as Picking).onKeydown({ key: 'a' })
    expect(pick).not.toHaveBeenCalled()
  })
})

describe('shareAlong', () => {
  const node = { getBoundingClientRect: () => ({ left: 100, width: 200 }) } as unknown as Element

  it.each([[200, 0.5], [50, 0], [400, 1]])('reads a pointer at %i as %f of the width', (clientX, share) => {
    expect(shareAlong({ clientX } as PointerEvent, node)).toBe(share)
  })
})
