import { describe, expect, it } from 'vitest'

import { figureOf } from '../../../lib/markdown/figures.ts'
import runs         from '../../../../pages/methods/runs.md?raw'

describe('figureOf', () => {
  it('reads the figure a page sets between its markers', () => {
    expect(figureOf('meet at ply <!-- start -->7<!-- /start -->.', 'start')).toBe('7')
  })

  it('trims the space around a figure', () => {
    expect(figureOf('meet at ply <!-- start --> 7\n<!-- /start -->.', 'start')).toBe('7')
  })

  it('reads the players The Longest Run names', () => {
    expect([figureOf(runs, 'methods-white'), figureOf(runs, 'methods-black')]).toEqual(['Timman', 'Klein'])
  })

  it.each([['no markers', 'plain text'], ['an opening marker alone', '<!-- start -->7']])(
    'refuses a page with %s',
    (_, page) => {
      expect(() => figureOf(page, 'start')).toThrow('no figure start')
    }
  )
})
