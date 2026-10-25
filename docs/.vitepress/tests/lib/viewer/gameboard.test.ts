// @vitest-environment happy-dom
import { array, assert, constantFrom, integer, property, record } from 'fast-check'
import { afterEach, describe, expect }                            from 'vitest'

import { piecesAt }              from '../../../lib/viewer/drawing.ts'
import { EXAMPLES }              from '../../../lib/viewer/examples.ts'
import { GameBoard, type Reach } from '../../../lib/viewer/gameboard.ts'
import { PARTIES }               from '../../../lib/viewer/loaded.ts'
import { PACE }                  from '../../../lib/viewer/timeline.ts'
import { SQUARE, cornerOf }      from '../../../lib/viewer/trail.ts'
import { test }                  from '../../common/clock.ts'

const { stored, submitted } = EXAMPLES.match

afterEach(() => {
  document.body.replaceChildren()
})

/**
 * Reports whether a piece's node stands off every square's corner, as a piece
 * does while it travels between two squares.
 */
function between(node: Element): boolean {
  const { x, y } = placeOf(node)
  return Math.abs(x - Math.round(x / SQUARE) * SQUARE) + Math.abs(y - Math.round(y / SQUARE) * SQUARE) > 0.01
}

/**
 * Draws a board as the Viewer's figure does: its squares, the two marks of the
 * last move, the layer of pieces holding each piece `placement` stands at rest,
 * and the two arrows.
 */
function drawn(placement?: string): SVGSVGElement {
  const pieces = placement
    ? piecesAt(placement).map(({ markup, piece, square, transform }) =>
        `<g class="sc-viewer-piece" data-piece="${piece}" data-square="${square}" opacity="1" `
      + `transform="${transform}">${markup}</g>`)
    : []
  const squares = Array.from({ length: 64 }, (_, square) =>
    `<rect class="sc-viewer-square" data-square="${square}"/>`)
  const markup = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    `<g>${squares.join('')}</g>`,
    '<rect class="sc-viewer-hop"/><rect class="sc-viewer-hop"/>',
    `<g class="sc-viewer-pieces">${pieces.join('')}</g>`,
    ...PARTIES.map(party => `<g class="sc-viewer-arrow" data-game="${party}"><path/><path/></g>`),
    '</svg>'
  ]
  const parsed = new DOMParser().parseFromString(markup.join(''), 'image/svg+xml').documentElement
  const svg    = document.importNode(parsed, true) as unknown as SVGSVGElement
  document.body.append(svg)
  return svg
}

/**
 * Reads whether each game's arrow is lit, the submitted game's first.
 */
function lit(svg: SVGSVGElement): boolean[] {
  return PARTIES.map(party => {
    const arrow = svg.querySelector<SVGGElement>(`.sc-viewer-arrow[data-game='${party}']`)!
    return 'on' in arrow.dataset
  })
}

/**
 * Reads the place a piece's node stands at from its transform.
 */
function placeOf(node: Element): { x: number, y: number } {
  const [x, y] = /matrix\(\S+ \S+ \S+ \S+ (\S+) ([^)]+)\)/u.exec(node.getAttribute('transform')!)!
    .slice(1)
    .map(Number)
  return { x: x!, y: y! }
}

describe('GameBoard stepping', () => {
  test('snaps every piece of a ply into place on its first step', () => {
    const board = new GameBoard(drawn())
    board.load(submitted)
    expect(board.go(10, 'glide')).toBe(0)
    expect(board.checked).toBe(true)
  })

  test('takes over the pieces the build drew at rest, drawing no node for a piece already standing', () => {
    const svg   = drawn(submitted.placements[7])
    const nodes = [...svg.querySelectorAll('.sc-viewer-piece')]
    const board = new GameBoard(svg)
    board.load(submitted)
    board.go(7, 'jump')
    expect([...svg.querySelectorAll('.sc-viewer-piece')]).toEqual(nodes)
    expect(board.checked).toBe(true)
  })

  test('glides one ply, the moving piece passing between its two squares before it lands', ({ clock }) => {
    const svg   = drawn()
    const board = new GameBoard(svg)
    board.load(submitted)
    board.go(0, 'jump')
    const took = board.go(1, 'glide')
    clock.advanceTimersByTime(took / 2)
    expect([...svg.querySelectorAll('.sc-viewer-piece')].filter(node => between(node))).toHaveLength(1)
    clock.advanceTimersByTime(took)
    expect([board.checked, board.breaks]).toEqual([true, 0])
  })

  test('reads the time left to land a step it already stands at', ({ clock }) => {
    const board = new GameBoard(drawn())
    board.load(submitted)
    board.go(0, 'jump')
    const took = board.go(1, 'glide')
    clock.advanceTimersByTime(10)
    expect(board.go(1, 'glide')).toBeCloseTo(took - 10)
  })
})

