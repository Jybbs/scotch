import type { ROLES } from '../identity/roles.ts'
import type { Token } from '../identity/tokens.ts'
import * as pieces    from '../site/pieces.ts'
import type { Kind }  from './example.ts'
import type { Layer } from './layers.ts'

type Color = keyof typeof PAINTS

interface Coloring {
  dark  : Color
  light : Color
  set   : 'black' | 'white'
}

export type Palette = Record<Color, string>

/**
 * The part of the set's 45-unit square the pieces stand in, as the view box an
 * SVG crops it to, so a piece's size names the piece rather than its square.
 */
export const CROP = { h: 38.5, w: 38, x: 3.5, y: 2 } as const
/**
 * The coloring the stored game rests in on the dark ground, the set's white
 * drawing filled dark and outlined in a lighter tone, so it reads as black
 * pieces against Near Black.
 */
const DARK_STORED: Coloring = { dark: 'rim', light: 'hollow', set: 'white' }
/**
 * The role or the palette token whose custom property each color the backdrop
 * paints a piece in reads: the black set's light details, the body of a piece
 * drawn dark on the dark ground, the plain ink a loose piece takes, the outline
 * of a white piece, the body of a white piece, the outline of a dark piece on
 * the dark ground, the run's color, and the two games' colors.
 */
export const PAINTS = {
  detail    : 'ground',
  hollow    : 'front_hollow',
  ink       : 'ink',
  line      : 'dark',
  paper     : 'front_paper',
  rim       : 'quiet',
  run       : 'run',
  stored    : 'stored',
  submitted : 'submitted'
} as const satisfies Record<string, keyof typeof ROLES | Token>

/**
 * Picks the drawing and the colors each coloring of a game takes in a color
 * scheme. Both games rest as the set's white and black pieces, the stored
 * game's on the dark ground as dark pieces outlined in a lighter tone, and
 * travel edged in their game's color, the submitted line's on a white body and
 * the stored game's on a dark one.
 */
function coloringOf(dark: boolean, layer: Exclude<Layer, 'ink' | 'run'>): Coloring {
  switch (layer) {
    case 'edged-bot' : return { dark: 'stored', light: 'hollow', set: 'white' }
    case 'edged-top' : return { dark: 'submitted', light: 'paper', set: 'white' }
    case 'plain-bot' : return dark ? DARK_STORED : { dark: 'line', light: 'detail', set: 'black' }
    case 'plain-top' : return { dark: 'line', light: 'paper', set: 'white' }
  }
}

/**
 * Writes one piece in one coloring as a whole SVG cropped to the part of its
 * square the piece stands in: a solid silhouette in the ink or the run's color,
 * or the set's white or black drawing with its white parts and its black parts
 * in the coloring's two colors.
 *
 * Args:
 *   dark    : Whether the page shows its dark color scheme.
 *   kind    : The kind of piece.
 *   layer   : The coloring.
 *   palette : Each color the custom properties resolve to.
 *   pixels  : The width and the height the SVG declares, which sets how finely
 *     a browser draws it as an image.
 */
export function drawing(dark: boolean, kind: Kind, layer: Layer, palette: Palette, pixels: number): string {
  const crop = `${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`

  if (layer === 'ink' || layer === 'run') {
    const color = palette[layer]
    const style = `<style>*{fill:${color}!important;stroke:${color}!important}</style>`
    return pieces.svgOf(`${style}${pieces.DRAWINGS[kind]}`, pixels, crop)
  }

  const { dark: shade, light, set } = coloringOf(dark, layer)
  const piece                       = set === 'white' ? kind.toUpperCase() as Uppercase<Kind> : kind
  return pieces.svgOf(pieces.DRAWINGS[piece], pixels, crop)
    .replaceAll(/#(?:ffffff|fff)(?![0-9a-f])/giu, palette[light])
    .replaceAll(/#(?:000000|000)(?![0-9a-f])/giu, palette[shade])
}
