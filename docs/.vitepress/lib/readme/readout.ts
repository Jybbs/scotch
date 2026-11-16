import { IDENTITY }  from '../identity/tokens.ts'
import * as track    from '../viewer/track.ts'
import * as parts    from './parts.ts'
import { Sketch }    from './sketch.ts'

/**
 * Sets each line of text the track's drawing wrote as outlines at the point
 * it was written, its size and face read from the font it was written in.
 */
async function labelsOf(sketch: Sketch, shot: parts.Shot): Promise<string> {
  const labels = await Promise.all(sketch.lines.map(async ({ fill, font, text, x, y }) => {
    const size  = Number(/(\d+)px/u.exec(font)?.[1])
    const face  = font.includes(IDENTITY.faces.code.family) ? 'code' : 'body'
    const box   = { color: fill, face, height: 2 * size, size, width: 8 * size } as const
    const paths = await shot.outliner.line(text, box)
    return parts.at(x, y - 1.36 * size, paths)
  }))
  return labels.join('')
}

/**
 * Writes the line the Viewer reads out for the cursor in capitals, in the run's
 * color while the two games show one position and the quiet color past it.
 */
async function statusOf(shot: parts.Shot): Promise<string> {
  const { colors, frame, outliner, scene } = shot
  const line = await parts.crossfade(frame, ply => outliner.line(scene.loaded.status(ply).line, {
    align   : 'center',
    caps    : true,
    color   : scene.loaded.sharing(ply) ? colors.run : colors.quiet,
    face    : 'code',
    height  : parts.LAYOUT.line,
    size    : 12,
    spacing : 1.7,
    width   : parts.LAYOUT.width
  }))
  return parts.at(0, parts.TOPS.status, line)
}

/**
 * Draws the Viewer's track through its own drawing, recorded into a sketch, in
 * a window of the plies in view, beside a swatch of each game's color at its
 * row's middle, the head ringing the column of the cursor and sliding with
 * each move, and the right edge fading into the page as the Viewer's scroll
 * fades it.
 */
async function trackOf(shot: parts.Shot): Promise<string> {
  const { colors, frame, scene } = shot
  const sketch = new Sketch()
  track.drawTrack(sketch.context, colors, 'white', scene.loaded)
  const wide     = parts.LAYOUT.columns * track.TRACK.column
  const head     = track.headOf(scene.loaded)
  const x        = (frame.from + (frame.to - frame.from) * parts.progress(frame)) * track.TRACK.column
  const left     = Math.round((parts.LAYOUT.width - parts.LAYOUT.swatch - wide) / 2)
  const swatches = (['submitted', 'stored'] as const)
    .map(game => parts.swatch(colors[game], 0, track.ROWS[game] + track.GLYPH / 2 - 4))
    .join('')
  const ring = parts.rect({
    'fill'         : 'none',
    'height'       : head.height + 2,
    'rx'           : 6,
    'stroke'       : colors.ink,
    'stroke-width' : 2,
    'width'        : head.width + 2,
    'x'            : (x - 1).toFixed(2),
    'y'            : head.top - 1
  })
  const fade = '<defs><linearGradient id="fade">'
             + `<stop offset="0" stop-color="${colors.page}" stop-opacity="0"/>`
             + `<stop offset="1" stop-color="${colors.page}"/></linearGradient></defs>`
             + parts.rect({ fill: 'url(#fade)', height: track.TRACK_HEIGHT, width: 20, x: wide - 20 })
  const view = `<svg x="${parts.LAYOUT.swatch}" width="${wide}" height="${track.TRACK_HEIGHT}">`
             + sketch.svg + await labelsOf(sketch, shot) + ring + fade + '</svg>'
  return parts.at(left, parts.TOPS.track, swatches + view)
}

/**
 * Draws the readout under the boards: the Viewer's track and the line it reads
 * out for the cursor.
 */
export async function readoutOf(shot: parts.Shot): Promise<string> {
  const [strip, status] = await Promise.all([trackOf(shot), statusOf(shot)])
  return strip + status
}
