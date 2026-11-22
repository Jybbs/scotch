import { describe, expect, it } from 'vitest'

import { EXAMPLES, type Match, SAMPLES } from '../../../../docs/.vitepress/lib/viewer/examples.ts'
import * as links                        from '../../../../docs/.vitepress/lib/viewer/link.ts'
import { Loaded }                        from '../../../../docs/.vitepress/lib/viewer/loaded.ts'
import { useViewer }                     from '../../../../docs/.vitepress/lib/viewer/state.ts'
import type { Facing }                   from '../../../../docs/.vitepress/lib/viewer/trail.ts'

/**
 * Flips one character of a link's carried text, as a link altered in transit
 * would.
 */
function altered(text: string): string {
  const at = Math.floor(text.length / 2)
  return text.slice(0, at) + (text[at] === 'A' ? 'B' : 'A') + text.slice(at + 1)
}

/**
 * Lists, for each example and side, the plies just inside and just outside each
 * end of the range its loaded match spans, and plies far past either end, each
 * beside the ply the cursor is clamped to there.
 */
const CLAMPED = SAMPLES.flatMap(({ name }) => {
  const { first, last } = new Loaded(EXAMPLES[name])
  return (['black', 'white'] as const).flatMap(side => ([
    ['far before the first', first - 1000, first],
    ['one before the first', first - 1, first],
    ['at the first', first, first],
    ['one past the first', first + 1, first + 1],
    ['one before the last', last - 1, last - 1],
    ['at the last', last, last],
    ['one past the last', last + 1, last],
    ['far past the last', last + 1000, last]
  ] as const).map(([at, ply, held]) => ({ at, held, name, ply, side })))
})

/**
 * Reads the side a fragment carries, which it leaves out while the boards face
 * White's.
 */
function carried(side: Facing): { side?: Facing } {
  return side === 'black' ? { side } : {}
}

/**
 * Reads the side a link opens the boards on, White's where it names none.
 */
function facingOf(reading: links.Place): Facing {
  return reading.side ?? 'white'
}

describe('fromLink', () => {
  it.each(CLAMPED)(
    'reads the $name example back facing $side $at, at $ply, the cursor held to $held once loaded',
    async ({ held, name, ply, side }) => {
      const fragment = links.fragmentOf({ encoded: await links.encodedOf(EXAMPLES[name]) }, { ply, side })
      const reading  = await links.fromLink(fragment) as links.Place & links.Reading
      const viewer   = useViewer()
      expect(reading).toEqual({ match: EXAMPLES[name], ply, ...carried(side) })
      viewer.load(EXAMPLES[name], 'A link', undefined, reading.ply)
      viewer.turn(facingOf(reading))
      expect(viewer.cursor.value).toBe(held)
      expect(viewer.facing.value).toBe(side)
    }
  )

  it.each(SAMPLES.map(({ name }) => name))('reads the %s example back by name', async sample => {
    expect(await links.fromLink(links.fragmentOf({ sample }, {})))
      .toEqual({ match: EXAMPLES[sample], sample })
  })

  it.each([
    ['a link cut short', (text: string) => text.slice(0, text.length - 12)],
    ['a link altered in transit', altered],
    ['a fragment holding no match', () => '']
  ])('refuses %s', async (_, damage) => {
    const encoded = await links.encodedOf(EXAMPLES.match)
    expect(await links.fromLink(`match=${damage(encoded)}`)).toEqual({
      problem: 'The link holds no match, or was cut short or altered'
    })
  })

  it.each(['ply=3', 'sample=nope&ply=3'])('refuses %s, naming no example and no match', async fragment => {
    expect(await links.fromLink(fragment)).toEqual({
      problem: 'The link holds no match, or was cut short or altered'
    })
  })

  it('names what a link carrying something other than a match lacks', async () => {
    const encoded = await links.encodedOf({ submitted: null } as unknown as Match)
    expect(await links.fromLink(`match=${encoded}`))
      .toEqual({ problem: 'The link: `submitted` holds null rather than an object' })
  })
})

describe('fromLink reading the cover', () => {
  it.each([
    ['the cover a link carries', 'sample=match&cover=1', { cover: true }],
    ['no cover from a value other than 1', 'sample=match&cover=yes', {}]
  ])('reads %s', async (_, fragment, place) => {
    expect(await links.fromLink(fragment)).toEqual({ match: EXAMPLES.match, sample: 'match', ...place })
  })
})

describe('fragmentOf', () => {
  it('writes the ply and leaves out the side while the boards face White', () => {
    expect(links.fragmentOf({ sample: 'match' }, { ply: 12, side: 'white' })).toBe('sample=match&ply=12')
  })

  it.each([
    [
      'writes the cover after the side where the stored game is covered',
      true,
      'sample=match&ply=12&side=black&cover=1'
    ],
    ['leaves out the cover where the stored game is shown', false, 'sample=match&ply=12&side=black']
  ])('%s', (_, cover, fragment) => {
    expect(links.fragmentOf({ sample: 'match' }, { cover, ply: 12, side: 'black' })).toBe(fragment)
  })

  it('carries an encoded match in a field of its own, readable with no escaping', async () => {
    const encoded = await links.encodedOf(EXAMPLES.alone)
    expect(links.fragmentOf({ encoded }, { side: 'black' })).toBe(`match=${encoded}&side=black`)
    expect(encoded).toMatch(/^[\w-]+$/u)
  })
})

describe('readMatch', () => {
  it.each([
    ['{', 'game.json holds no JSON'],
    ['[]', 'game.json: The file holds a list rather than an object'],
    ['{"submitted": {}}', 'game.json: The file lacks `submitted.headers`']
  ])('names why %j holds no match', (text, problem) => {
    expect(links.readMatch(text, 'game.json')).toEqual({ problem })
  })

  it('reads a match file back into the match it holds', () => {
    expect(links.readMatch(JSON.stringify(EXAMPLES.match), 'match.json')).toEqual({ match: EXAMPLES.match })
  })
})
