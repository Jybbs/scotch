import { type SheetRow, sheetOf } from '../viewer/sheet.ts'
import * as parts                from './parts.ts'

/**
 * The measures of the two sheets in pixels, the width of one move's column,
 * each sheet's width, and the height of one row.
 */
interface Ruling {
  column : number
  half   : number
  height : number
}

/**
 * The room between the two sheets, and the room each sheet keeps on its left
 * for the move numbers.
 */
const SHEET = { gap: 12, numbers: 22 } as const

/**
 * Finds the cell of the sheet holding the move that reached a ply, as its left
 * edge and its top, and nothing where no move on the sheet reached it.
 */
function cellOf(ply: number, rows: readonly SheetRow[], ruling: Ruling): [number, number] | undefined {
  const at = rows.findIndex(row => row.submitted.white?.reach === ply || row.submitted.black?.reach === ply)
  if (at < 0) return undefined
  return [SHEET.numbers + (rows[at]!.submitted.white?.reach === ply ? 0 : ruling.column), at * ruling.height]
}

/**
 * Draws the chip under the move the cursor reached on both sheets, sliding
 * from the move it leaves to the move it reaches, fading in from the starting
 * position and out past the last move on the sheet.
 */
function chipOf(rows: readonly SheetRow[], ruling: Ruling, shot: parts.Shot): string {
  const { colors, frame } = shot
  const u                 = parts.progress(frame)
  const [from, to]        = [cellOf(frame.from, rows, ruling), cellOf(frame.to, rows, ruling)]
  const [start, end]      = [from ?? to ?? [0, 0], to ?? from ?? [0, 0]]
  const [x, y]            = [0, 1].map(axis => start[axis]! + (end[axis]! - start[axis]!) * u)
  const shown             = from && to ? 1 : (to ? u : (from ? 1 - u : 0))
  const chip              = parts.rect({
    fill   : colors.ink,
    height : 0.6 * ruling.height,
    rx     : 3,
    width  : ruling.column - 4
  })
  return [0, ruling.half + SHEET.gap]
    .map(left => parts.at(left + x! - 3, y! + 0.2 * ruling.height, chip, shown))
    .join('')
}

/**
 * Sets one row of both sheets: the move number, then each move in the ink's
 * color, crossing to the page's color over the chip while the cursor reaches
 * that move.
 */
async function rowOf(index: number, row: SheetRow, ruling: Ruling, shot: parts.Shot): Promise<string> {
  const { colors, frame, outliner } = shot
  const { column, half, height }    = ruling
  const top    = index * height
  const u      = parts.progress(frame)
  const move   = { face: 'code', height, size: 13, width: column - 4 } as const
  const number = { ...move, align: 'flex-end', color: colors.quiet, size: 11, width: 18 } as const
  const inked  = { ...move, color: colors.ink }
  const paged  = { ...move, color: colors.page }
  const lit    = (reach: number): number => frame.from === frame.to
                                         ? Number(frame.to === reach)
                                         : (frame.from === reach ? 1 - u : 0) + (frame.to === reach ? u : 0)
  const sides = [
    { cells: [row.submitted.white, row.submitted.black], left: 0 },
    { cells: [row.stored.white, row.stored.black], left: half + SHEET.gap }
  ]
  const numeral = await outliner.line(String(row.index + 1), number)
  const moves   = await Promise.all(sides.flatMap(({ cells, left }) => cells.map(async (cell, place) => {
    if (!cell) return ''
    const x               = left + SHEET.numbers + place * column
    const [plain, bright] = await Promise.all([
      outliner.line(cell.san, inked),
      outliner.line(cell.san, paged)
    ])
    return parts.at(x, top, plain, 1 - lit(cell.reach)) + parts.at(x, top, bright, lit(cell.reach))
  })))
  return sides.map(({ left }) => parts.at(left, top, numeral)).join('') + moves.join('')
}

/**
 * Draws the rules of both sheets: a tint behind each row of the run and a
 * hairline under every row, beside a bar between the sheets in the run's color
 * along the run's rows and the rule's color along the rest.
 */
function rulesOf(rows: readonly SheetRow[], ruling: Ruling, shot: parts.Shot): string {
  const { colors }       = shot
  const { half, height } = ruling
  return rows.map((row, index) => {
    const top   = index * height
    const sides = [0, half + SHEET.gap].map(x =>
        (row.run ? parts.rect({ fill: colors.tint, height: height - 2, width: half, x, y: top + 2 }) : '')
      + parts.rect({ fill: colors.rule, height: 1, width: half, x, y: top + height }))
    const bar = parts.rect({
      fill   : row.run ? colors.run : colors.rule,
      height : height - 2,
      width  : 4,
      x      : half + 4,
      y      : top + 2
    })
    return sides.join('') + bar
  }).join('')
}

/**
 * Draws both games' score sheets up to the move where the games part, under a
 * rule in the ink's color, each row of the run tinted, a bar in the run's
 * color between them, and a chip under the move the cursor reached on each.
 */
export async function sheetsOf(shot: parts.Shot, width: number, x: number): Promise<string> {
  const { loaded } = shot.scene
  const rows       = sheetOf(loaded).rows.slice(0, Math.ceil(loaded.shared!.part / 2))
  const half       = (width - SHEET.gap) / 2
  const ruling     = { column: (half - SHEET.numbers) / 2, half, height: parts.LAYOUT.board / rows.length }
  const texts      = await Promise.all(rows.map((row, index) => rowOf(index, row, ruling, shot)))
  const drawn      = [
    parts.rect({ fill: shot.colors.ink, height: 2, width, x: 0, y: 0 }),
    rulesOf(rows, ruling, shot),
    chipOf(rows, ruling, shot),
    ...texts
  ]
  return parts.at(x, parts.TOPS.board, drawn.join(''))
}
