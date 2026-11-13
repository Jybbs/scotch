import { describe, expect, it } from 'vitest'

import * as crowding        from '../../../lib/data/crowding.ts'
import type { OpeningLine } from '../../../lib/data/parting.ts'

const line = (games: number, ...sans: string[]): OpeningLine =>
  ({ games, placement: sans.join(' '), reach: games, sans })

const LINES = [
  line(60, 'e4'), line(30, 'd4'), line(20, 'e4', 'e5'), line(35, 'e4', 'c5'), line(10, 'e4', 'c5', 'Nf3')
]
const blocks = crowding.blocksOf(3, LINES, 100)
const named  = (sans: string): crowding.Block => blocks.find(each => each.line.sans.join(' ') === sans)!

describe('the tree of opening lines', () => {
  it('lays each line under the one it continues, the most played first, down to the rows drawn', () => {
    expect(blocks.map(each => [each.line.sans.join(' '), each.start])).toEqual([
      ['', 0], ['e4', 0], ['d4', 0.6], ['e4 c5', 0], ['e4 e5', 0.35]
    ])
    expect(named('e4 c5').share).toBe(0.35)
  })

  it('finds the block under a point, or none over the blank a thinner line leaves', () => {
    const layout = crowding.crowdingLayout(1000)
    expect(crowding.blockAt(blocks, layout, 700, 1.5 * layout.row)).toBe(named('d4'))
    expect(crowding.blockAt(blocks, layout, 950, 1.5 * layout.row)).toBeUndefined()
  })

  it.each([
    ['ArrowRight', 'e4 c5', 'e4 e5'],
    ['ArrowLeft', 'e4 c5', 'e4 c5'],
    ['ArrowUp', 'e4 c5', 'e4'],
    ['ArrowDown', 'e4', 'e4 c5'],
    ['ArrowDown', 'e4 c5', 'e4 c5']
  ])('steps on %s from %s to %s', (key, from, to) => {
    expect(crowding.blockStepped(named(from), blocks, key)).toBe(named(to))
  })

  it('answers no other key', () => {
    expect(crowding.blockStepped(named('e4'), blocks, 'Tab')).toBeUndefined()
  })

  it('draws fewer, shorter rows and a smaller board on a phone', () => {
    const [phone, wide] = [crowding.crowdingLayout(400), crowding.crowdingLayout(800)]
    expect([phone.rows, phone.row, phone.board]).toEqual([7, 30, 132])
    expect(wide.height).toBe(9 * 34 + 4)
  })

  it('names each block by its move behind its number and writes the sentence it reads', () => {
    const names = blocks.map(each => crowding.blockName(each))
    expect(names).toEqual(['Start', '1. e4', '1. d4', '1...c5', '1...e5'])
    expect(crowding.lineOf(['e4', 'c5', 'Nf3'])).toBe('1. e4 c5 2. Nf3')
    expect([blocks[0]!, named('e4 c5')].map(each => crowding.positionOf(each)))
      .toEqual(['The starting position', 'The position after 1. e4 c5'])
    expect(crowding.crowdingSentence(blocks[0]!, 100))
      .toBe('Every one of the 100 stored games opens in this position.')
    expect(crowding.crowdingSentence(named('e4 c5'))).toBe(
      'After 1. e4 c5, 35 stored games still play the same line, 35.0% of the store, and 35 reach its '
      + 'position by any order of moves.'
    )
  })
})
