import { describe, expect, it } from 'vitest'

import { stepped } from '../../../lib/data/keys.ts'

describe('stepped', () => {
  it.each([
    { key: 'ArrowLeft', to: 4 },
    { key: 'ArrowRight', to: 6 },
    { key: 'ArrowDown', to: 4 },
    { key: 'ArrowUp', to: 6 },
    { key: 'PageUp', to: 10 },
    { key: 'PageDown', to: 1 },
    { key: 'Home', to: 1 },
    { key: 'End', to: 10 },
    { key: 'a', to: undefined }
  ])('moves a slider at 5 between 1 and 10 to $to on $key', ({ key, to }) => {
    expect(stepped(10, key, 1, 5)).toBe(to)
  })

  it.each(['ArrowDown', 'ArrowUp'])('leaves %s to something else where the slider is not vertical', key => {
    expect(stepped(10, key, 1, 5, false)).toBeUndefined()
  })
})
