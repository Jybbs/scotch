import { describe, expect, it } from 'vitest'

import { SUBPATHS, guidePath }         from '../../../lib/reference/construction.ts'
import { MARKS }                       from '../../../lib/reference/marks.ts'

describe('SUBPATHS', () => {
  it('splits the one compound path into a path per part', () => {
    expect(SUBPATHS.length).toBe(5)
    expect(SUBPATHS.join('')).toBe(MARKS.mark.paths[0])
  })
})

describe('owners', () => {
  it('names the subpaths each guide measures, among those the mark holds', () => {
    expect(MARKS.guides.flatMap(guide => guide.owners).every(owner => owner < SUBPATHS.length)).toBe(true)
  })
})

describe('guidePath', () => {
  it('draws a level guide between two upright ticks', () => {
    expect(guidePath({ at: 5, axis: 'x', end: 20, start: 10 })).toBe('M10 -7V17M10 5H20M20 -7V17')
  })

  it('draws an upright guide between two level ticks', () => {
    expect(guidePath({ at: 5, axis: 'y', end: 20, start: 10 })).toBe('M-7 10H17M5 10V20M-7 20H17')
  })
})
