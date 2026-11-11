// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { Layer } from '../../../../theme/components/front/layer.ts'

const drawn = vi.hoisted(() => ({ canvas: undefined as unknown }))

vi.mock('../../../../lib/front/layer.ts', () => ({
  useMarkLayer: (canvas: unknown) => {
    drawn.canvas = canvas
  }
}))

describe('Layer', () => {
  it('holds the canvas the mark is drawn into, hidden from a screen reader', () => {
    const layer = mount(Layer)
    expect(layer.attributes('aria-hidden')).toBe('true')
    expect(layer.find('canvas.sc-front-mark').exists()).toBe(true)
    expect((drawn.canvas as { value: unknown }).value).toBe(layer.find('canvas').element)
  })
})
