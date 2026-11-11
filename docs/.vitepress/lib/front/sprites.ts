import * as pieces           from '../site/pieces.ts'
import type { Cell, Mosaic } from './mosaic.ts'

/**
 * The colors the mosaic is drawn in: the page's and each game's, the share of a
 * game's color laid over the page in a cell, and the opacity of each piece.
 */
export interface Ink {
  glyph     : number
  page      : string
  stored    : string
  strength  : number
  submitted : string
}

/**
 * One cell drawn once at the drawing's scale, the canvas holding it, the
 * margin around the cell that leaves room for its corners as it turns, and the
 * cell's side in pixels.
 */
export interface Sprite {
  canvas : HTMLCanvasElement
  pad    : number
  side   : number
}

/**
 * How a cell is drawn, as shares of its side: the gap between two cells, the
 * rounding of a cell's corners, the margin around it, and the size of the one
 * piece a whole cell holds and of each of the two a cut cell holds.
 */
export interface SpriteTuning {
  cut    : number
  gap    : number
  margin : number
  round  : number
  whole  : number
}

/**
 * The cells every reader meets.
 */
export const SPRITE_TUNING: Readonly<SpriteTuning> = {
  cut    : 0.62,
  gap    : 0.06,
  margin : 0.1,
  round  : 0.16,
  whole  : 0.84
}

/**
 * Fills a cell's square in a game's color laid over the page's.
 */
function fill(context: CanvasRenderingContext2D, color: string, ink: Ink, side: number): void {
  context.fillStyle = ink.page
  context.fillRect(0, 0, side, side)
  context.globalAlpha = ink.strength
  context.fillStyle   = color
  context.fillRect(0, 0, side, side)
  context.globalAlpha = 1
}

/**
 * Sets a piece centered on a point of the cell at a share of its side.
 */
function place(
  context : CanvasRenderingContext2D,
  glyph   : HTMLImageElement,
  ink     : Ink,
  share   : number,
  x       : number,
  y       : number
): void {
  context.globalAlpha = ink.glyph
  context.drawImage(glyph, x - share / 2, y - share / 2, share, share)
  context.globalAlpha = 1
}

/**
 * Draws one cell: a whole cell as one square in one game's color holding its
 * piece, and a cut cell as the square in the other game's color holding the
 * black piece, then the part the mark fills in the first game's color holding
 * the white piece, so the mark's outline divides the two along its own curve.
 */
function spriteOf(
  cell    : Cell,
  glyphs  : Readonly<Record<pieces.Piece, HTMLImageElement>>,
  ink     : Ink,
  mosaic  : Mosaic,
  outline : Path2D,
  ratio   : number,
  scale   : number,
  tuning  : SpriteTuning
): Sprite {
  const side    = mosaic.size * scale
  const pad     = Math.ceil(side * tuning.margin)
  const canvas  = document.createElement('canvas')
  canvas.width  = Math.ceil((side + pad * 2) * ratio)
  canvas.height = canvas.width
  const context = canvas.getContext('2d')!
  const [one, other] = cell.light ? [ink.submitted, ink.stored] : [ink.stored, ink.submitted]
  const gap     = side * tuning.gap

  context.setTransform(ratio, 0, 0, ratio, pad * ratio, pad * ratio)
  context.beginPath()
  context.roundRect(gap, gap, side - gap * 2, side - gap * 2, side * tuning.round)
  context.clip()
  if (!cell.cut) {
    fill(context, one, ink, side)
    place(context, glyphs[cell.light ? cell.white : cell.black], ink, side * tuning.whole, side / 2, side / 2)
    return { canvas, pad, side }
  }
  const [ox, oy] = cell.outside!
  const [wx, wy] = cell.within!
  fill(context, other, ink, side)
  place(context, glyphs[cell.black], ink, side * tuning.cut, ox * scale, oy * scale)
  context.setTransform(ratio * scale, 0, 0, ratio * scale, (pad - cell.left * scale) * ratio,
    (pad - cell.top * scale) * ratio)
  context.clip(outline, 'nonzero')
  context.setTransform(ratio, 0, 0, ratio, pad * ratio, pad * ratio)
  fill(context, one, ink, side)
  place(context, glyphs[cell.white], ink, side * tuning.cut, wx * scale, wy * scale)
  return { canvas, pad, side }
}

/**
 * Loads each piece's drawing as an image a canvas can draw, resolving once
 * every one has decoded.
 */
export async function glyphsOf(): Promise<Record<pieces.Piece, HTMLImageElement>> {
  const loaded = Object.entries(pieces.DRAWINGS).map(async ([name, drawing]) => {
    const image = new Image()
    image.src   = `data:image/svg+xml,${encodeURIComponent(pieces.svgOf(drawing))}`
    await image.decode()
    return [name, image] as const
  })
  return Object.fromEntries(await Promise.all(loaded)) as Record<pieces.Piece, HTMLImageElement>
}

/**
 * Draws every cell of the mosaic once at the scale the drawing shows it at, so
 * a frame only places each cell's canvas.
 *
 * Args:
 *   glyphs : Each piece's drawing, decoded.
 *   ink    : The colors the cells are drawn in.
 *   mosaic : The mark laid out as cells.
 *   ratio  : The device pixel ratio the canvas draws at.
 *   scale  : The pixels one of the mark's units takes.
 *   tuning : How a cell is drawn.
 */
export function spritesOf(
  glyphs : Readonly<Record<pieces.Piece, HTMLImageElement>>,
  ink    : Ink,
  mosaic : Mosaic,
  ratio  : number,
  scale  : number,
  tuning : SpriteTuning = SPRITE_TUNING
): Sprite[] {
  const outline = new Path2D(mosaic.path)
  return mosaic.cells.map(cell => spriteOf(cell, glyphs, ink, mosaic, outline, ratio, scale, tuning))
}
