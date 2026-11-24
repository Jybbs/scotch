import { describe, expect, it } from 'vitest'

import { stepped, tabbed } from '../../../../docs/.vitepress/lib/data/keys.ts'

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

describe('tabbed', () => {
  it.each([
    { key: 'ArrowLeft', to: 0 },
    { key: 'ArrowRight', to: 2 },
    { key: 'Home', to: 0 },
    { key: 'End', to: 3 },
    { key: 'ArrowUp', to: undefined }
  ])('moves a row of four tabs at 1 to $to on $key', ({ key, to }) => {
    expect(tabbed(1, key, 4)).toBe(to)
  })

  it.each([
    { at: 0, key: 'ArrowUp', to: 3 },
    { at: 3, key: 'ArrowDown', to: 0 },
    { at: 1, key: 'ArrowLeft', to: undefined }
  ])('wraps a column of four tabs at $at to $to on $key', ({ at, key, to }) => {
    expect(tabbed(at, key, 4, 'y')).toBe(to)
  })
})
