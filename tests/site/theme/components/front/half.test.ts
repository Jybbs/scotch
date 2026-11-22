// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { frontOf } from '../../../../../docs/.vitepress/lib/front/example.ts'
import { Half }    from '../../../../../docs/.vitepress/theme/components/front/half.ts'

const { submitted } = frontOf().example

describe('Half', () => {
  it.each([[0, '0'], [1, '1']])('marks the square the move to ply %i landed on at %s', (ply, opacity) => {
    const half = mount(Half, { props: { game: 'submitted', label: 'A board', position: submitted[ply]! } })
    expect((half.find('[data-landed]').element as HTMLElement).style.opacity).toBe(opacity)
  })
})
