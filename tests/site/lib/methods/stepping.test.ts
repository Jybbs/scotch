// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { nextTick }                 from 'vue'

import { PACE, usePlayer }           from '../../../../docs/.vitepress/lib/methods/stepping.ts'
import { test }                      from '../../common/clock.ts'
import { pauseMotion, reduceMotion } from '../../common/motion.ts'

describe('usePlayer as played', () => {
  it('opens on the start and plays while the drawings move', () => {
    const player = usePlayer(18, 12)
    expect([player.ply.value, player.playing.value]).toEqual([0, true])
  })

  it('opens on the still ply, holding still, where the reader prefers reduced motion', () => {
    reduceMotion()
    const player = usePlayer(18, 12)
    expect([player.ply.value, player.playing.value]).toEqual([12, false])
  })

  test('steps a ply each interval and rests on the last before starting again', async ({ clock }) => {
    const player = usePlayer(2, 1)
    await nextTick()
    clock.advanceTimersByTime(PACE.interval * 2)
    expect(player.ply.value).toBe(2)
    clock.advanceTimersByTime(PACE.rest - 1)
    expect(player.ply.value).toBe(2)
    clock.advanceTimersByTime(1)
    expect(player.ply.value).toBe(0)
  })

  test('arms no timer where no browser exists, as on the server', async ({ clock }) => {
    vi.resetModules()
    vi.doMock('@vueuse/core', async original =>
      ({ ...await original<typeof import('@vueuse/core')>(), isClient: false }))
    const served = await import('../../../../docs/.vitepress/lib/methods/stepping.ts')
    expect(served.usePlayer(18, 12).playing.value).toBe(true)
    expect(clock.getTimerCount()).toBe(0)
    vi.doUnmock('@vueuse/core')
  })
})

describe('usePlayer as stepped', () => {
  it.each<[string, (player: ReturnType<typeof usePlayer>) => void, number, boolean]>([
    ['jumps toward ply -3 and stops on ply 0', player => { player.jump(-3) }, 0, false],
    ['jumps toward ply 9 and stops on ply 9', player => { player.jump(9) }, 9, false],
    ['jumps toward ply 40 and stops on ply 18', player => { player.jump(40) }, 18, false],
    [
      'plays again from the start once toggled on the last ply',
      player => {
        player.jump(18)
        player.toggle()
      },
      0,
      true
    ],
    ['stops where a toggle pauses it', player => { player.toggle() }, 0, false]
  ])('%s', (_, acted, ply, playing) => {
    const player = usePlayer(18, 12)
    acted(player)
    expect([player.ply.value, player.playing.value]).toEqual([ply, playing])
  })

  test('stops where a step lands', async ({ clock }) => {
    const player = usePlayer(18, 12)
    player.step(4)
    await nextTick()
    clock.advanceTimersByTime(PACE.interval * 3)
    expect([player.ply.value, player.playing.value]).toEqual([4, false])
  })

  it('stops once the reader pauses the motion switch', async () => {
    const player = usePlayer(18, 12)
    await pauseMotion()
    expect(player.playing.value).toBe(false)
  })
})
