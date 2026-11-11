// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

import type { Mosaic }                        from '../../../lib/front/mosaic.ts'
import { SPRITE_TUNING, glyphsOf, spritesOf } from '../../../lib/front/sprites.ts'
import { DRAWINGS, type Piece }               from '../../../lib/site/pieces.ts'
import { context }                            from '../../common/canvas.ts'

const INK    = { glyph: 0.5, page: 'white', stored: 'blue', strength: 0.25, submitted: 'red' }
const WHOLE  = { angle: 0, at: 0, black: 'q', cut: false, drift: 0, left: 0, light: true, top: 0, white: 'K' }
const CUT    = { ...WHOLE, cut: true, light: false, outside: [8, 8], within: [2, 2] }
const BOX    = { height: 10, width: 10, x: 0, y: 0 }
const GLYPHS = Object.fromEntries(Object.keys(DRAWINGS).map(name => [name, new Image()]))
const MOSAIC = { box: BOX, cells: [WHOLE, CUT], path: 'M0 0H10V10Z', rings: [], size: 10 }

/**
 * Draws the stand-in mosaic's sprites into stand-in contexts and returns them
 * beside the drawing each canvas took.
 */
function drawn(): { drawings: CanvasRenderingContext2D[], made: ReturnType<typeof spritesOf> } {
  const drawings = [] as CanvasRenderingContext2D[]
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    drawings.push(context())
    return drawings.at(-1) as never
  })
  vi.stubGlobal('Path2D', class {
    readonly path: string

    constructor(path: string) {
      this.path = path
    }
  })
  const glyphs = GLYPHS as Record<Piece, HTMLImageElement>
  return { drawings, made: spritesOf(glyphs, INK, MOSAIC as unknown as Mosaic, 2, 3) }
}

describe('spritesOf', () => {
  it('sizes each sprite to its cell at the drawing scale, beside a margin for its corners', () => {
    const { made } = drawn()
    expect(made.map(({ pad, side }) => [pad, side])).toEqual([[3, 30], [3, 30]])
    expect(made[0]!.canvas.width).toBe(72)
  })

  it('fills a whole cell in the game its shade names and sets its piece in the middle', () => {
    const { drawings } = drawn()
    const whole        = drawings[0]!
    expect(whole.fillRect).toHaveBeenCalledTimes(2)
    const size         = 30 * SPRITE_TUNING.whole
    expect(whole.drawImage).toHaveBeenCalledWith(GLYPHS.K, 15 - size / 2, 15 - size / 2, size, size)
    expect(whole.clip).toHaveBeenCalledTimes(1)
  })

  it("clips a cut cell along the mark's outline, its white piece within and its black outside", () => {
    const { drawings } = drawn()
    const cut          = drawings[1]!
    const size         = 30 * SPRITE_TUNING.cut
    expect(cut.fillRect).toHaveBeenCalledTimes(4)
    expect(cut.clip).toHaveBeenLastCalledWith(expect.objectContaining({ path: MOSAIC.path }), 'nonzero')
    expect(cut.drawImage).toHaveBeenNthCalledWith(1, GLYPHS.q, 24 - size / 2, 24 - size / 2, size, size)
    expect(cut.drawImage).toHaveBeenNthCalledWith(2, GLYPHS.K, 6 - size / 2, 6 - size / 2, size, size)
  })
})

describe('glyphsOf', () => {
  it("decodes each piece's drawing as an image a canvas draws", async () => {
    vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue()
    const glyphs = await glyphsOf()
    expect(Object.keys(glyphs).toSorted()).toEqual(Object.keys(DRAWINGS).toSorted())
    expect(glyphs.K.src).toMatch(/^data:image\/svg\+xml,/u)
  })
})
