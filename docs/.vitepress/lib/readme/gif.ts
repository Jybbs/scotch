import { createRequire } from 'node:module'

/**
 * gifenc's encoder, loaded through `require`, since Node reads the package's
 * CommonJS build, whose named exports an `import` statement cannot see.
 */
const { GIFEncoder } = createRequire(import.meta.url)('gifenc') as typeof import('gifenc')

/**
 * A color as one number, its red, green, and blue bytes from the high end.
 */
type Packed = number

/**
 * One frame as the GIF stores it: the rectangle of pixels that changed since
 * the frame before, each an index into the palette, the index `CLEAR` leaving
 * the pixel beneath as it was.
 */
interface Patch {
  height  : number
  indices : Uint8Array
  left    : number
  top     : number
  width   : number
}

/**
 * The palette index every frame leaves transparent, so a pixel a frame does not
 * change keeps the color the frames before it drew.
 */
const CLEAR = 255
/**
 * The disposal method each frame takes, leaving it in place for the next frame
 * to draw over.
 */
const KEEP = 1
/**
 * Where a frame's left offset sits past the start of what gifenc writes for a
 * frame after the first, behind the 8 bytes of its graphic control extension
 * and its image descriptor's separator.
 */
const DESCRIPTOR = 9

function channelsOf(color: Packed): [number, number, number] {
  return [color >> 16, (color >> 8) & 255, color & 255]
}

function cut(box: [Packed, number][], channel: number): [[Packed, number][], [Packed, number][]] {
  const sorted = box.toSorted((a, b) => ((a[0] >> channel) & 255) - ((b[0] >> channel) & 255) || a[0] - b[0])
  const total  = sorted.reduce((sum, [, count]) => sum + count, 0)
  let seen = 0
  let at   = 1
  for (; at < sorted.length - 1; at++) {
    seen += sorted[at - 1]![1]
    if (seen >= total / 2) break
  }
  return [sorted.slice(0, at), sorted.slice(at)]
}

function meanOf(box: [Packed, number][]): Packed {
  const total = box.reduce((sum, [, count]) => sum + count, 0)
  const mean  = [16, 8, 0].map(shift =>
    Math.round(box.reduce((sum, [color, count]) => sum + ((color >> shift) & 255) * count, 0) / total))
  return (mean[0]! << 16) | (mean[1]! << 8) | mean[2]!
}

function widest(box: [Packed, number][]): { channel: number, span: number } {
  return [16, 8, 0].map(channel => {
    const values = box.map(([color]) => (color >> channel) & 255)
    return { channel, span: (Math.max(...values) - Math.min(...values)) * Math.log2(box.length + 1) }
  }).reduce((best, each) => each.span > best.span ? each : best)
}

/**
 * Builds a palette of up to 255 colors, every color in `fixed` kept exact and
 * the rest found by cutting the colors counted, weighted by how often each
 * appears, at the median of the channel spanning the widest range until the
 * palette is full.
 *
 * Args:
 *   counts : How many pixels each color covers across the frames sampled.
 *   fixed  : The colors kept exact, such as the identity's own.
 */
export function paletteOf(counts: ReadonlyMap<Packed, number>, fixed: readonly Packed[]): Packed[] {
  const kept  = [...new Set(fixed)]
  const boxes = [[...counts].filter(([color]) => !kept.includes(color))].filter(box => box.length)
  while (kept.length + boxes.length < CLEAR) {
    const spans = boxes.map(box => widest(box))
    const best  = spans.reduce((top, each, at) => each.span > spans[top]!.span ? at : top, 0)
    if (!spans[best]?.span) break
    boxes.splice(best, 1, ...cut(boxes[best]!, spans[best].channel))
  }
  return [...kept, ...boxes.map(box => meanOf(box))]
}

/**
 * Packs an RGB pixel's three bytes into one number.
 */
export function packed(pixels: Uint8Array, at: number): Packed {
  return (pixels[at]! << 16) | (pixels[at + 1]! << 8) | pixels[at + 2]!
}

/**
 * Averages each two-by-two block of an RGBA image drawn at twice the size into
 * one RGB pixel, as a screenshot at a device scale of 2 is shown at its CSS size.
 */
