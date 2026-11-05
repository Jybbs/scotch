// @vitest-environment happy-dom
import { flushPromises, mount }  from '@vue/test-utils'
import { describe, expect, vi }  from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { useBeats, useUnfold, type Beats, type Story } from '../../../lib/reference/timeline.ts'
import { test }         from '../../common/clock.ts'
import { reduceMotion } from '../../common/motion.ts'
import { onScreen }     from '../../common/unfold.ts'

function story(play: Story['play'] = vi.fn<Story['play']>()): Story {
  return { length: 1000, play, prime: vi.fn<() => void>(), settle: vi.fn<() => void>() }
}

function drawn(told: Story): ReturnType<typeof mount> {
  return mount(defineComponent({
    setup() {
      const node = ref<HTMLElement>()
      useUnfold(node, useBeats(), told)
      return () => h('div', { ref: node, tabindex: 0 })
    }
  }))
}

function held(run: (beats: Beats) => void): ReturnType<typeof mount> {
  return mount(defineComponent({
    setup() {
      run(useBeats())
      return () => h('div')
    }
  }))
}

describe('useBeats', () => {
  test('runs a timer once its time passes and drops one stopped first', ({ clock }) => {
    const run = vi.fn<() => void>()
    held(beats => {
      beats.at(100, run)
      clock.advanceTimersByTime(100)
      expect(run).toHaveBeenCalledTimes(1)
      beats.at(100, run)
      beats.stop()
    })
    clock.advanceTimersByTime(200)
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('tweens from nothing to the end and reports its end', ({ clock }) => {
    const paint = vi.fn<(eased: number, share: number) => void>()
    const done  = vi.fn<() => void>()
    held(beats => beats.tween(100, paint, { done, ease: share => share }))
    clock.advanceTimersByTime(200)
    expect(paint.mock.lastCall).toEqual([1, 1])
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('waits out a delay before the first paint', ({ clock }) => {
    const paint = vi.fn<(eased: number, share: number) => void>()
    held(beats => beats.tween(100, paint, { delay: 500 }))
    clock.advanceTimersByTime(200)
    expect(paint).not.toHaveBeenCalled()
    clock.advanceTimersByTime(800)
    expect(paint).toHaveBeenCalled()
  })
})

describe('useBeats, canceling', () => {
  test('replaces a glide with the next and cancels one it halts', ({ clock }) => {
    const first  = vi.fn<(eased: number) => void>()
    const second = vi.fn<(eased: number) => void>()
    held(beats => {
      beats.halt()
      beats.glide(100, first)
      beats.glide(100, second)
      beats.halt()
    })
    clock.advanceTimersByTime(200)
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
  })

  test('cancels what is still moving and forgets a move once it finishes', () => {
    onScreen()
    const cancel = vi.fn<() => void>()
    const moves  = [] as Animation[]
    vi.mocked(Element.prototype.animate).mockImplementation(() => {
      const move = { cancel } as unknown as Animation
      moves.push(move)
      return move
    })
    const node = document.createElement('div')
    held(beats => {
      beats.move(node, [], {})
      beats.move(node, [], {})
      moves[0]!.onfinish?.({} as AnimationPlaybackEvent)
      beats.stop()
    })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  test('paints a tween at its end at once and starts no move under reduced motion', () => {
    reduceMotion()
    onScreen()
    const paint = vi.fn<(eased: number, share: number) => void>()
    const done  = vi.fn<() => void>()
    held(beats => {
      beats.tween(100, paint, { done })
      beats.tween(100, paint)
      beats.move(document.createElement('div'), [], {})
    })
    expect(paint.mock.calls).toEqual([[1, 1], [1, 1]])
    expect(done).toHaveBeenCalledTimes(1)
    expect(Element.prototype.animate).not.toHaveBeenCalled()
  })
})

describe('useUnfold', () => {
  test('waits in the primed state until the drawing comes on screen', () => {
    onScreen()
    const told = story()
    drawn(told)
    expect(told.prime).toHaveBeenCalledTimes(1)
    expect(told.play).not.toHaveBeenCalled()
  })

  test('plays once, however often the drawing comes on screen', async () => {
    const show = onScreen()
    const told = story()
    drawn(told)
    await show()
    await show()
    expect(told.play).toHaveBeenCalledTimes(1)
  })

  test('settles at its length or as it reports its end', async ({ clock }) => {
    const show  = onScreen()
    const early = story((_, done) => {
      done()
    })
    drawn(early)
    await show()
    expect(early.settle).toHaveBeenCalledTimes(1)
    const told = story()
    drawn(told)
    await show()
    clock.advanceTimersByTime(1000)
    expect(told.settle).toHaveBeenCalledTimes(1)
  })
})

describe('useUnfold, as a reader touches it', () => {
  test('settles as a reader touches it, and leaves Tab and Shift to the page', async () => {
    const show  = onScreen()
    const told  = story()
    const drawing = drawn(told)
    await drawing.trigger('pointerdown')
    expect(told.settle).not.toHaveBeenCalled()
    await show()
    await drawing.trigger('keydown', { key: 'Tab' })
    await drawing.trigger('keydown', { key: 'Shift' })
    expect(told.settle).not.toHaveBeenCalled()
    await drawing.trigger('keydown', { key: 'a' })
    expect(told.settle).toHaveBeenCalledTimes(1)
    await drawing.trigger('pointerdown')
    expect(told.settle).toHaveBeenCalledTimes(1)
  })

  test('goes straight to the end under reduced motion and plays nothing', async () => {
    reduceMotion()
    const show = onScreen()
    const told = story()
    drawn(told)
    await flushPromises()
    await show()
    expect(told.settle).toHaveBeenCalled()
    expect(told.play).not.toHaveBeenCalled()
  })
})
