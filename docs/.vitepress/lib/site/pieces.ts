import pieces from '../rendered/pieces.json' with { type: 'json' }

export type Piece = keyof typeof pieces

/**
 * The drawing of each piece of the set python-chess draws on its 45-unit
 * square, named by its symbol in Forsyth–Edwards Notation, an uppercase letter
 * for a white piece and a lowercase one for a black piece.
 */
export const DRAWINGS = pieces

/**
 * Reads the kind of a piece whatever its color, as the lowercase letter
 * Forsyth–Edwards Notation names it by.
 */
export function pieceKind(piece: Piece): Lowercase<Piece> {
  return piece.toLowerCase() as Lowercase<Piece>
}

/**
 * Writes a piece's drawing with no `id` of its own, so the many copies a board
 * draws never share one, a black piece drawn over a copy of itself in a group
 * of class `halo`, which a stylesheet rings in the light squares' color so the
 * piece reads on a dark square.
 */
export function ringed(piece: Piece, halo: string): string {
  const body = DRAWINGS[piece].replace(/ id="[^"]*"/u, '')
  return white(piece) ? body : `<g class="${halo}">${body}</g>${body}`
}

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

/**
 * Reads whether a piece is White's, named by an uppercase letter.
 */
export function white(piece: Piece): boolean {
  return piece === piece.toUpperCase()
}