export function halve(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const out  = new Uint8Array(width * height * 3)
  const wide = width * 2 * 4
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = 2 * y * wide + 8 * x
      for (let channel = 0; channel < 3; channel++) {
        const at  = from + channel
        const sum = rgba[at]! + rgba[at + 4]! + rgba[at + wide]! + rgba[at + wide + 4]!
        out[(y * width + x) * 3 + channel] = (sum + 2) >> 2
      }
    }
  }
  return out
}

/**
 * Writes frames into a GIF on one palette shared by every frame, each frame
 * storing only the rectangle of pixels that changed, every unchanged pixel
 * inside it transparent, and a frame that changes nothing storing one
 * transparent pixel, so a held position repeats its frame at the delay every
 * frame takes.
 */
export class Encoder {
  readonly #delay   : number
  readonly #height  : number
  readonly #nearest = new Map<Packed, number>()
  readonly #palette : readonly Packed[]
  readonly #patches = [] as Patch[]
  readonly #shown   : Uint8Array
  readonly #width   : number

  /**
   * Args:
   *   delay   : Each frame's delay in milliseconds, a multiple of the ten a GIF
   *     counts in.
   *   height  : The frames' height in pixels.
   *   palette : The colors every frame is indexed against.
   *   width   : The frames' width in pixels.
   */
  constructor(delay: number, height: number, palette: readonly Packed[], width: number) {
    this.#delay   = delay
    this.#height  = height
    this.#palette = palette
    this.#shown   = new Uint8Array(width * height).fill(CLEAR)
    this.#width   = width
  }

  /**
   * Adds a frame as RGB bytes at the GIF's size.
   */
  add(pixels: Uint8Array): void {
    const indices = new Uint8Array(this.#width * this.#height)
    let [left, top, right, bottom] = [this.#width, this.#height, -1, -1]
    for (let at = 0; at < indices.length; at++) {
      indices[at] = this.#indexOf(packed(pixels, 3 * at))
      if (indices[at] === this.#shown[at]) continue
      const [x, y] = [at % this.#width, Math.floor(at / this.#width)]
      ;[left, top] = [Math.min(left, x), Math.min(top, y)]
      ;[right, bottom] = [Math.max(right, x), Math.max(bottom, y)]
    }
    if (right < 0) {
      this.#patches.push({ height: 1, indices: Uint8Array.of(CLEAR), left: 0, top: 0, width: 1 })
      return
    }
    const [width, height] = [right - left + 1, bottom - top + 1]
    const patch           = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const at = (top + y) * this.#width + left + x
        patch[y * width + x] = indices[at] === this.#shown[at] ? CLEAR : indices[at]!
        this.#shown[at] = indices[at]!
      }
    }
    this.#patches.push({ height, indices: patch, left, top, width })
  }

  /**
   * Writes the GIF through gifenc: its screen and the one palette with its
   * last index left transparent ahead of the first frame, the loop that repeats
   * forever, and each frame's patch, whose offset is written into the image
   * descriptor gifenc places at the origin.
   */
  bytes(): Buffer {
    const encoder = GIFEncoder({ auto: false })
    const palette = Array.from({ length: 256 }, (_, at) => channelsOf(this.#palette[at] ?? 0))
    encoder.writeHeader()
    for (const [at, { height, indices, left, top, width }] of this.#patches.entries()) {
      const first = at === 0
      const start = encoder.bytesView().length
      encoder.writeFrame(indices, width, height, {
        delay            : this.#delay,
        dispose          : KEEP,
        first,
        palette          : first ? palette : undefined,
        transparent      : true,
        transparentIndex : CLEAR
      })
      if (!first) encoder.bytesView().set([left & 255, left >> 8, top & 255, top >> 8], start + DESCRIPTOR)
    }
    encoder.finish()
    return Buffer.from(encoder.bytes())
  }

  /**
   * Finds the palette's nearest color to a pixel, weighing the red, green,
   * and blue differences 2, 4, and 3, as the low-cost color metric does for a
   * color of low red, keeping each answer for the next pixel of that color.
   */
  #indexOf(color: Packed): number {
    let found = this.#nearest.get(color)
    if (found !== undefined) return found
    const [r, g, b] = channelsOf(color)
    let best = Infinity
    for (const [at, each] of this.#palette.entries()) {
      const [pr, pg, pb] = channelsOf(each)
      const distance     = 2 * (pr - r) ** 2 + 4 * (pg - g) ** 2 + 3 * (pb - b) ** 2
      if (distance < best) [best, found] = [distance, at]
    }
    this.#nearest.set(color, found!)
    return found!
  }
}
