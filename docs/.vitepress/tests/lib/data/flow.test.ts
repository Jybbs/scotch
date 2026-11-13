import { describe, expect, it } from 'vitest'

import * as flow from '../../../lib/data/flow.ts'
import * as tie  from '../../../lib/data/tie.ts'

describe('the figure of the tie order', () => {
  it.each([
    [720, false, 482, 74],
    [390, true, 390, 24]
  ])('lays out the flow at %i pixels, the places beside it unless narrow', (width, narrow, plot, gap) => {
    const layout = flow.flowLayout(width)
    expect([layout.narrow, layout.plot, layout.gap]).toEqual([narrow, plot, gap])
    expect(layout.tests).toEqual([plot * 0.3, plot * 0.6])
    expect(layout.height).toBe(34 + 196 + 2 * gap + 8)
    expect(layout.both).toBeCloseTo(tie.ratingKinds[0]!.share * 196)
    expect(layout.lanes.map(lane => lane.length)).toEqual([2, 4, 6])
    expect(layout.lanes[2]!.at(-1)![2]).toBeCloseTo(34 + 196 + 2 * gap)
    expect(layout.middles[0]).toBeCloseTo(34 + layout.both / 2)
  })

  it('draws a bar per bin, the tallest at its roof, and pins each game carrying both at its mean', () => {
    const layout = flow.flowLayout(720)
    const band   = flow.bandOf(layout)
    const most   = Math.max(...tie.meanBins.map(bin => bin.games))
    expect(band.bars).toHaveLength(tie.meanBins.length)
    expect(Math.min(...band.bars.map(bar => bar.y))).toBeCloseTo(layout.top + 62)
    for (const bar of band.bars) expect(bar.y + bar.height).toBeCloseTo(band.foot)
    expect(band.bars[tie.meanBins.findIndex(bin => bin.games === most)]!.height).toBeCloseTo(band.foot - 96)
    const [left, width] = [band.left, band.bars[1]!.column - band.bars[0]!.column]
    for (const [at, game] of tie.ratingKinds[0]!.games.entries())
      expect(band.pins[at]![0]).toBeCloseTo(left + ((game.key! - 2200) / 50 + 1) * width)
    expect(band.pins.map(([, y]) => y)).toEqual([60, 80, 60])
    expect(band.ticks.map(([, mean]) => mean)).toEqual([2300, 2500, 2700])
  })

  it('runs each tied game’s path through its own lane, from the source to the lane’s end', () => {
    const layout = flow.flowLayout(720)
    const band   = flow.bandOf(layout)
    for (const game of tie.tiedGames) {
      const lane = layout.lanes[2 - game.rated]!
      const { d, ends: [start, end] } = flow.pathOf(band, game, layout)
      expect(d.startsWith(`M${lane[0]![0]},`)).toBe(true)
      expect(start![1]).toBeGreaterThanOrEqual(lane[0]![1])
      expect(end![1]).toBeLessThanOrEqual(lane.at(-1)![2])
    }
    expect(flow.pathOf(band, tie.tiedGames[0]!, layout).ends[0]![1]).toBe(60)
  })

  it('writes a lane as a closed path out along its top and back along its foot', () => {
    expect(flow.ribbonOf([[0, 0, 10], [20, 5, 15]])).toBe('M0,0C10,0 10,5 20,5L20,15C10,15 10,10 0,10Z')
  })
})
