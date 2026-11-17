import { renderAsync } from '@resvg/resvg-js'

import { facesOf }                      from '../cards/faces.ts'
import { hexOf }                        from '../identity/tokens.ts'
import * as gif                         from './gif.ts'
import { Outliner }                     from './outline.ts'
import * as parts                       from './parts.ts'
import * as preview                     from './preview.ts'
import { type Frame, PACE, type Scene } from './scene.ts'

/**
 * How the preview is shot: how many frames are drawn at once, and every how
 * many frames one is counted toward the palette.
 */
export interface Shooting {
  batch  : number
  sample : number
}

/**
 * The shooting the preview is encoded with.
 */
const SHOOTING: Readonly<Shooting> = { batch: 8, sample: 5 }

/**
 * Draws the frames in batches at twice the preview's width, as a screen at a
 * device scale of 2 draws them, and passes each frame's RGB bytes, halved to
 * the preview's width, to `take` in order.
 */
async function shoot(
  draw     : (frame: Frame) => Promise<string>,
  frames   : readonly Frame[],
  shooting : Readonly<Shooting>,
  take     : (pixels: Uint8Array) => void
): Promise<void> {
  const { width } = parts.LAYOUT
  const fit       = { mode: 'width', value: 2 * width } as const
  function* batches(): Generator<Promise<Uint8Array[]>> {
    for (let at = 0; at < frames.length; at += shooting.batch)
      yield Promise.all(frames.slice(at, at + shooting.batch).map(async frame => {
        const image = await renderAsync(await draw(frame), { fitTo: fit })
        return gif.halve(image.pixels, width, parts.HEIGHT)
      }))
  }
  for await (const shots of batches()) for (const pixels of shots) take(pixels)
}

/**
 * Encodes the preview of the Viewer playing the front page's example in one
 * scheme as a GIF, counting the colors of every `sample`-th frame into one
 * palette that keeps the scheme's own colors exact, then encoding every frame
 * against it at the frame's delay.
 *
 * Args:
 *   metaUrl  : The `import.meta.url` of the module calling, which the faces are
 *     found from.
 *   scheme   : The color scheme the frames are drawn in.
 *   scene    : The scene whose frames are drawn and encoded.
 *   shooting : How the frames are drawn and sampled.
 *
 * Returns:
 *   The GIF's bytes.
 */
export async function encodePreview(
  metaUrl  : string,
  scheme   : preview.Scheme,
  scene    : Scene,
  shooting : Readonly<Shooting> = SHOOTING
): Promise<Buffer> {
  const colors   = preview.colorsOf(scheme)
  const outliner = new Outliner(facesOf(metaUrl))
  const draw     = (frame: Frame): Promise<string> => preview.drawFrame(colors, frame, outliner, scene)
  const counts   = new Map<number, number>()
  await shoot(draw, scene.frames.filter((_, at) => at % shooting.sample === 0), shooting, pixels => {
    for (let at = 0; at < pixels.length; at += 3) {
      const color = gif.packed(pixels, at)
      counts.set(color, (counts.get(color) ?? 0) + 1)
    }
  })
  const fixed   = [...Object.values(colors), hexOf('light'), hexOf('primary')]
    .map(hex => Number.parseInt(hex.slice(1), 16))
  const encoder = new gif.Encoder(PACE.frame, parts.HEIGHT, gif.paletteOf(counts, fixed), parts.LAYOUT.width)
  await shoot(draw, scene.frames, shooting, pixels => encoder.add(pixels))
  return encoder.bytes()
}
