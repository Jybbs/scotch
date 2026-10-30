import fs   from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { loadReader } from '../../../lib/games/readers.ts'
import KEYS           from '../../../lib/rendered/keys.json' with { type: 'json' }
import { publicDir }  from '../../../lib/site/paths.ts'

const module = fs.readFileSync(new URL('../../../lib/games/crate/scotch_bg.wasm', import.meta.url))
const read   = await loadReader(module)

function served(name: string): string {
  return fs.readFileSync(path.join(publicDir(import.meta.url), 'games', `${name}.pgn`), 'utf8')
}

describe('loadReader', () => {
  it.each(Object.entries(KEYS))('keys each position of %s.pgn as the command line keys it', (name, keys) => {
    const [game] = read(served(name))
    expect(game?.keys).toEqual(keys.map(BigInt))
  })

  it('reads the tags in the order python-chess holds them, its placeholders filling the roster', () => {
    const [game] = read('[Opening "Sicilian"]\n[White "Tal"]\n\n1. e4 c5 *\n')
    expect(game?.tags).toEqual({
      Black   : '?',
      Date    : '????.??.??',
      Event   : '?',
      Opening : 'Sicilian',
      Result  : '*',
      Round   : '?',
      Site    : '?',
      White   : 'Tal'
    })
    expect(Object.keys(game!.tags)).toEqual([
      'Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result', 'Opening'
    ])
  })

  it('stops the mainline at a move it cannot read, recording python-chess’s message', () => {
    const [game] = read('1. e4 e5 2. Qxh7 Nc6 *\n')
    expect(game?.moves).toEqual(['e2e4', 'e7e5'])
    expect(game?.errors).toEqual([
      "illegal san: 'Qxh7' in rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    ])
  })

  it('reads a game for each blank-line-separated block of the text', () => {
    expect(read('1. e4 *\n\n1. d4 *\n\n').map(game => game.moves)).toEqual([['e2e4'], ['d2d4']])
  })
})
