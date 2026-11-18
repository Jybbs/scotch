import { describe, expect, it } from 'vitest'

import { SUBPATHS, guidePath } from '../../../lib/reference/construction.ts'
import { MARKS }               from '../../../lib/reference/marks.ts'

describe('SUBPATHS', () => {
  it('splits the one compound path into a path per part', () => {
    expect(SUBPATHS.join('')).toBe(MARKS.mark.paths[0])
  })
})

describe('owners', () => {
  it.each(MARKS.guides)('measures $name from subpaths the mark holds', ({ owners }) => {
    expect(Math.max(...owners)).toBeLessThan(SUBPATHS.length)
  })
})

describe('guidePath', () => {
  it.each([
    ['a level guide between two upright ticks', 'x', 'M10 -7V17M10 5H20M20 -7V17'],
    ['an upright guide between two level ticks', 'y', 'M-7 10H17M5 10V20M-7 20H17']
  ] as const)('draws %s', (_, axis, path) => {
    expect(guidePath({ at: 5, axis, end: 20, start: 10 })).toBe(path)
  })
})
