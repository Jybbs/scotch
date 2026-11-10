// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, vi } from 'vitest'

import { IDENTITY } from '../../../../lib/identity/tokens.ts'
import { Faces }    from '../../../../theme/components/reference/faces.ts'
import { test }     from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { resized }  from '../../../common/size.ts'
import { onScreen } from '../../../common/unfold.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

function settled(clock: typeof vi): ReturnType<typeof mount> {
  onScreen()
  reduceMotion()
  const drawn = mount(Faces)
  clock.runAllTimers()
  return drawn
}

describe('Faces', () => {
  test('sets the score sheet in the three faces, its move numbers set apart', ({ clock }) => {
    const drawn = settled(clock)
    expect(drawn.find('h5').text()).toBe('The Longest Run')
    expect(drawn.findAll('.sc-ref-part').map(part => part.attributes('data-face'))).toEqual(['display', 'body', 'code'])
    expect(drawn.findAll('.sc-ref-number').length).toBe(7)
    expect(drawn.findAll('.sc-ref-moves span').length).toBe(21)
  })

  test('states each face beside what it sets, its package, and its license', ({ clock }) => {
    const facts = settled(clock).findAll('.sc-ref-fact')
    expect(facts.map(fact => fact.find('b').text())).toEqual(['display', 'body', 'code'].map(face =>
      IDENTITY.faces[face as 'body'].family))
    expect(facts[1]!.find('code').text()).toBe(`${IDENTITY.faces.body.package} · ${IDENTITY.faces.body.license}`)
    expect(facts[1]!.find('span').text()).toBe(IDENTITY.meanings.faces.body)
  })

  test("lights what a picked face sets and lets go on a second press", async ({ clock }) => {
    const drawn = settled(clock)
    const fact  = drawn.findAll('.sc-ref-fact')[2]!
    await fact.trigger('click')
    expect(fact.attributes('aria-pressed')).toBe('true')
    expect(drawn.find('.sc-ref-score').attributes('data-look')).toBe('')
    expect(drawn.find('[data-face="code"]').attributes('data-on')).toBe('')
    await fact.trigger('click')
    expect(fact.attributes('aria-pressed')).toBe('false')
    expect(drawn.find('.sc-ref-score').attributes('data-look')).toBeUndefined()
  })
})

describe('Faces, the tint behind a pick', () => {
  test('slides the tint to the picked row and off again', async ({ clock }) => {
    const drawn = settled(clock)
    const fact  = drawn.findAll('.sc-ref-fact')[1]!
    vi.spyOn(fact.element as HTMLElement, 'offsetHeight', 'get').mockReturnValue(40)
    vi.spyOn(fact.element as HTMLElement, 'offsetTop', 'get').mockReturnValue(60)
    await fact.trigger('click')
    expect(drawn.find('.sc-ref-block').attributes('style')).toContain('height: 40px')
    expect(drawn.find('.sc-ref-block').attributes('style')).toContain('translateY(60px)')
    await fact.trigger('click')
    expect(drawn.find('.sc-ref-block').attributes('style')).toContain('height: 0px')
  })

  test('measures the tint again once the column changes', async ({ clock }) => {
    const drawn = settled(clock)
    const fact  = drawn.findAll('.sc-ref-fact')[1]!
    await fact.trigger('click')
    vi.spyOn(fact.element as HTMLElement, 'offsetHeight', 'get').mockReturnValue(70)
    resized(342)
    await flushPromises()
    expect(drawn.find('.sc-ref-block').attributes('style')).toContain('height: 70px')
  })

  test('wipes each part in over its gray strokes and then lights each face', async ({ clock }) => {
    const show  = onScreen()
    const drawn = mount(Faces)
    await show()
    await flushPromises()
    expect(drawn.find('.sc-ref-part i').exists()).toBe(true)
    expect(drawn.find('.sc-ref-words').attributes('style')).toContain('inset(-2px 100% -2px 0)')
    clock.advanceTimersByTime(4100)
    await flushPromises()
    expect(drawn.findAll('.sc-ref-fact')[0]!.attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(700)
    await flushPromises()
    expect(drawn.findAll('.sc-ref-fact')[1]!.attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(700)
    await flushPromises()
    expect(drawn.findAll('.sc-ref-fact')[2]!.attributes('aria-pressed')).toBe('true')
    clock.advanceTimersByTime(800)
    await flushPromises()
    expect(drawn.findAll('.sc-ref-fact').every(fact => fact.attributes('aria-pressed') === 'false')).toBe(true)
  })
})
