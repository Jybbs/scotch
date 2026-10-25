import type { ROLES }                                from '../identity/roles.ts'
import { familyOf }                                  from '../identity/sheet.ts'
import { IDENTITY }                                  from '../identity/tokens.ts'
import { white }                                     from '../site/pieces.ts'
import { type Loaded, NOTHING, PARTIES, type Party } from './loaded.ts'
import { standingOf }                                from './placements.ts'
import type { Facing }                               from './trail.ts'

/**
 * The colors the track draws in, by the role each reads.
 */
export type TrackColors = Record<keyof typeof TRACK_ROLES, string>

/**
 * The track's measures in pixels: the side of one square of a glyph, the width
 * of one ply's column, the gap between the two games' rows, the room above the
 * submitted row for the ply numbers, and the room below the stored row for the
 * words naming where the two meet and part.
 */
export const TRACK = { cell: 5, column: 50, foot: 20, gap: 22, top: 20 } as const
/**
 * The role each of the track's colors reads.
 */
export const TRACK_ROLES = {
  glyphDark  : 'glyph_dark',
  glyphLight : 'glyph_light',
  ink        : 'ink',
  page       : 'page',
  quiet      : 'quiet',
  rule       : 'rule',
  run        : 'run',
  stored     : 'stored',
  submitted  : 'submitted',
  tint       : 'tint'
} as const satisfies Record<string, keyof typeof ROLES>
/**
 * The side of one glyph, eight squares of a glyph across.
 */
export const GLYPH = TRACK.cell * 8
/**
 * The top of each row of glyphs: the submitted game's under the ply numbers,
 * the stored game's under it past the gap, and the row of the positions the two
 * share midway between them.
 */
export const ROWS = {
  shared    : TRACK.top + (GLYPH + TRACK.gap) / 2,
  stored    : TRACK.top + GLYPH + TRACK.gap,
  submitted : TRACK.top
} as const
/**
 * The track's height, from the ply numbers over the submitted row to the words
 * under the stored row.
 */
export const TRACK_HEIGHT = TRACK.top + GLYPH * 2 + TRACK.gap + TRACK.foot

/**
 * Draws one ply's column: a position the two games share once, between the two
 * rows on the run's tint, and otherwise each game's position in its own row,
 * the two joined by a rule where both hold one, beneath the ply's number on
 * each tenth ply.
 */
function drawColumn(
  context : CanvasRenderingContext2D,
  colors  : TrackColors,
  cursor  : number,
  facing  : Facing,
  loaded  : Loaded
): void {
  const x = leftOf(cursor, loaded)
  if (loaded.sharing(cursor)) {
    context.fillStyle = colors.tint
    context.fillRect(x - 4, TRACK.top - 4, GLYPH + 8, GLYPH * 2 + TRACK.gap + 8)
    drawGlyph(context, colors, facing, loaded.match.submitted.placements[cursor]!, x, ROWS.shared)
  } else {
    if (loaded.has('submitted', cursor) && loaded.has('stored', cursor)) {
      context.fillStyle = colors.rule
      context.fillRect(x + GLYPH / 2 - 0.5, ROWS.submitted + GLYPH + 6, 1, TRACK.gap - 12)
    }
    for (const party of PARTIES) drawGlyphOf(context, colors, cursor, facing, loaded, party, x)
  }
  if (cursor % 10 === 0 && cursor >= 0) {
    context.fillStyle = colors.quiet
    context.fillText(String(cursor), x, TRACK.top - 8)
  }
}

/**
 * Draws one position as a glyph of eight by eight squares, a black piece a
 * filled square and a white piece a hollow one, on the glyph's own light and
 * dark squares, from Black's side where the boards face it.
 */
function drawGlyph(
  context   : CanvasRenderingContext2D,
  colors    : TrackColors,
  facing    : Facing,
  placement : string,
  x         : number,
  y         : number
): void {
  const cell = TRACK.cell
  for (let square = 0; square < 64; square++) {
    context.fillStyle = (square + Math.floor(square / 8)) % 2 ? colors.glyphLight : colors.glyphDark
    context.fillRect(x + (square % 8) * cell, y + (7 - Math.floor(square / 8)) * cell, cell, cell)
  }
  for (const [at, piece] of standingOf(placement).entries()) {
    if (!piece) continue
    const square      = facing === 'black' ? 63 - at : at
    const [left, top] = [x + (square % 8) * cell, y + (7 - Math.floor(square / 8)) * cell]
    context.fillStyle = colors.ink
    context.fillRect(left + 0.5, top + 0.5, cell - 1, cell - 1)
    if (!white(piece)) continue
    context.fillStyle = colors.page
    context.fillRect(left + 1.5, top + 1.5, cell - 3, cell - 3)
  }
}