describe('GameBoard over any run of steps', () => {
  test('lands on the last step’s ply, each piece setting off from where it stands', ({ clock }) => {
    assert(property(
      integer({ max: submitted.moves.length, min: 0 }),
      array(record({
        reach : constantFrom<Reach>('glide', 'jump', 'still'),
        to    : integer({ max: submitted.moves.length, min: 0 }),
        wait  : integer({ max: 900, min: 0 })
      }), { maxLength: 10 }),
      (opening, steps) => {
        const board = new GameBoard(drawn())
        board.load(submitted)
        board.go(opening, 'jump')
        for (const { reach, to, wait } of steps) {
          board.go(to, reach)
          clock.advanceTimersByTime(wait)
        }
        clock.advanceTimersByTime(10_000)
        expect([board.checked, board.breaks]).toEqual([true, 0])
        document.body.replaceChildren()
      }
    ), { numRuns: 60 })
  })

  test('steps back and forth inside one glide, turning each piece back from where it stands', ({ clock }) => {
    const board = new GameBoard(drawn())
    board.load(submitted)
    board.go(10, 'jump')
    for (const to of [11, 10, 11, 12, 11, 10, 9]) {
      board.go(to, 'glide')
      clock.advanceTimersByTime(PACE.ply / 3)
    }
    clock.advanceTimersByTime(10_000)
    expect([board.checked, board.breaks]).toEqual([true, 0])
  })
})

describe('GameBoard loading a game', () => {
  test('crossfades to a new game it loads, then lands on its position', ({ clock }) => {
    const board = new GameBoard(drawn())
    board.load(submitted)
    board.go(50, 'jump')
    board.load(stored)
    expect(board.go(50, 'jump')).toBeGreaterThanOrEqual(PACE.crossfade)
    clock.advanceTimersByTime(10_000)
    expect(board.checked).toBe(true)
  })

  test('snaps to a new game with no crossfade under reduced motion', () => {
    const board = new GameBoard(drawn())
    board.load(submitted)
    board.go(50, 'jump')
    board.load(stored)
    expect([board.go(50, 'still'), board.checked]).toEqual([0, true])
  })

  test('clears every piece where it is given no game', () => {
    const board = new GameBoard(drawn())
    board.load(submitted)
    board.go(5, 'jump')
    board.load(null)
    const shown = document.querySelectorAll('.sc-viewer-piece:not([display="none"])')
    expect([board.go(5, 'glide'), board.checked, shown.length]).toEqual([0, true, 0])
  })
})

describe('GameBoard turning and marking', () => {
  test('turns to Black’s side, standing each piece where its square now stands', () => {
    const board = new GameBoard(drawn())
    board.load(submitted)
    board.go(0, 'jump')
    board.turn('white')
    board.turn('black')
    const king = document.querySelector('.sc-viewer-piece[data-piece="K"]')!
    expect(placeOf(king)).toEqual(cornerOf(4, 'black'))
  })

  test.for([
    ['white', { from: 12, to: 28 }],
    ['black', { from: 12, to: 28 }]
  ] as const)('marks the last move’s two squares from %s’s side', ([facing, hop]) => {
    const svg   = drawn()
    const board = new GameBoard(svg)
    board.turn(facing)
    board.mark(hop)
    const marks = [...svg.querySelectorAll('.sc-viewer-hop')]
      .map(rect => ['opacity', 'x', 'y'].map(name => rect.getAttribute(name)))
    expect(marks).toEqual([hop.from, hop.to].map(square => {
      const { x, y } = cornerOf(square, facing)
      return ['1', String(x + 1.75), String(y + 1.75)]
    }))
    board.mark()
    expect([...svg.querySelectorAll('.sc-viewer-hop')].map(rect => rect.getAttribute('opacity')))
      .toEqual(['0', '0'])
  })

  test('draws each game’s parting move as an arrow, the heads apart where both reach one square', () => {
    const svg   = drawn()
    const board = new GameBoard(svg)
    const heads = (): string[] => PARTIES.map(party =>
      svg.querySelector(`[data-game='${party}'] path:last-child`)!.getAttribute('d')!)
    board.point({ stored: { from: 6, to: 21 }, submitted: { from: 12, to: 21 } })
    const apart = heads()
    expect(lit(svg)).toEqual([true, true])
    board.point({ stored: { from: 6, to: 21 }, submitted: { from: 12, to: 28 } })
    expect(heads()[1]).not.toBe(apart[1])
    board.point({ stored: { from: 6, to: 21 } })
    expect(lit(svg)).toEqual([false, true])
    board.point()
    expect(svg.querySelectorAll('[data-on]')).toHaveLength(0)
  })
})

describe('GameBoard finishing', () => {
  test('settles a step still running at its end when it finishes', ({ clock }) => {
    const board = new GameBoard(drawn())
    board.load(submitted)
    board.go(0, 'jump')
    board.go(20, 'glide')
    clock.advanceTimersByTime(30)
    board.finish()
    board.finish()
    expect(board.checked).toBe(true)
  })

  test('marks the squares the two boards differ on, clearing every other square', () => {
    const svg    = drawn()
    const board  = new GameBoard(svg)
    const marked = (): number[] => [...svg.querySelectorAll<SVGRectElement>('.sc-viewer-square[data-differ]')]
      .map(rect => Number(rect.dataset.square))
    board.differ([12, 28])
    board.differ([28, 4])
    expect(marked()).toEqual([4, 28])
    board.differ()
    expect(marked()).toEqual([])
  })

  test('reads an empty board as checked before it draws any game', () => {
    expect(new GameBoard(drawn()).checked).toBe(true)
  })
})
