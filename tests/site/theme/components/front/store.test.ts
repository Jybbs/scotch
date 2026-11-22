// @vitest-environment happy-dom
import { flushPromises, mount }            from '@vue/test-utils'
import { afterEach, describe, expect, vi } from 'vitest'

import { counted }                     from '../../../../../docs/.vitepress/lib/data/numbers.ts'
import { SQUARES, decadesOf, fillsOf } from '../../../../../docs/.vitepress/lib/front/census.ts'
import { Store }                       from '../../../../../docs/.vitepress/theme/components/front/store.ts'
import { homed, test }                 from '../../../common/clock.ts'
import { reduceMotion }                from '../../../common/motion.ts'

const decades = decadesOf()

vi.mock('../../../../../docs/.vitepress/lib/front/census.ts', async original => {
  const census = await original<typeof import('../../../../../docs/.vitepress/lib/front/census.ts')>()
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
    expect(store.findAll('[data-shade]')).toHaveLength(SQUARES)
    expect(store.findAll('[data-shade] i')).toHaveLength(0)
  })

  test('draws the store as one board of 64 squares, a row per decade beside it', async () => {
    const store = mount(Store)
    await flushPromises()
    expect(store.findAll('[data-shade]')).toHaveLength(SQUARES)
    expect(store.findAll('[data-eras] > div')).toHaveLength(decades.length)
  })

  test('starts over on the earliest decade, its games drawn full on the board', async () => {
    const store = mount(Store)
    await flushPromises()
    await homed(store)
    expect(store.find('[data-spoken]').text()).toBe(counted(decades[0]!.games))
    expect(store.findAll('[data-shade] i[data-on]').length).toBeGreaterThan(0)
    expect(store.find('[data-unit]').text()).toBe('games')
    expect(store.find('[data-say]').text()).toContain(`Played ${decades[0]!.when}`)
  })

  test('plays the decades on the clock', async ({ clock }) => {
    const store = mount(Store)
    await flushPromises()
    await homed(store)
    clock.advanceTimersByTime(1300)
    await flushPromises()
    expect(store.find('[data-eras] > div[data-on]').text()).toContain(decades[1]!.short)
  })

  test('moves to a decade its row is pressed on', async () => {
    const store = mount(Store)
    await flushPromises()
    await store.findAll('[data-eras] > div')[2]!.trigger('click')
    expect(store.find('[role=slider]').attributes('aria-valuetext')).toBe(decades[2]!.name)
  })

  test('stands on the latest decade while the drawings hold still', async () => {
    reduceMotion()
    const store = mount(Store)
    await flushPromises()
    expect(store.find('[role=slider]').attributes('aria-valuetext')).toBe(decades.at(-1)!.name)
  })
})
