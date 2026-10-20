import { describe, expect, it } from 'vitest'

import * as lengths            from '../../../lib/data/lengths.ts'
import { SAMPLE_STORE, SMALL } from './fixtures/store.ts'

const endings = lengths.endingsOf(SAMPLE_STORE, SMALL)

describe('endingsOf', () => {
  it('counts White won, drawn, and Black won at each move, gathering every game from the limit on', () => {
    expect(endings).toEqual([[1, 0, 1], [2, 1, 0], [1, 2, 1], [1, 2, 3]])
  })

  it('counts nothing at a move no game of the store plays', () => {
    expect(lengths.endingsOf(SAMPLE_STORE, { ...SMALL, limit: 6 }).slice(5)).toEqual([[0, 0, 0], [0, 0, 0]])
  })
})

describe('moveName', () => {
  it.each([
    { move: 2, name: '2' },
    { move: 3, name: '3+' }
  ])('names move $move as $name', ({ move, name }) => {
    expect(lengths.moveName(move, SMALL)).toBe(name)
  })
})

describe('sharesOf', () => {
  it('shares each move among the results over the moves within the smoothing of it', () => {
    expect(lengths.sharesOf(endings, SMALL)).toEqual([
      [3 / 7, 3 / 7, 1 / 7], [4 / 13, 5 / 13, 4 / 13], [2 / 10, 4 / 10, 4 / 10]
    ])
  })

  it('shares nothing at a move no game ends near', () => {
    expect(lengths.sharesOf([[0, 0, 0], [0, 0, 0]], { ...SMALL, plotted: 1 })).toEqual([[0, 0, 0]])
  })
})

describe('drawnShares', () => {
  it('reads the share drawn among the short games and among the games past the late move', () => {
    expect(lengths.drawnShares(endings, SMALL)).toEqual({ late: 2 / 6, short: 1 / 5 })
  })
})

describe('sharesSummary', () => {
  it('compares how often a short game and a long one is drawn', () => {
    const summary = lengths.sharesSummary(endings, SMALL)
    expect(summary).toBe('Of the stored games that end by move 1, 20% are drawn, '
                       + 'against 33% of those that run past move 2.')
    expect(summary).toReadAsProse()
  })
})

describe('sharesReading', () => {
  it('reads a move, its games, and each result beside its count', () => {
    expect(lengths.sharesReading(endings, 1, SMALL)).toEqual([
      ['Move', '1'], ['Ending here', '3'], ['White won', '67%', '2'], ['Drawn', '33%', '1'],
      ['Black won', '0%', '0']
    ])
  })

  it('reads a move no game ends at as no share of anything', () => {
    expect(lengths.sharesReading([[0, 0, 0]], 0, SMALL)[2]).toEqual(['White won', '0%', '0'])
  })
})

describe('sharesLayout', () => {
  it("lays the bands over the bars over the axis, leaving room for the gridlines' names", () => {
    expect(lengths.sharesLayout(500)).toEqual({
      bands  : { height: 190, top: 8 },
      bars   : { height: 58, top: 216 },
      height : 296,
      left   : 36,
      plot   : 456,
      width  : 500
    })
  })
})

describe('moveX', () => {
  it('centers a move in its own share of the plot', () => {
    expect(lengths.moveX({ left: 36, plot: 456 }, 1, 3)).toBe(112)
  })

  it('shares the plot among the moves the charts draw unless told otherwise', () => {
    expect(lengths.moveX({ left: 0, plot: 200 }, 1)).toBe(1)
  })
})

describe('moveAt', () => {
  it.each([
    { move: 1, x: 0 },
    { move: 1, x: 36 },
    { move: 1, x: 135 },
    { move: 2, x: 136 },
    { move: 3, x: 400 }
  ])('finds move $move under the point $x', ({ move, x }) => {
    expect(lengths.moveAt({ left: 36, plot: 300 }, x, SMALL)).toBe(move)
  })
})

describe('bandPath', () => {
  it("runs along a band's top edge and back along its bottom edge", () => {
    const layout = { ...lengths.sharesLayout(200), bands: { height: 100, top: 0 }, left: 0, plot: 200 }
    expect(lengths.bandPath([[0.5, 0.5, 0], [0.25, 0.25, 0.5]], 1, layout)).toBe('M50 0L150 50L150 75L50 50Z')
  })
})

describe('the settled tuning', () => {
  it('names only moves the charts draw on the axis', () => {
    expect([Math.min(...lengths.TICKS), Math.max(...lengths.TICKS)]).toEqual([1, lengths.CHART.plotted])
  })
})

describe('bandMiddle', () => {
  it('finds the middle of a band halfway through its share above the bands beneath it', () => {
    expect(lengths.bandMiddle(1, { bands: { height: 100, top: 0 } }, [0.5, 0.5, 0])).toBe(25)
  })
})
