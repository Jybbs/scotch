// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h }   from 'vue'

import * as typing                   from '../../../../docs/.vitepress/lib/front/typing.ts'
import { test }                      from '../../common/clock.ts'
import { pauseMotion, reduceMotion } from '../../common/motion.ts'
import { onScreen }                  from '../../common/unfold.ts'

const TYPED: readonly typing.Typed[] = [{ command: 'scotch show store', out: ['Games 3', 'Files 2'] }]

/**
 * Mounts a terminal reading `useTyping` over `TYPED`, which exposes what it
 * holds.
 */
function mounted(): typing.Typing {
  let held: typing.Typing | undefined
  mount(defineComponent({
    setup: () => {
      const typed = typing.useTyping(TYPED, { enter: 4, line: 3, prompt: 2, type: 1 })
      held        = typed
      return () => h('div', { ref: typed.root })
    }
  }), { attachTo: document.body })
  return held!
}

describe('typing', () => {
  it('types the command a few characters a beat, then prints each line in turn', () => {
    const frames = typing.framesOf(TYPED)
    expect(frames[0]).toEqual({ printed: 0, step: 0, typed: 0 })
    expect(frames.slice(-2)).toEqual([
      { printed: 1, step: 0, typed: TYPED[0]!.command.length },
      { printed: 2, step: 0, typed: TYPED[0]!.command.length }
    ])
  })

  it.each([
    { frame: { printed: 1, step: 0, typed: 17 }, hold: typing.PACE.line },
    { frame: { printed: 0, step: 0, typed: 0 }, hold: typing.PACE.prompt },
    { frame: { printed: 0, step: 0, typed: 17 }, hold: typing.PACE.enter },
    { frame: { printed: 0, step: 0, typed: 5 }, hold: typing.PACE.type }
  ])('holds $frame for $hold milliseconds', ({ frame, hold }) => {
    expect(typing.holdOf(TYPED, frame)).toBe(hold)
  })

  test('plays once in view to its last frame, and a replay starts it over', async ({ clock }) => {
    const show  = onScreen()
    const typed = mounted()
    expect(typed.at.value).toBe(typed.frames.length - 1)
    await show()
    expect([typed.at.value, typed.playing.value]).toEqual([0, true])
    await clock.runAllTimersAsync()
    expect([typed.at.value, typed.playing.value]).toEqual([typed.frames.length - 1, false])
    typed.play()
    expect(typed.at.value).toBe(0)
    await flushPromises()
  })

  it('rests on its last frame while the site’s drawings hold still', async () => {
    reduceMotion()
    const show  = onScreen()
    const typed = mounted()
    await show()
    expect([typed.at.value, typed.playing.value]).toEqual([typed.frames.length - 1, false])
  })
})

describe('useTyping under a pause', () => {
  test('jumps to its last frame once the reader pauses the drawings mid-play', async ({ clock }) => {
    const show  = onScreen()
    const typed = mounted()
    await show()
    expect(typed.playing.value).toBe(true)
    await pauseMotion()
    expect([typed.at.value, typed.playing.value]).toEqual([typed.frames.length - 1, false])
    expect(clock.getTimerCount()).toBe(0)
  })
})
