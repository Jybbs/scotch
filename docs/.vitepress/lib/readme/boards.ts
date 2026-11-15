import type { Game }  from '../front/example.ts'
import { mix }        from '../identity/colors.ts'
import { hexOf }      from '../identity/tokens.ts'
import { DURATIONS }  from '../motion/timing.ts'
import * as games     from '../viewer/games.ts'
import { moveTo }     from '../viewer/placements.ts'
import * as parts     from './parts.ts'

/**
 * The colors the board's squares take, its light squares and its dark ones.
 */
const SQUARES = { dark: hexOf('primary'), light: hexOf('light') } as const

/**
 * Outlines the two squares of the move that reached a ply in its game's color,
 * and nothing at the starting position.
 */
function lastMoveOf(game: Game, ply: number, shot: parts.Shot): string {
  const { colors, scene } = shot
  const size = parts.LAYOUT.board / 8
  const hop  = moveTo(scene.loaded.sideOf(game)!.placements, ply)
  return hop ? [hop.from, hop.to].map(square => {
    const [left, top] = squareAt(square)
    return parts.rect({
      'fill'         : 'none',
      'height'       : size * 0.88,
      'stroke'       : colors[game],
      'stroke-width' : size * 0.08,
      'width'        : size * 0.88,
      'x'            : left + size * 0.06,
      'y'            : top + size * 0.06
    })
  }).join('') : ''
}

function squareAt(square: number): [number, number] {
  const size = parts.LAYOUT.board / 8
  return [(square % 8) * size, (7 - Math.floor(square / 8)) * size]
}

/**
 * Draws one game's board at the frame's moment: its squares, the outlines of
 * the move the cursor reached, and each piece sliding from its square before
 * the move to its square after, a piece the move takes fading out.
 */
export async function boardOf(game: Game, shot: parts.Shot, x: number): Promise<string> {
  const { frame, scene } = shot
  const size    = parts.LAYOUT.board / 8
  const u       = parts.progress(frame)
  const before  = new Map(scene.front.example[game][frame.from]!.standing.map(each => [each.id, each]))
  const after   = new Map(scene.front.example[game][frame.to]!.standing.map(each => [each.id, each]))
  const squares = Array.from({ length: 64 }, (_, square) => {
    const [left, top] = squareAt(square)
    const shade       = (square + Math.floor(square / 8)) % 2 ? 'light' : 'dark'
    return parts.rect({ fill: SQUARES[shade], height: size + 0.2, width: size + 0.2, x: left, y: top })
  })
  const pieces = [...new Set([...before.keys(), ...after.keys()])].map(id => {
    const [a, b]   = [before.get(id), after.get(id)]
    const [ax, ay] = squareAt((a ?? b)!.square)
    const [bx, by] = squareAt((b ?? a)!.square)
    const piece    = `<use href="#piece-${(b ?? a)!.piece}" transform="scale(${size / 45})"/>`
    return parts.at(ax + (bx - ax) * u, ay + (by - ay) * u, piece, a ? (b ? 1 : 1 - u) : u)
  })
  const marks = await parts.crossfade(frame, ply => lastMoveOf(game, ply, shot))
  return parts.at(x, parts.TOPS.board, squares.join('') + marks + pieces.join(''))
}

/**
 * Names one game's side under its board beside a swatch of its color, and sets
 * the move its cursor reached at the side's right edge, or `Start` before the
 * first.
 */
export async function captionOf(game: Game, name: string, shot: parts.Shot, x: number): Promise<string> {
  const { colors, frame, outliner, scene } = shot
  const caption = { color: colors.ink, face: 'display', height: parts.LAYOUT.caption, size: 16 } as const
  const width   = parts.LAYOUT.board + 2 * parts.LAYOUT.ring - 15
  const [title, moves] = await Promise.all([
    outliner.line(name, { ...caption, width }),
    parts.crossfade(frame, ply => outliner.line(
      ply ? games.numbered(scene.loaded.sideOf(game)!, ply - 1) : 'Start',
      { ...caption, align: 'flex-end', color: colors.quiet, face: 'code', size: 13, width }
    ))
  ])
  return parts.swatch(colors[game], x, parts.TOPS.side + 8) + parts.at(x + 15, parts.TOPS.side, title + moves)
}

/**
 * Rings one game's board in its game's color, mixed toward the color of a run
 * while the two games show one position, around a hairline in the rule's color.
 */
export function ringOf(game: Game, shot: parts.Shot, x: number): string {
  const { colors, frame, scene } = shot
  const { board, ring }          = parts.LAYOUT
  const was   = Number(scene.loaded.sharing(frame.from))
  const is    = Number(scene.loaded.sharing(frame.to))
  const share = was + (is - was) * parts.progress(frame, DURATIONS.settle)
  const band  = mix(colors.run, 100 * share, colors[game], 'srgb')
  const outer = board + 2 * ring
  const inner = board + 2
  return parts.rect({ fill: band, height: outer, rx: 5, width: outer, x: x - ring, y: 0 })
       + parts.rect({ fill: colors.rule, height: inner, rx: 3.5, width: inner, x: x - 1, y: ring - 1 })
}
