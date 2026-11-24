// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import refused     from '../../../../../docs/.vitepress/lib/rendered/refused.json' with { type: 'json' }
import { Refused } from '../../../../../docs/.vitepress/theme/components/data/refused.ts'

describe('Refused', () => {
  it('reads as one sentence of a phrase per refusal, in the order the command checks them', () => {
    const drawn = mount(Refused)
    expect(drawn.findAll('button')).toHaveLength(refused.length)
    expect(drawn.find('p').text()).toMatch(/^A match refuses a file that .+, or .+\.$/u)
    expect(drawn.find('[role=region]').exists()).toBe(false)
  })

  it('unfolds one slip at a time, a second press folding it again', async () => {
    const drawn = mount(Refused)
    const terms = drawn.findAll('button')
    await terms[1]!.trigger('click')
    expect(drawn.find('[role=region] > code').text()).toBe(refused[1]!.message)
    expect(terms[1]!.attributes('aria-expanded')).toBe('true')
    await terms[0]!.trigger('click')
    expect(drawn.find('[role=region] > code').text()).toBe(refused[0]!.message)
    await terms[0]!.trigger('click')
    expect(drawn.find('[role=region]').exists()).toBe(false)
  })

  it('sets each code span and each option in the code face', async () => {
    const drawn = mount(Refused)
    const coded = refused.findIndex(({ clears, when }) => /`|--/u.test(clears + when))
    await drawn.findAll('button')[coded]!.trigger('click')
    expect(drawn.findAll('[role=region] dd code').length).toBeGreaterThan(0)
  })
})
