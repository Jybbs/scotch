import { type Mock, describe, expect, it, vi } from 'vitest'

import { STEP_KEYS, useStepping } from '../../../lib/methods/stepping.ts'
import { test }                   from '../../common/clock.ts'

/**
 * Builds a key press the list of plies answers, its `preventDefault` a spy.
 */
function press(key: string): { event: KeyboardEvent, prevented: Mock<() => void> } {
  const prevented = vi.fn<() => void>()
  return { event: { key, preventDefault: prevented } as unknown as KeyboardEvent, prevented }
}

describe('useStepping', () => {
  it('opens on the ply it is given', () => {
    expect(useStepping(720, 18, 6).ply.value).toBe(6)
  })

  it.each([[-3, 0], [9, 9], [40, 18]])('steps toward ply %i and stands on ply %i', (to, ply) => {
    const stepping = useStepping(720, 18, 6)
    stepping.go(to)
    expect(stepping.ply.value).toBe(ply)
  })

  test('plays the line from the start, one ply per interval, and stops on its last', ({ clock }) => {
    const stepping = useStepping(720, 3, 2)
    stepping.play()
    expect([stepping.ply.value, stepping.playing.value]).toEqual([0, true])
    clock.advanceTimersByTime(720)
    expect(stepping.ply.value).toBe(1)
    clock.advanceTimersByTime(720 * 2)
    expect([stepping.ply.value, stepping.playing.value]).toEqual([3, false])
  })

  test('stops playing where the reader plays while it plays', ({ clock }) => {
    const stepping = useStepping(720, 18, 6)
    stepping.play()
    clock.advanceTimersByTime(720)
    stepping.play()
    clock.advanceTimersByTime(720 * 4)
    expect([stepping.ply.value, stepping.playing.value]).toEqual([1, false])
  })

  test('stops playing where the reader steps', ({ clock }) => {
    const stepping = useStepping(720, 18, 6)
    stepping.play()
    stepping.go(9)
    clock.advanceTimersByTime(720 * 4)
    expect([stepping.ply.value, stepping.playing.value]).toEqual([9, false])
  })
})

describe('useStepping keys', () => {
  it.each([['ArrowDown', 7], ['ArrowUp', 5], ['End', 18], ['Home', 0]])(
    'steps from ply 6 on %s to ply %i',
    (key, ply) => {
      const stepping             = useStepping(720, 18, 6)
      const { event, prevented } = press(key)
      stepping.answer(event)
      expect(stepping.ply.value).toBe(ply)
      expect(prevented).toHaveBeenCalledOnce()
    }
  )

  it('leaves a key the list does not answer to the page', () => {
    const stepping             = useStepping(720, 18, 6)
    const { event, prevented } = press('Tab')
    stepping.answer(event)
    expect(stepping.ply.value).toBe(6)
    expect(prevented).not.toHaveBeenCalled()
  })
})

describe('STEP_KEYS', () => {
  it("answers the listbox pattern's arrows, Home, and End", () => {
    expect(Object.keys(STEP_KEYS).toSorted()).toEqual(['ArrowDown', 'ArrowUp', 'End', 'Home'])
  })
})
