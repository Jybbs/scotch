// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { exampleOf }                               from '../../../../../docs/.vitepress/lib/methods/example.ts'
import { marksAt }                                 from '../../../../../docs/.vitepress/lib/methods/squares.ts'
import { framed }                                  from '../../../../../docs/.vitepress/lib/methods/standing.ts'
import { GlidingBoard, type Wash, drawPiece, drawSquares } from '../../../../../docs/.vitepress/theme/components/methods/board.ts'
import { reduceMotion }                            from '../../../common/motion.ts'

const methods  = exampleOf()
const standing = framed(methods.submitted)

/**
 * Mounts the board at a ply of the Methods example, each square the two games
 * differ on marked.
 */
function boardAt(ply: number): ReturnType<typeof mount<typeof GlidingBoard>> {
  return mount(GlidingBoard, {
    props: { label: `Ply ${ply}`, marks: marksAt(methods, ply), standing: standing[ply]! }
  })
}

/**
 * Reads the classes of the layer the board's pieces stand in.
 */
const layer = (): string => boardAt(0).find('[role=img] > div:last-child').classes().join(' ')

describe('GlidingBoard', () => {
  it('lays the squares out from a8, the light squares where a1 is dark', () => {
    const shades = boardAt(0).findAll('i[data-shade]').map(square => square.attributes('data-shade'))
    expect([shades[0], shades[7], shades[56], shades[63]]).toEqual(['light', 'dark', 'dark', 'light'])
  })

  it('marks each square the two games differ on with the game standing a piece there', () => {
    const marked = boardAt(6).findAll('i[data-mark]').map(square => square.attributes('data-mark'))
    expect(marked.toSorted()).toEqual(['stored', 'stored', 'submitted', 'submitted'])
  })

  it('marks no square where the two games stand on one position', () => {
    expect(boardAt(7).findAll('i[data-mark]')).toHaveLength(0)
  })

  it('draws each piece the ply shows on its square, under the name it keeps', () => {
    const piece = boardAt(1).find("[data-id='11']").element as HTMLElement
    expect(piece.style.transform).toBe('translate(300%, 400%)')
    expect(piece.style.opacity).toBe('1')
  })

  it('keeps each piece one node as the board steps, so it glides to its new square', async () => {
    const board  = boardAt(0)
    const before = board.find("[data-id='11']").element
    await board.setProps({ standing: standing[1]! })
    expect(board.find("[data-id='11']").element).toBe(before)
  })

  it('fades a captured piece out where it stood', () => {
    const taken = standing.findIndex(line => line.some(one => one.gone))
    const gone  = standing[taken]!.find(one => one.gone)!
    const piece = boardAt(taken).find(`[data-id='${gone.id}']`).element as HTMLElement
    expect(piece.style.opacity).toBe('0')
  })

  it(
    'glides its pieces while the drawings move and holds them still where the reader prefers reduced motion',
    () => {
      expect(layer()).toContain('duration-glide')
      reduceMotion()
      expect(layer()).not.toContain('duration-glide')
    }
  )

  it('names what it draws for a reader who cannot see it', () => {
    expect(boardAt(3).find('[role=img]').attributes('aria-label')).toBe('Ply 3')
  })
})

describe('drawPiece', () => {
  it('draws a ghost hollow, named and keyed for the piece it stays', () => {
    const piece = drawPiece('g4', { ghost: true, opacity: 0.5, piece: 'q', square: 4 })
    expect([piece.key, piece.props!['data-ghost'], piece.props!['data-piece']]).toEqual(['g4', '', 'q'])
  })
})

describe('drawSquares', () => {
  it('draws the 64 squares in their shades', () => {
    expect(drawSquares().children).toHaveLength(64)
  })

  it('washes the squares a move leaves and enters, apart from the two games\' marks', () => {
    const marks: Wash[] = []
    marks[12] = 'from'
    marks[28] = 'to'
    const board = mount(GlidingBoard, { props: { label: 'Ply 1', marks, standing: standing[0]! } })
    expect(board.findAll('i[data-mark]').map(square => square.attributes('data-mark'))).toEqual(['to', 'from'])
  })
})
