import { describe, expect, it, vi } from 'vitest'

import { KINDS }             from '../../../lib/front/example.ts'
import { LAYERS }            from '../../../lib/front/layers.ts'
import * as painter          from '../../../lib/front/painter.ts'
import type { Frame, Stamp } from '../../../lib/front/scene.ts'
import { context }           from '../../common/page.ts'

const BITMAP                     = {} as CanvasImageSource
const drawings: painter.Drawings = {
  bitmaps : new Map([[painter.bitmapKey('ink', 'p', 17), BITMAP]]),
  clip    : 64,
  height  : 900,
  run     : 'rgb(1, 2, 3)',
  sizes   : [11, 17],
  width   : 1440
}

/**
 * Builds one stamp of a pawn at 100, 200 in a coloring at a size.
 */
function pawnFrame(layer: Stamp['layer'], size: number): Frame {
  return { rings: [], stamps: [{ alpha: 0.5, layer, piece: 'p', size, x: 100, y: 200 }] }
}

describe('sizesOf', () => {
  it('lists the loose size and the size in place, rounded up, once each', () => {
    expect(painter.sizesOf({ loose: 17, size: 16.2 })).toEqual([17])
    expect(painter.sizesOf({ loose: 11, size: 9.4 })).toEqual([11, 10])
  })
})

describe('needed', () => {
  it('lists every coloring of every piece at every size', () => {
    expect(painter.needed({ loose: 11, size: 9.4 })).toHaveLength(2 * LAYERS.length * KINDS.length)
  })
})

describe('paint', () => {
  it('draws each stamp from the drawing at the size nearest its own, centered on its point', () => {
    const g = context()
    painter.paint(g, drawings, pawnFrame('ink', 16))
    expect(g.drawImage).toHaveBeenCalledWith(BITMAP, 92, 192, 16, 16)
    expect(g.globalAlpha).toBe(0.5)
  })

  it('draws a stamp nearer the smaller size from the drawing at that size', () => {
    const g       = context()
    const small   = {} as CanvasImageSource
    const bitmaps = new Map([[painter.bitmapKey('ink', 'p', 11), small]])
    painter.paint(g, { ...drawings, bitmaps }, pawnFrame('ink', 12))
    expect(g.drawImage).toHaveBeenCalledWith(small, 94, 194, 12, 12)
  })

  it('skips a stamp whose drawing has not been painted', () => {
    const g = context()
    painter.paint(g, drawings, pawnFrame('run', 16))
    expect(g.drawImage).not.toHaveBeenCalled()
  })

  it("strokes each ring in the run's color at its own strength", () => {
    const g = context()
    painter.paint(g, drawings, { rings: [{ alpha: 0.4, radius: 20, x: 50, y: 60 }], stamps: [] })
    expect(g.arc).toHaveBeenCalledWith(50, 60, 20, 0, 2 * Math.PI)
    expect(g.stroke).toHaveBeenCalledOnce()
    expect([g.strokeStyle, g.globalAlpha]).toEqual(['rgb(1, 2, 3)', 0.4])
  })

  it('draws only inside the band below the clip', () => {
    const g = context()
    painter.paint(g, drawings, { rings: [], stamps: [] })
    expect(g.rect).toHaveBeenCalledWith(0, 64, 1440, 836)
    expect(g.clearRect).toHaveBeenCalledWith(0, 0, 1440, 900)
  })

  it('clips each frame alone, restoring the canvas once it is painted', () => {
    const g = context()
    painter.paint(g, drawings, pawnFrame('ink', 16))
    expect(vi.mocked(g.save)).toHaveBeenCalledBefore(vi.mocked(g.clip))
    expect(vi.mocked(g.drawImage)).toHaveBeenCalledBefore(vi.mocked(g.restore))
  })
})
