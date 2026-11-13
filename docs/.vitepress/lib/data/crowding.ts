import { numbered }                 from '../viewer/games.ts'
import type { CornerMark }          from './corner.ts'
import * as numbers                 from './numbers.ts'
import { type OpeningLine, SHARED } from './parting.ts'

/**
 * One block of the tree of opening lines: its line, the ply it ends on, which
 * names its row, and where it starts across the tree and how far it runs, each
 * as a share of the tree's width.
 */
export interface Block {
  depth : number
  line  : OpeningLine
  share : number
  start : number
}

/**
 * Where the rows of the tree and the board beside the line picked sit at a
 * width.
 */
export interface CrowdingLayout {
  board  : number
  height : number
  row    : number
  rows   : number
  width  : number
}

/**
 * The marks the tree of opening lines carries in its corner.
 */
export const CROWDING_MARKS: readonly CornerMark[] = [
  { key: 'path', label: 'The line picked and the moves before it', tone: 'var(--sc-data-link)' },
  { glyph: '↔', key: null, label: 'Wider, more games', tone: 'var(--sc-data-ink)' }
]
/**
 * The placement every stored game opens on.
 */
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

/**
 * Reads whether a block's line continues another's by one move.
 */
function continues(block: Block, other: Block): boolean {
  return opens(other.line, block.line)
}

/**
 * Reads whether one line opens another, every move of the first starting the
 * second.
 */
function opens(line: OpeningLine, longer: OpeningLine): boolean {
  return line.sans.every((san, at) => longer.sans[at] === san)
}

/**
 * Finds the block a point `x` pixels across and `y` pixels down the tree falls
 * in, or `undefined` for a point over the blank a thinner line leaves.
 */
export function blockAt(
  blocks : readonly Block[],
  layout : CrowdingLayout,
  x      : number,
  y      : number
): Block | undefined {
  const depth = Math.floor(y / layout.row)
  const at    = x / layout.width
  return blocks.find(block => block.depth === depth && block.start <= at && at < block.start + block.share)
}

/**
 * Names a block by the move it ends on behind its number, or the start for the
 * block every stored game stands in.
 */
export function blockName(block: Block): string {
  return block.depth ? numbered({ headers: {}, moves: [...block.line.sans] }, block.depth - 1) : 'Start'
}

/**
 * Steps from a block by an arrow key, left and right to the block beside it in
 * its row, up to the line it continues, and down to the line continuing it that
 * the most stored games play.
 *
 * Returns:
 *   The block the key moves to, the same block where none stands that way, or
 *   `undefined` for a key the tree does not answer.
 */
export function blockStepped(block: Block, blocks: readonly Block[], key: string): Block | undefined {
  const row      = blocks.filter(other => other.depth === block.depth)
  const at       = row.indexOf(block)
  const parent   = blocks.find(other => other.depth === block.depth - 1 && continues(block, other))
  const children = blocks.filter(other => other.depth === block.depth + 1 && continues(other, block))
  const steps: Partial<Record<string, Block | undefined>> = {
    ArrowDown  : children.toSorted((one, other) => other.line.games - one.line.games)[0],
    ArrowLeft  : row[at - 1],
    ArrowRight : row[at + 1],
    ArrowUp    : parent
  }
  return key in steps ? steps[key] ?? block : undefined
}

/**
 * Lays the opening lines out as a tree, the start on top as wide as every
 * stored game and each line beneath the one it continues, as wide as the
 * stored games playing it and the most played first, down to `rows` rows.
 *
 * Returns:
 *   Every block, row by row and each row from the left.
 */
export function blocksOf(
  rows  : number,
  lines : readonly OpeningLine[] = SHARED.lines,
  total : number                 = SHARED.every.games
): Block[] {
  const kept   = lines.filter(line => line.sans.length < rows)
  const root   = { games: total, placement: START, reach: total, sans: [] }
  const placed = (line: OpeningLine, start: number): Block[] => {
    const share    = line.games / total
    const children = kept
      .filter(child => child.sans.length === line.sans.length + 1 && opens(line, child))
      .toSorted((one, other) => other.games - one.games)
    const starts   = numbers.accumulated([0, ...children.map(child => child.games / total)])
    return [
      { depth: line.sans.length, line, share, start },
      ...children.flatMap((child, at) => placed(child, start + starts[at]!))
    ]
  }
  return placed(root, 0).toSorted((one, other) => one.depth - other.depth || one.start - other.start)
}

/**
 * Lays the tree across `width`, a row per ply down to the eighth with the start
 * on top, fewer and shorter rows and a smaller board on a phone.
 */
export function crowdingLayout(width: number): CrowdingLayout {
  const narrow = width < 480
  const row    = narrow ? 30 : 34
  const rows   = narrow ? 7 : 9

  return { board: narrow ? 132 : 148, height: rows * row + 4, row, rows, width }
}

/**
 * Writes the sentence the tree reads for a block.
 */
export function crowdingSentence(block: Block, total: number = SHARED.every.games): string {
  if (!block.depth) return `Every one of the ${numbers.counted(total)} stored games opens in this position.`
  return `After ${lineOf(block.line.sans)}, ${numbers.counted(block.line.games)} stored games still play `
       + `the same line, ${numbers.percent(block.share, 1)} of the store, and `
       + `${numbers.counted(block.line.reach)} reach its position by any order of moves.`
}

/**
 * Writes a line's moves in SAN, each of White's behind its number.
 */
export function lineOf(sans: readonly string[]): string {
  return sans.map((san, at) => at % 2 ? san : numbered({ headers: {}, moves: [...sans] }, at)).join(' ')
}

/**
 * Names the position a block's line reaches, for the board drawing it.
 */
export function positionOf(block: Block): string {
  return block.depth ? `The position after ${lineOf(block.line.sans)}` : 'The starting position'
}
