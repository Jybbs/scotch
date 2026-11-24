import { describe, expect, it } from 'vitest'

import * as gif    from '../../../../docs/.vitepress/lib/readme/gif.ts'
import { decoded } from '../../common/gif.ts'

/**
 * Three colors a frame is drawn in, beside the palette that holds them.
 */
const [RED, GREEN, BLUE] = [0xff0000, 0x00ff00, 0x0000ff]
const PALETTE            = [RED, GREEN, BLUE]

/**
 * Draws a frame of `width` by `height` as RGB bytes, each pixel the color the
 * callback names for its column and row.
 */
function frameOf(width: number, height: number, color: (x: number, y: number) => number): Uint8Array {
  return Array.from({ length: width * height }, (_, at) => color(at % width, Math.floor(at / width)))
    .reduce((rgb, packed, at) => {
      rgb.set([packed >> 16, (packed >> 8) & 255, packed & 255], 3 * at)
      return rgb
    }, new Uint8Array(3 * width * height))
}

describe('paletteOf', () => {
  it('keeps every fixed color first and exact, once each', () => {
    const counts = new Map([[0x123456, 4]])
    expect(gif.paletteOf(counts, [RED, GREEN, RED])).toEqual([RED, GREEN, 0x123456])
  })

  it('keeps every counted color exact while the palette holds them all', () => {
    const counts = new Map(PALETTE.map(color => [color, 10]))
    expect(new Set(gif.paletteOf(counts, []))).toEqual(new Set(PALETTE))
  })

  it('cuts many colors down to 255, the last index left for the transparent one', () => {
    const counts = new Map(Array.from({ length: 4096 }, (_, at) => [at * 4099, 1 + (at % 5)]))
    expect(gif.paletteOf(counts, [RED])).toHaveLength(255)
  })
})

describe('halve', () => {
  it('averages each two-by-two block into one pixel, rounding to the nearest', () => {
    const rgba = Uint8Array.from([
      0, 10, 20, 255, 2, 10, 20, 255, 100, 0, 0, 255, 100, 0, 0, 255,
      0, 10, 20, 255, 1, 11, 20, 255, 100, 0, 0, 255, 100, 0, 0, 255
    ])
    expect([...gif.halve(rgba, 2, 1)]).toEqual([1, 10, 20, 100, 0, 0])
  })
})

describe('packed', () => {
  it('packs the red, green, and blue bytes from the high end', () => {
    expect(gif.packed(Uint8Array.from([0, 0x12, 0x34, 0x56]), 1)).toBe(0x123456)
  })
})

describe('Encoder', () => {
  const stripes = frameOf(6, 4, x => PALETTE[x % 3]!)
  const moved   = frameOf(6, 4, (x, y) => x === 4 && y === 2 ? RED : PALETTE[x % 3]!)

  it('writes a looping GIF whose frames decode to the frames added, at their delay', () => {
    const encoder = new gif.Encoder(20, 4, PALETTE, 6)
    for (const frame of [stripes, moved, moved, stripes]) encoder.add(frame)
    const read = decoded(encoder.bytes())
    expect(read).toMatchObject({ delays: [20, 20, 20, 20], disposals: [1, 1, 1, 1], height: 4, loops: 0, width: 6 })
    expect(read.frames).toEqual([stripes, moved, moved, stripes])
  })

  it('stores only the rectangle that changed, and one pixel for a frame that changes nothing', () => {
    const encoder = new gif.Encoder(20, 4, PALETTE, 6)
    for (const frame of [stripes, moved, moved]) encoder.add(frame)
    expect(decoded(encoder.bytes()).sizes).toEqual([[6, 4], [1, 1], [1, 1]])
  })

  it('maps a color the palette lacks to its nearest color', () => {
    const encoder = new gif.Encoder(20, 1, PALETTE, 1)
    encoder.add(Uint8Array.from([250, 20, 10]))
    expect(decoded(encoder.bytes()).frames).toEqual([Uint8Array.from([255, 0, 0])])
  })
})
