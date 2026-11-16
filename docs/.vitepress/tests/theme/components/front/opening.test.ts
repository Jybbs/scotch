// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { Opening }      from '../../../../theme/components/front/opening.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { onScreen }     from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

describe('Opening', () => {
  it('rests whole until it plays, then fills the rails as the report names the run and parting', async () => {
    vi.useFakeTimers()
    const show  = onScreen()
    const drawn = mount(Opening)
    const stage = (): string | undefined => drawn.find('.sc-front-rails').attributes('data-stage')
    expect(drawn.find('.sc-front-says').text()).toMatch(/^A match is .+\.$/u)
    expect(stage()).toBe('whole')
    await show()
    expect(stage()).toBe('empty')
    expect(drawn.find('.sc-front-replay').attributes('disabled')).toBeDefined()
    await vi.waitFor(() => { expect(stage()).toBe('run') }, { interval: 50, timeout: 5000 })
    await vi.runAllTimersAsync()
    expect(stage()).toBe('whole')
    await drawn.find('.sc-front-replay').trigger('click')
    expect(stage()).toBe('empty')
    vi.useRealTimers()
  })

  it('shows the whole session with no replay while the site’s drawings hold still', () => {
    reduceMotion()
    const drawn = mount(Opening)
    expect(drawn.find('.sc-front-replay').exists()).toBe(false)
    expect(drawn.find('.sc-front-live').findAll('.sc-front-out')).toHaveLength(3)
  })
})
