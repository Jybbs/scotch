import { ROLES, resolve }    from '../identity/roles.ts'
import { DRAWINGS }          from '../site/pieces.ts'
import * as track            from '../viewer/track.ts'
import * as boards           from './boards.ts'
import type { Outliner }     from './outline.ts'
import * as parts            from './parts.ts'
import { readoutOf }         from './readout.ts'
import type { Frame, Scene } from './scene.ts'
import { sheetsOf }          from './sheets.ts'

/**
 * The two color schemes the preview is drawn in, for GitHub's light ground and
 * its dark one.
 */
export type Scheme = (typeof SCHEMES)[number]

export const SCHEMES = ['light', 'dark'] as const
/**
 * The pieces' drawings as SVG groups each frame places by id, with the ids
 * inside each drawing dropped so no two groups share one.
 */
const pieces = Object.entries(DRAWINGS)
  .map(([piece, body]) => `<g id="piece-${piece}">${body.replaceAll(/ id="[^"]*"/gu, '')}</g>`)
  .join('')

/**
 * Reads the colors the preview is drawn in for one scheme, each by the role
 * the Viewer's track reads it from.
 */
export function colorsOf(scheme: Scheme): track.TrackColors {
  return Object.fromEntries(Object.entries(track.TRACK_ROLES).map(([key, role]) =>
    [key, resolve(ROLES[role][scheme])])) as track.TrackColors
}

/**
 * Draws one frame of the preview as an SVG at the README column's width: the
 * two boards ringed in their games' colors around both games' sheets, each
 * board's side named beneath it, the Viewer's track under them, and the line
 * the Viewer reads out for the cursor.
 */
export async function drawFrame(
  colors   : track.TrackColors,
  frame    : Frame,
  outliner : Outliner,
  scene    : Scene
): Promise<string> {
  const { board, gutter, ring, width } = parts.LAYOUT
  const shot   = { colors, frame, outliner, scene }
  const right  = width - ring - board
  const sheets = 2 * ring + board + gutter
  const drawn  = await Promise.all([
    boards.ringOf('submitted', shot, ring),
    boards.boardOf('submitted', shot, ring),
    boards.ringOf('stored', shot, right),
    boards.boardOf('stored', shot, right),
    sheetsOf(shot, right - ring - gutter - sheets, sheets),
    boards.captionOf('submitted', 'Yours', shot, 0),
    boards.captionOf('stored', 'Grandmaster’s', shot, right - ring),
    readoutOf(shot)
  ])
  const size = `width="${width}" height="${parts.HEIGHT}" viewBox="0 0 ${width} ${parts.HEIGHT}"`
  return `<svg xmlns="http://www.w3.org/2000/svg" ${size}><defs>${pieces}</defs>`
       + parts.rect({ fill: colors.page, height: parts.HEIGHT, width }) + drawn.join('') + '</svg>'
}