/**
 * Draws one game's position at a ply in its own row, underlined in the game's
 * color, or a dot where the game holds no position at that ply.
 */
function drawGlyphOf(
  context : CanvasRenderingContext2D,
  colors  : TrackColors,
  cursor  : number,
  facing  : Facing,
  loaded  : Loaded,
  party   : Party,
  x       : number
): void {
  const side = loaded.sideOf(party)
  const y    = ROWS[party]
  if (!side) return
  if (!loaded.has(party, cursor)) {
    context.fillStyle = colors.rule
    context.fillRect(x + GLYPH / 2 - 1, y + GLYPH / 2 - 1, 2, 2)
    return
  }
  drawGlyph(context, colors, facing, side.placements[loaded.plyOf(party, cursor)]!, x, y)
  context.fillStyle = colors[party]
  context.fillRect(x, party === 'submitted' ? y - 3 : y + GLYPH + 1, GLYPH, 2)
}

/**
 * Reads where the glyph of a ply's column starts across the track.
 */
function leftOf(cursor: number, loaded: Loaded): number {
  return columnOf(cursor, loaded) + (TRACK.column - GLYPH) / 2
}

/**
 * Reads where a ply's column starts across the track, in pixels.
 */
export function columnOf(cursor: number, loaded: Loaded): number {
  return (cursor - loaded.first) * TRACK.column
}

/**
 * Draws the track of every position of both games, a column per ply of the
 * cursor's range, the stored game's row shifted by the run's offset so its
 * positions line up with the submitted game's, each position the two share
 * drawn once between the two rows, each tenth ply numbered, and the words
 * naming where the two meet and part, or a line saying nothing matched in the
 * stored row, each glyph from the side the boards face.
 */
export function drawTrack(
  context : CanvasRenderingContext2D,
  colors  : TrackColors,
  facing  : Facing,
  loaded  : Loaded
): void {
  context.clearRect(0, 0, trackWidth(loaded), TRACK_HEIGHT)
  context.font         = `500 10px ${familyOf(IDENTITY.faces.code)}`
  context.textBaseline = 'alphabetic'
  for (let cursor = loaded.first; cursor <= loaded.last; cursor++) {
    drawColumn(context, colors, cursor, facing, loaded)
  }
  context.fillStyle = loaded.shared ? colors.run : colors.quiet
  if (loaded.shared) {
    for (const [cursor, word] of [[loaded.shared.meet, 'MEET'], [loaded.partAt!, 'PART']] as const) {
      context.fillText(word, leftOf(cursor, loaded), TRACK_HEIGHT - 4)
    }
    return
  }
  context.font = `italic 400 14px ${familyOf(IDENTITY.faces.body)}`
  context.fillText(`${NOTHING}.`, 12, ROWS.stored + GLYPH / 2 + 4)
}

/**
 * Lays out the head marking the cursor's column, in pixels: a column wide and
 * reaching 6 past the glyphs of the rows the match fills, the submitted row's
 * alone where no stored game was matched.
 */
export function headOf(loaded: Loaded): { height: number, top: number, width: number } {
  const top    = ROWS.submitted - 6
  const bottom = (loaded.match.stored ? ROWS.stored : ROWS.submitted) + GLYPH + 6
  return { height: bottom - top, top, width: TRACK.column }
}

/**
 * Reads the ply under a point on the track, held to the cursor's range.
 *
 * Args:
 *   loaded : The loaded match.
 *   x      : The point's distance from the track's left edge in pixels.
 */
export function plyUnder(loaded: Loaded, x: number): number {
  return loaded.first + Math.min(Math.max(Math.floor(x / TRACK.column), 0), loaded.last - loaded.first)
}

/**
 * Reads the track's width, one column for each ply of the cursor's range.
 */
export function trackWidth(loaded: Loaded): number {
  return (loaded.last - loaded.first + 1) * TRACK.column
}
