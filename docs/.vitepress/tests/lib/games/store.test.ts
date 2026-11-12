import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import { loadReader }     from '../../../lib/games/readers.ts'
import { Published }      from '../../../lib/games/store.ts'
import { EXAMPLES }       from '../../../lib/viewer/examples.ts'
import { ORIGIN, bucket } from '../../common/store.ts'

const module = fs.readFileSync(new URL('../../../lib/games/crate/scotch_bg.wasm', import.meta.url))
const read   = await loadReader(module)
const viewer = fs.readFileSync(new URL('../../../../public/games/viewer.pgn', import.meta.url), 'utf8')

/**
 * Reads the one game `text` carries.
 */
function only(text: string): ReturnType<typeof read>[number] {
  const [game] = read(text)
  return game!
}

describe('Published matching a game', () => {
  it('matches the Viewer’s example game as the command line matches it', async () => {
    const { span, stored, submitted } = EXAMPLES.match
    const store                       = await Published.open(ORIGIN, bucket().fetch)
    const [match]                     = await store.matches(only(viewer))
    expect(match?.span).toEqual(span)
    expect(match?.ties).toBe(0)
    expect(match?.submitted).toMatchObject({ moves: submitted.moves, placements: submitted.placements })
    expect(match?.stored).toMatchObject({ moves: stored?.moves, placements: stored?.placements })
    expect(match?.stored?.headers).toMatchObject({ Black: 'Sosonko, Gennadi', White: 'Kasparov, Gary' })
  })

  it('reads the head, then only the pieces a lookup reaches, and reads no piece twice', async () => {
    const { fetch, requests } = bucket()
    const store               = await Published.open(ORIGIN, fetch)
    await store.matches(only(viewer))
    const first = requests.length
    await store.matches(only(viewer))
    expect(requests.slice(0, 2)).toEqual([
      `${ORIGIN}/manifest.json`, `${ORIGIN}/474151645cdb4cc7.bin bytes=0-299`
    ])
    expect(first).toBeGreaterThan(2)
    expect(requests).toHaveLength(first)
  })

  it('gives each stored game tied on the longest run a match of its own', async () => {
    const start   = { length: 1, offset: 0, start: 0 }
    const store   = await Published.open(ORIGIN, bucket().fetch)
    const matches = await store.matches(only('[White "A"]\n\n*\n'))
    expect(matches).toHaveLength(3)
    expect(matches.map(match => match.ties)).toEqual([2, 2, 2])
    expect(matches.map(match => match.span)).toEqual([start, start, start])
    expect(new Set(matches.map(match => match.stored?.headers.Date)).size).toBe(3)
  })

  it('gives one match holding no stored game where none shares a position', async () => {
    const store = await Published.open(ORIGIN, bucket().fetch)
    const game  = only('[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n[SetUp "1"]\n\n1. Kf1 *\n')
    const alone = { headers: game.tags, moves: ['Kf1'], placements: game.placements }
    expect(await store.matches(game)).toEqual([{ span: null, stored: null, submitted: alone, ties: 0 }])
  })
})

describe('Published as it opens', () => {
  it.each([
    {
      name    : 'a manifest it cannot find',
      origin  : `${ORIGIN}/elsewhere`,
      problem : 'The store’s manifest answered 404',
      status  : 206
    },
    {
      name    : 'a whole file for a range',
      origin  : ORIGIN,
      problem : 'The store answered 200 to a range request',
      status  : 200
    }
  ])('refuses $name', async ({ origin, problem, status }) => {
    await expect(Published.open(origin, bucket(status).fetch)).rejects.toThrow(problem)
  })
})
