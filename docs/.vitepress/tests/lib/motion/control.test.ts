// @vitest-environment happy-dom
import { flushPromises, mount }            from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick }       from 'vue'

import { MOTION_KEY, type Motion, useMotion } from '../../../lib/motion/control.ts'
import { reduceMotion }                       from '../../common/motion.ts'

/**
 * Mounts a component calling `useMotion` and returns what the call returned.
 */
async function motion(): Promise<Motion> {
  let read: Motion | undefined
  mount(defineComponent({
    setup: () => {
      read = useMotion()
      return () => null
    }
  }))
  await flushPromises()
  return read!
}

afterEach(() => {
  sessionStorage.clear()
})

describe('useMotion', () => {
  it("moves and marks the root as playing while the reader's system states no preference", async () => {
    expect((await motion()).moving.value).toBe(true)
    expect(document.documentElement.dataset.motion).toBe('playing')
  })

  it('holds still and marks the root as paused under reduced motion', async () => {
    reduceMotion()
    expect((await motion()).moving.value).toBe(false)
    expect(document.documentElement.dataset.motion).toBe('paused')
  })

  it('plays under reduced motion once the reader presses play', async () => {
    reduceMotion()
    const { moving, toggle } = await motion()
    toggle()
    await nextTick()
    expect(moving.value).toBe(true)
    expect(sessionStorage.getItem(MOTION_KEY)).toBe('playing')
  })

  it('shares one choice across every call in the document', async () => {
    const [first, second] = [await motion(), await motion()]
    first.toggle()
    await flushPromises()
    expect(second.moving.value).toBe(false)
  })

  it('reads a choice kept from an earlier page of the visit', async () => {
    sessionStorage.setItem(MOTION_KEY, 'paused')
    expect((await motion()).moving.value).toBe(false)
  })
})
