import { describe, expect, it } from 'vitest'

import { EXAMPLES }      from '../../../lib/viewer/examples.ts'
import { Loaded }        from '../../../lib/viewer/loaded.ts'
import { pgnOf }         from '../../../lib/viewer/pgn.ts'
import { endedAt, last } from '../../common/matches.ts'

describe('pgnOf', () => {
  const matched = pgnOf(new Loaded(EXAMPLES.match))

  it('sets the stored game’s moves as a variation on the parting move, named in a comment', () => {
    const text = matched.replaceAll('\n', ' ')
    expect(text).toContain('22. c6 ( {Kasparov vs. Sosonko, Tilburg 1981} 22. Bc2 Ba6+ 23. Ke1')
    expect(text).toContain('29. fxg3 ) 22... Ba6 23. Bxa6')
  })

  it('opens on the submitted game’s tags and closes on its result', () => {
    expect(matched).toMatch(/^\[Event "The Viewer's example"\]\n\[Site "\?"\]/u)
    expect(matched.trimEnd()).toMatch(/ 1-0$/u)
  })

  it('wraps every line of move text within 79 columns', () => {
    const moves = matched.split('\n\n')[1]!.trimEnd().split('\n')
    expect(Math.max(...moves.map(line => line.length))).toBeLessThanOrEqual(79)
    expect(moves.length).toBeGreaterThan(5)
  })

  it('writes the game alone with no variation where nothing matched', () => {
    expect(pgnOf(new Loaded(EXAMPLES.alone))).not.toMatch(/[({]/u)
  })

  it('closes on the stored game’s moves as a comment where the submitted game ends with the run', () => {
    expect(pgnOf(new Loaded(endedAt(last))).replaceAll('\n', ' '))
      .toContain('21. Rd1 b6 {Kasparov vs. Sosonko, Tilburg 1981, continued 22. Bc2 Ba6+')
  })

  it('escapes a quote and a backslash inside a tag', () => {
    const headers = { Event: 'The "Open" \\ 1' }
    const quoted  = { ...EXAMPLES.alone, submitted: { ...EXAMPLES.alone.submitted, headers } }
    expect(pgnOf(new Loaded(quoted))).toMatch(/^\[Event "The \\"Open\\" \\\\ 1"\]/u)
  })
})
