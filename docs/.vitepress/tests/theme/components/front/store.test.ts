// @vitest-environment happy-dom
import { flushPromises, mount }            from '@vue/test-utils'
import { afterEach, describe, expect, vi } from 'vitest'

import { counted }                     from '../../../../lib/data/numbers.ts'
import { SQUARES, decadesOf, fillsOf } from '../../../../lib/front/census.ts'
import { Store }                       from '../../../../theme/components/front/store.ts'
import { test }                        from '../../../common/clock.ts'
import { reduceMotion }                from '../../../common/motion.ts'

const decades = decadesOf()

vi.mock('../../../../lib/front/census.ts', async original => {
  const census = await original<typeof import('../../../../lib/front/census.ts')>()
  return { ...census, fillsOf: vi.fn<typeof census.fillsOf>(census.fillsOf) }
})

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementVisibility: () => ({ value: true })
}))

afterEach(() => {
  sessionStorage.clear()
})

describe('Store', () => {
  test('leaves a square no decade fills empty', async () => {
    vi.mocked(fillsOf).mockReturnValueOnce([])
    const store = mount(Store)
    await flushPromises()
    expect(store.findAll('.sc-front-store > span')).toHaveLength(SQUARES)
    expect(store.findAll('.sc-front-store i')).toHaveLength(0)
  })

  test('draws the store as one board of 64 squares, a row per decade beside it', async () => {
    const store = mount(Store)
    await flushPromises()
    expect(store.findAll('.sc-front-store > span')).toHaveLength(SQUARES)
    expect(store.findAll('.sc-front-eras > div')).toHaveLength(decades.length)
  })

  test('opens on the earliest decade, its games drawn full on the board', async () => {
    const store = mount(Store)
    await flushPromises()
    expect(store.find('.sc-data-big').text()).toBe(counted(decades[0]!.games))
    expect(store.findAll('.sc-front-store i[data-on]').length).toBeGreaterThan(0)
    expect(store.find('.sc-data-say').text()).toContain(`games played ${decades[0]!.when}`)
  })

  test('plays the decades on the clock', async ({ clock }) => {
    const store = mount(Store)
    await flushPromises()
    clock.advanceTimersByTime(1300)
    await flushPromises()
    expect(store.find('.sc-front-eras > div[data-on]').text()).toContain(decades[1]!.short)
  })

  test('moves to a decade its row is pressed on', async () => {
    const store = mount(Store)
    await flushPromises()
    await store.findAll('.sc-front-eras > div')[2]!.trigger('click')
    expect(store.find('[role=slider]').attributes('aria-valuetext')).toBe(decades[2]!.name)
  })

  test('stands on the latest decade while the drawings hold still', async () => {
    reduceMotion()
    const store = mount(Store)
    await flushPromises()
    expect(store.find('[role=slider]').attributes('aria-valuetext')).toBe(decades.at(-1)!.name)
  })
})
