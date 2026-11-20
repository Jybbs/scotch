// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { cursor } from '../../../../theme/components/front/terminal.ts'

describe('cursor', () => {
  it('blinks only while the drawings play', () => {
    const blink = mount({ render: cursor }).get('[data-cursor]')
    expect(blink.classes()).toContain('playing:animate-blink')
    expect(blink.classes()).not.toContain('animate-blink')
  })
})
