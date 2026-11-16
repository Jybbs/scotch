import { CURVES, DURATIONS, bezier }       from '../motion/timing.ts'
import { TRACK_HEIGHT, type TrackColors } from '../viewer/track.ts'
import type { Outliner }                   from './outline.ts'
import type { Frame, Scene }               from './scene.ts'

/**
 * What a part of a frame draws from: the scene, the frame, the colors of its
 * scheme, and the outliner setting its text.
 */
export interface Shot {
  colors   : TrackColors
  frame    : Frame
  outliner : Outliner
  scene    : Scene
}

/**
 * The preview's measures in pixels: each board's side, the height of a side's
 * caption, the plies of the track in view, the room between a board and the
 * sheets, the height of the status line, the band ringing a board, the room the
 * track's swatches take on its left, and the preview's width, the README
 * column's at its widest.
 */
export const LAYOUT = {
  board   : 286,
  caption : 24,
  columns : 16,
  gutter  : 14,
  line    : 22,
  ring    : 3,
  swatch  : 19,
  width   : 838
} as const
const glide = bezier(CURVES.glide)
/**
 * Where each part of a frame starts down it: the boards and the sheets under
 * their rings, the sides' captions, the track, and the status line.
 */
export const TOPS = {
  board  : LAYOUT.ring,
  side   : LAYOUT.board + LAYOUT.gutter,
  status : 2 * LAYOUT.ring + LAYOUT.board + 62 + TRACK_HEIGHT,
  track  : 2 * LAYOUT.ring + LAYOUT.board + 50
} as const
/**
 * The frame's height, from the top of the boards' rings to the foot of the
 * status line.
 */
export const HEIGHT = TOPS.status + LAYOUT.line

/**
 * Places a drawing at a point, at an opacity below 1 where one is given, and
 * drops it once it has faded out.
 */
export function at(x: number, y: number, body: string, opacity = 1): string {
  if (opacity <= 0.002) return ''
  const faded = opacity < 0.998 ? ` opacity="${opacity.toFixed(3)}"` : ''
  return `<g transform="translate(${x} ${y})"${faded}>${body}</g>`
}

/**
 * Draws what a frame shows for each ply it moves between, fading the drawing
 * of the ply it leaves into the drawing of the ply it reaches over the site's
 * fade, and draws the ply alone while the frame holds.
 */
export async function crossfade(
  frame : Frame,
  draw  : (ply: number) => Promise<string> | string
): Promise<string> {
  if (frame.from === frame.to) return draw(frame.to)
  const fade            = Math.min(1, frame.t / DURATIONS.fade)
  const [before, after] = await Promise.all([draw(frame.from), draw(frame.to)])
  return at(0, 0, before, 1 - fade) + at(0, 0, after, fade)
}

/**
 * Reads how far a frame has moved from its first ply toward its second along
 * the site's glide, 1 while it holds.
 */
export function progress(frame: Frame, span = frame.span): number {
  return frame.from === frame.to ? 1 : glide(Math.min(1, frame.t / span))
}

/**
 * Writes an SVG rectangle carrying each attribute given, in the order given.
 */
export function rect(attributes: Record<string, number | string>): string {
  const pairs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')
  return `<rect ${pairs}/>`
}

/**
 * Writes the rounded square a game's color is shown in beside its name.
 */
export function swatch(color: string, x: number, y: number): string {
  return rect({ fill: color, height: 9, rx: 2, width: 9, x, y })
}
