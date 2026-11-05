import { describe, expect, it } from 'vitest'

import { IDENTITY }  from '../../../lib/identity/tokens.ts'
import * as series   from '../../../lib/reference/series.ts'

const ON = series.FILES.map(() => 1)

describe('FILES', () => {
  it('gives each charted file the next series of the palette', () => {
    expect(series.FILES.map(file => file.hex)).toEqual(series.FILES.map((_, index) =>
      IDENTITY.palette[`series_${index + 1}` as 'series_1'].hex))
  })

  it('counts every file over one list of decades', () => {
    expect(series.FILES.every(file => file.counts.length === series.DECADES.length)).toBe(true)
  })
})

describe('curveOf', () => {
  it('moves to the first point and bends level through the middle of each span', () => {
    expect(series.curveOf([[0, 0], [10, 20]])).toBe('M0.0 0.0C5.0 0.0 5.0 20.0 10.0 20.0')
  })
})

function fileOf(counts: number[]): series.File {
  return { counts, games: 0, hex: '', name: '', token: 'series_1' }
}

describe('spanOf', () => {
  it("keeps one decade either side of a file's games", () => {
    expect(series.spanOf(fileOf([0, 0, 3, 4, 0, 0]))).toEqual([1, 4])
  })

  it('stops at the ends of the decades', () => {
    expect(series.spanOf(fileOf([1, 2]))).toEqual([0, 1])
  })
})

describe('stepOf', () => {
  it.each([[1, 1], [1.5, 2], [3, 5], [7, 10], [120, 200]])('rounds %f up to %f', (value, step) => {
    expect(series.stepOf(value)).toBe(step)
  })
})

describe('linesAt', () => {
  it('draws a path per file within its width', () => {
    const { ds, xs } = series.linesAt(640, ON)
    expect(ds.length).toBe(series.FILES.length)
    expect(xs(0)).toBe(series.CHART.left)
    expect(xs(series.DECADES.length - 1)).toBe(640 - series.CHART.right)
  })

  it('scales the chart to the files switched on', () => {
    const all   = series.linesAt(640, ON)
    const least = series.FILES.map(file => Math.max(...file.counts)).indexOf(
      Math.min(...series.FILES.map(file => Math.max(...file.counts)))
    )
    const alone = series.linesAt(640, ON.map((_, index) => Number(index === least)))
    expect(alone.ys(100)).toBeLessThan(all.ys(100))
  })

  it('labels every other decade, every fourth at a phone, the ends anchored inward', () => {
    const wide   = series.linesAt(640, ON).axis
    const narrow = series.linesAt(342, ON).axis
    expect(narrow.length).toBeLessThan(wide.length)
    expect(wide[0]!.anchor).toBe('start')
    expect(wide[1]!.anchor).toBe('middle')
  })

  it('keeps a floor under the scale with every file switched off', () => {
    expect(series.linesAt(640, ON.map(() => 0)).rows[0]!.y).toBe(series.CHART.height - series.CHART.foot)
  })

  it('labels the rows in whole games with every file switched off', () => {
    expect(series.linesAt(640, ON.map(() => 0)).rows.map(row => row.label)).toEqual([0, 1, 2])
  })
})

describe('sparksOf', () => {
  it("writes each file's line inside its 100-by-40 box", () => {
    const sparks = series.sparksOf()
    expect(sparks.length).toBe(series.FILES.length)
    const values = sparks.flatMap(spark => [...spark.matchAll(/-?[\d.]+/gu)].map(([found]) => Number(found)))
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...values)).toBeLessThanOrEqual(100)
  })
})
