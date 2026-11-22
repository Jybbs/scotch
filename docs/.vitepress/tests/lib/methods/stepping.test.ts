// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { nextTick }             from 'vue'

import { PACE, usePlayer }           from '../../../lib/methods/stepping.ts'
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

})

describe('usePlayer as stepped', () => {
  it.each([[-3, 0], [9, 9], [40, 18]])('jumps toward ply %i and stops on ply %i', (to, ply) => {
    const player = usePlayer(18, 12)
    player.jump(to)
    expect([player.ply.value, player.playing.value]).toEqual([ply, false])
  })

  test('stops where a step lands', async ({ clock }) => {
    const player = usePlayer(18, 12)
    player.step(4)
    await nextTick()
    clock.advanceTimersByTime(PACE.interval * 3)
    expect([player.ply.value, player.playing.value]).toEqual([4, false])
  })

  it('plays again from the start once toggled on the last ply', () => {
    const player = usePlayer(18, 12)
    player.jump(18)
    player.toggle()
    expect([player.ply.value, player.playing.value]).toEqual([0, true])
  })

  it('stops where a toggle pauses it', () => {
    const player = usePlayer(18, 12)
    player.toggle()
    expect([player.ply.value, player.playing.value]).toEqual([0, false])
  })

  it('stops once the reader pauses the motion switch', async () => {
    const player = usePlayer(18, 12)
    await pauseMotion()
    expect(player.playing.value).toBe(false)
  })
})
