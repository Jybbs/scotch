import pieces from '../rendered/pieces.json' with { type: 'json' }

export type Piece = keyof typeof pieces

/**
 * The drawing of each piece of the set python-chess draws on its 45-unit
 * square, named by its symbol in Forsyth–Edwards Notation, an uppercase letter
 * for a white piece and a lowercase one for a black piece.
 */
export const DRAWINGS = pieces

/**
 * Wraps a drawing on a piece's 45-unit square in a whole SVG, hidden from a
 * screen reader.
 *
 * Args:
 *   body    : The drawing.
 *   pixels  : The width and the height the SVG declares, or none, leaving its
 *     size to the page it sits in.
 *   viewBox : The part of the square the SVG shows, the whole square unless
 *     told otherwise.
 */
export function svgOf(body: string, pixels?: number, viewBox = '0 0 45 45'): string {
  const size = pixels === undefined ? '' : `width="${pixels}" height="${pixels}" `
  return `<svg xmlns="http://www.w3.org/2000/svg" ${size}viewBox="${viewBox}" aria-hidden="true">`
       + `${body}</svg>`
}
