// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { Opening }      from '../../../../../docs/.vitepress/theme/components/front/opening.ts'
import { test }         from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { onScreen }     from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

describe('Opening', () => {
  test(
    'rests whole until it plays, then fills the rails as the report names the run and parting',
    async ({ clock }) => {
      const show  = onScreen()
      const drawn = mount(Opening)
      const stage = (): string | undefined => drawn.find('[data-stage]').attributes('data-stage')
      expect(drawn.find('[data-says]').text()).toMatch(/^A match is .+\.$/u)
      expect(stage()).toBe('whole')
      await show()
      expect(stage()).toBe('empty')
      expect(drawn.find("button[aria-label='Replay the session']").attributes('disabled')).toBeDefined()
      const stages: (string | undefined)[] = []
      new MutationObserver(() => {
        stages.push(stage())
      }).observe(drawn.find('[data-stage]').element, { attributeFilter: ['data-stage'] })
      await clock.runAllTimersAsync()
      expect(stages).toEqual(['run', 'whole'])
      await drawn.find("button[aria-label='Replay the session']").trigger('click')
      expect(stage()).toBe('empty')
    }
  )

  it('shows the whole session with no replay while the site’s drawings hold still', () => {
    reduceMotion()
    const drawn = mount(Opening)
    expect(drawn.find("button[aria-label='Replay the session']").exists()).toBe(false)
    expect(drawn.find('pre > div:last-child').findAll('[data-out]')).toHaveLength(3)
  })
})
