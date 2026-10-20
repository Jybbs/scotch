import { describe, expect, it } from 'vitest'

import * as measure from '../../../lib/front/measure.ts'

const rects: measure.Rects = {
  actions  : [rect(557, 327, 137, 40), rect(706, 327, 176, 40)],
  bar      : 64,
  foot     : rect(0, 1756, 1440, 89),
  hero     : rect(0, -100, 1440, 460),
  home     : rect(0, -100, 1440, 1628),
  scrollY  : 100,
  tagline  : [rect(514, 275, 410, 26)],
  width    : 1440,
  wordmark : rect(528, 157, 384, 102)
}

/**
 * Builds the box `getBoundingClientRect` reports for a left edge, a top edge, a
 * width, and a height.
 */
function rect(left: number, top: number, width: number, height: number): measure.Rect {
  return { bottom: top + height, height, left, top, width }
}

describe('measured', () => {
  it("reads every box from the bar's bottom edge at the page's top", () => {
    expect(measure.measured(rects).parts[0]).toEqual({ h: 102, w: 384, x: 528, y: 157 + 100 - 64 })
  })

  it('bounds the lockup by the wordmark, the tagline, and the actions together', () => {
    expect(measure.measured(rects).lock).toEqual({ h: 367 - 157, w: 924 - 514, x: 514, y: 193 })
  })

  it("reads the hero's depth below the bar, the page's depth, and the fade a little above the foot", () => {
    const { F, H, P, W } = measure.measured(rects)
    expect({ F, H, P, W }).toEqual({ F: 1756 + 100 - 64 - 40, H: 396, P: 1528 + 100 - 64, W: 1440 })
  })

  it("fades the loose pieces a little above the page's end where it shows no footer", () => {
    const { foot: _, ...bare } = rects
    const page                 = measure.measured(bare)
    expect(page.F).toBe(page.P - 40)
  })
})

describe('keyOf', () => {
  it('names a measure by its rounded figures', () => {
    expect(measure.keyOf(measure.measured(rects))).toBe('1440,396,1564,1752,514,193,410,210')
  })
})
