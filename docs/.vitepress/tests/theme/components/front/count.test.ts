// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { Count } from '../../../../theme/components/front/count.ts'

/**
 * Reads the digit each reel of a mounted count is rolled to, a mark between
 * reels read as itself.
 */
function rolled(count: ReturnType<typeof mount>): string[] {
  return count.findAll('.sc-front-reels > span').map(place =>
    place.classes('sc-front-place')
      ? (place.find('.sc-front-reel').element as HTMLElement).style.getPropertyValue('--sc-front-digit')
      : place.text())
}

describe('Count', () => {
  it('sets a reel of the ten digits for each digit place, rolled to its digit', () => {
    const count = mount(Count, { props: { figure: '98,542,793' } })
    expect(rolled(count)).toEqual([...'98,542,793'])
    expect(count.findAll('.sc-front-reel').map(reel => reel.text()))
      .toEqual(Array.from({ length: 8 }, () => '0123456789'))
  })

  it('reads the figure to a screen reader from a hidden copy rather than the reels', () => {
    const count = mount(Count, { props: { figure: '1,192' } })
    expect(count.find('.sc-front-reels').attributes('aria-hidden')).toBe('true')
    expect(count.find('.sc-front-spoken').text()).toBe('1,192')
  })

  it('keeps each place its reel as the figure widens, keyed from the right', async () => {
    const count = mount(Count, { props: { figure: '376' } })
    const units = count.findAll('.sc-front-reel').at(-1)!.element
    await count.setProps({ figure: '2,075' })
    expect(count.findAll('.sc-front-reel').at(-1)!.element).toBe(units)
    expect(rolled(count)).toEqual([...'2,075'])
  })

  it('shows the pulsing bar and no reels while the figure is empty', () => {
    const count = mount(Count, { props: { figure: '' } })
    expect(count.find('.sc-front-wait').exists()).toBe(true)
    expect(count.find('.sc-front-reels').exists()).toBe(false)
    expect(count.text()).toBe('')
  })
})
