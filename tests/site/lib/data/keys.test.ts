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
    { at: 1, axis: undefined, key: 'ArrowLeft', line: 'row', to: 0 },
    { at: 1, axis: undefined, key: 'ArrowRight', line: 'row', to: 2 },
    { at: 1, axis: undefined, key: 'Home', line: 'row', to: 0 },
    { at: 1, axis: undefined, key: 'End', line: 'row', to: 3 },
    { at: 1, axis: undefined, key: 'ArrowUp', line: 'row', to: undefined },
    { at: 0, axis: 'y', key: 'ArrowUp', line: 'column', to: 3 },
    { at: 3, axis: 'y', key: 'ArrowDown', line: 'column', to: 0 },
    { at: 1, axis: 'y', key: 'ArrowLeft', line: 'column', to: undefined }
  ] as const)('moves a $line of four tabs at $at to $to on $key', ({ at, axis, key, to }) => {
    expect(tabbed(at, key, 4, axis)).toBe(to)
  })
})
