// @vitest-environment happy-dom
import { flushPromises, mount }               from '@vue/test-utils'
import { afterEach, describe, expect, vi }      from 'vitest'
import { defineComponent, nextTick, shallowRef } from 'vue'

import { type Drive, useDrive } from '../../../lib/front/drive.ts'
import { MOTION_KEY }           from '../../../lib/motion/control.ts'
import { test }                 from '../../common/clock.ts'
import { reduceMotion }         from '../../common/motion.ts'

const seen   = shallowRef(true)
const TUNING = { count: 3, interval: 100, rest: 1, settle: 2, start: 0 }

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementVisibility: () => seen
}))

/**
 * Mounts a component playing a drive on `TUNING` and returns the drive.
 */
async function driven(): Promise<Drive> {
  let drive: Drive | undefined
  mount(defineComponent({
    setup: () => {
      drive = useDrive(shallowRef(null), TUNING)
      return () => null
    }
  }))
  await flushPromises()
  return drive!
}

afterEach(() => {
  seen.value = true
  sessionStorage.clear()
})

describe('useDrive', () => {
  test('plays each step on the clock, rests on the last, and starts over', async ({ clock }) => {
    const { at } = await driven()
    const steps  = [] as number[]
    for (let beat = 0; beat < 5; beat++) {
      clock.advanceTimersByTime(TUNING.interval)
      steps.push(at.value)
    }
    expect(steps).toEqual([1, 2, 2, 0, 1])
  })

  test('holds while a pointer or focus rests on the panel', async ({ clock }) => {
    const { at, hold } = await driven()
    hold(true)
    await nextTick()
    clock.advanceTimersByTime(TUNING.interval * 3)
    expect(at.value).toBe(0)
    hold(false)
    await nextTick()
    clock.advanceTimersByTime(TUNING.interval)
    expect(at.value).toBe(1)
  })

  test('holds while the panel is off the screen', async ({ clock }) => {
    seen.value   = false
    const { at } = await driven()
    clock.advanceTimersByTime(TUNING.interval * 3)
    expect(at.value).toBe(0)
  })

})

describe('useDrive while the drawings hold still', () => {
  test('stands on its settle step while the drawings hold still, until a pick', async ({ clock }) => {
    reduceMotion()
    const { at, go } = await driven()
    expect(at.value).toBe(TUNING.settle)
    go(1)
    clock.advanceTimersByTime(TUNING.interval * 3)
    expect(at.value).toBe(1)
  })

  test('settles once the reader pauses the drawings', async () => {
    const { at } = await driven()
    sessionStorage.setItem(MOTION_KEY, 'paused')
    const event = { key: MOTION_KEY, newValue: 'paused', storageArea: sessionStorage }
    window.dispatchEvent(new StorageEvent('storage', event))
    await flushPromises()
    expect(at.value).toBe(TUNING.settle)
  })

})

describe('useDrive under a pick', () => {
  test('starts its rest over once the reader picks a step', async ({ clock }) => {
    const { at, go } = await driven()
    clock.advanceTimersByTime(TUNING.interval * 3)
    go(2)
    clock.advanceTimersByTime(TUNING.interval)
    expect(at.value).toBe(2)
  })
})
