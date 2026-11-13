import { describe, expect, it } from 'vitest'

import { DURATIONS } from '../../../lib/motion/timing.ts'
import * as parts    from '../../../lib/readme/parts.ts'

/**
 * A frame holding on ply 3, and one halfway through the slide from ply 3 to 4.
 */
const HOLD    = { from: 3, span: 100, t: 20, to: 3 }
const HALFWAY = { from: 3, span: 100, t: 50, to: 4 }

describe('at', () => {
  it.each([
    { expected: '<g transform="translate(1 2)">b</g>', name: 'opaque', opacity: 1 },
    { expected: '<g transform="translate(1 2)" opacity="0.500">b</g>', name: 'faded', opacity: 0.5 },
    { expected: '', name: 'faded out', opacity: 0.001 }
  ])('places a drawing $name', ({ expected, opacity }) => {
    expect(parts.at(1, 2, 'b', opacity)).toBe(expected)
  })
})

describe('crossfade', () => {
  it('draws the ply alone while the frame holds', async () => {
    expect(await parts.crossfade(HOLD, ply => `p${ply}`)).toBe('p3')
  })

  it("fades the ply it leaves into the ply it reaches over the site's fade", async () => {
    const share = HALFWAY.t / DURATIONS.fade
    expect(await parts.crossfade(HALFWAY, ply => Promise.resolve(`p${ply}`))).toBe(
      `<g transform="translate(0 0)" opacity="${(1 - share).toFixed(3)}">p3</g>`
    + `<g transform="translate(0 0)" opacity="${share.toFixed(3)}">p4</g>`
    )
  })
})

describe('progress', () => {
  it.each([
    { expected: 1, frame: HOLD, name: 'a hold' },
    { expected: 0, frame: { ...HALFWAY, t: 0 }, name: 'the start of a slide' },
    { expected: 1, frame: { ...HALFWAY, t: 200 }, name: 'a frame past its span' }
  ])('reads $expected at $name', ({ expected, frame }) => {
    expect(parts.progress(frame)).toBeCloseTo(expected)
  })

  it('reads a slide past halfway at its middle, as the glide eases out', () => {
    expect(parts.progress(HALFWAY)).toBeGreaterThan(0.5)
  })
})

describe('rect and swatch', () => {
  it('write a rectangle carrying each attribute in the order given', () => {
    expect(parts.rect({ 'fill': '#000', 'stroke-width': 2 })).toBe('<rect fill="#000" stroke-width="2"/>')
    expect(parts.swatch('#111', 4, 5)).toBe('<rect fill="#111" height="9" rx="2" width="9" x="4" y="5"/>')
  })
})

describe('HEIGHT', () => {
  it('reaches from the top of the rings to the foot of the status line', () => {
    expect(parts.HEIGHT).toBe(parts.TOPS.status + parts.LAYOUT.line)
  })
})
