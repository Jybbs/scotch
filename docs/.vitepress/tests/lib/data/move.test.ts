// @vitest-environment happy-dom
import { describe, expect, it, onTestFinished } from 'vitest'
import { nextTick }                             from 'vue'

import { CHART }             from '../../../lib/data/lengths.ts'
import { useGlide, useMove } from '../../../lib/data/move.ts'
import { DURATIONS }         from '../../../lib/motion/timing.ts'
import { test }              from '../../common/clock.ts'
import { reduceMotion }      from '../../common/motion.ts'

describe('useMove', () => {
  it('hands every caller the one move, opening on the move the charts open on', () => {
    expect(useMove()).toBe(useMove())
    expect(useMove().value).toBe(CHART.opening)
  })
})

describe('useGlide', () => {
  it('follows the move at once for a reader who prefers reduced motion', async () => {
    reduceMotion()
    const move  = useMove()
    const glide = useGlide(move)
    onTestFinished(() => {
      move.value = CHART.opening
    })
    move.value = 12
    await nextTick()
    expect([glide.quick.value, glide.shown.value]).toEqual([false, 12])
  })

  test.for([
    [true, true],
    [false, false]
  ] as const)('reaches the move by the shorter duration a pointer takes only where quick is %s', async (
    [quick, reached],
    { clock }
  ) => {
    const move  = useMove()
    const glide = useGlide(move)
    onTestFinished(() => {
      move.value = CHART.opening
    })
    glide.quick.value = quick
    move.value        = 12
    await nextTick()
    clock.advanceTimersByTime(DURATIONS.move + 20)
    await nextTick()
    expect(glide.shown.value === 12).toBe(reached)
  })
})
