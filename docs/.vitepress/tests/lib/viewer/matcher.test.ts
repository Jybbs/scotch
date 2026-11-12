import fs from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { loadReader }     from '../../../lib/games/readers.ts'
import { Matcher }        from '../../../lib/viewer/matcher.ts'
import { ORIGIN, bucket } from '../../common/store.ts'

vi.mock(import('../../../lib/games/readers.ts'), async original => {
  const readers = await original()
  return { ...readers, loadReader: vi.fn<typeof readers.loadReader>(readers.loadReader) }
})

const module = fs.readFileSync(new URL('../../../lib/games/crate/scotch_bg.wasm', import.meta.url))
const viewer = fs.readFileSync(new URL('../../../../public/games/viewer.pgn', import.meta.url), 'utf8')

describe('Matcher', () => {
  it('matches the first game a text carries, opening the store once across submissions', async () => {
    const { fetch, requests } = bucket()
    const matcher             = new Matcher({ fetch, module, origin: ORIGIN })
    const first               = await matcher.submit('viewer.pgn', `${viewer}\n[White "A"]\n\n1. e4 *\n`)
    await matcher.submit('viewer.pgn', viewer)
    expect(first.matches?.match(0).stored?.headers.White).toBe('Kasparov, Gary')
    expect(first.matches?.match(0).submitted.moves.slice(0, 3)).toEqual(['Nf3', 'Nf6', 'c4'])
    expect(requests.filter(request => request.endsWith('manifest.json'))).toHaveLength(1)
  })

  it.each([
    ['a text holding no game', '', 'Found no game in the pasted game'],
    [
      'an illegal move',
      '1. e4 e5 2. Ke3 *',
      'Found problems in the game in the pasted game:\n'
      + 'illegal san: \'Ke3\' in rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    ],
    [
      'a variant other than standard chess',
      '[Variant "Atomic"]\n\n1. e4 *',
      'Found problems in the game in the pasted game:\nunsupported variant: Atomic'
    ]
  ])('reports %s as the command line reports it', async (_, text, problem) => {
    const matcher = new Matcher({ fetch: bucket().fetch, module, origin: ORIGIN })
    expect(await matcher.submit('the pasted game', text)).toEqual({ problem })
  })

})

describe('Matcher losing what it reads from', () => {
  it('reports a store request failing with a value other than an error by that value', async () => {
    const { fetch } = bucket()
    vi.mocked(fetch).mockRejectedValueOnce('offline')
    expect(await new Matcher({ fetch, module, origin: ORIGIN }).submit('viewer.pgn', viewer))
      .toEqual({ problem: 'Cannot reach the store: offline' })
  })

  it('reports a store it cannot reach, then opens it again on the next submission', async () => {
    const { fetch } = bucket()
    const matcher   = new Matcher({ fetch, module, origin: ORIGIN })
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await matcher.submit('viewer.pgn', viewer)).toEqual({ problem: 'Cannot reach the store: Failed to fetch' })
    expect((await matcher.submit('viewer.pgn', viewer)).matches?.ties).toHaveLength(1)
  })

  it('reports a reader it cannot load, then loads it again on the next submission', async () => {
    const matcher = new Matcher({ fetch: bucket().fetch, module, origin: ORIGIN })
    vi.mocked(loadReader).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await matcher.submit('viewer.pgn', viewer)).toEqual({ problem: 'Cannot load the reader: Failed to fetch' })
    expect((await matcher.submit('viewer.pgn', viewer)).matches?.ties).toHaveLength(1)
  })
})
