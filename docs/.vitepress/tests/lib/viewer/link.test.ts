import { assert, asyncProperty, constantFrom, integer } from 'fast-check'
import { describe, expect, it }                         from 'vitest'

import { EXAMPLES, type Match, SAMPLES, type Sample } from '../../../lib/viewer/examples.ts'
import * as links                                     from '../../../lib/viewer/link.ts'
import { Loaded }                                     from '../../../lib/viewer/loaded.ts'
import { useViewer }                                  from '../../../lib/viewer/state.ts'
import type { Facing }                                from '../../../lib/viewer/trail.ts'

/**
 * Flips one character of a link's carried text, as a link altered in transit
 * would.
 */
function altered(text: string): string {
  const at = Math.floor(text.length / 2)
  return text.slice(0, at) + (text[at] === 'A' ? 'B' : 'A') + text.slice(at + 1)
}

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
  it('reads any example back with its ply and side, the ply held to the range once loaded', async () => {
    const encoded = { alone: links.encodedOf(EXAMPLES.alone), match: links.encodedOf(EXAMPLES.match) }
    await assert(asyncProperty(
      constantFrom<Sample>('alone', 'match'),
      integer({ max: 1000, min: -1000 }),
      constantFrom<Facing>('black', 'white'),
      async (name, ply, side) => {
        const fragment = links.fragmentOf({ encoded: await encoded[name] }, { ply, side })
        const reading  = await links.fromLink(fragment) as links.Place & links.Reading
        const loaded   = new Loaded(EXAMPLES[name])
        const viewer   = useViewer()
        expect(reading).toEqual({ match: EXAMPLES[name], ply, ...carried(side) })
        viewer.load(EXAMPLES[name], 'A link', undefined, reading.ply)
        viewer.turn(facingOf(reading))
        expect(viewer.cursor.value).toBe(Math.min(Math.max(ply, loaded.first), loaded.last))
        expect(viewer.facing.value).toBe(side)
      }
    ), { numRuns: 200 })
  })

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

describe('fragmentOf', () => {
  it('writes the ply and leaves out the side while the boards face White', () => {
    expect(links.fragmentOf({ sample: 'match' }, { ply: 12, side: 'white' })).toBe('sample=match&ply=12')
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
