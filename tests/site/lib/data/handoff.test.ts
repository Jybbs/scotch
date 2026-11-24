import { describe, expect, it } from 'vitest'

import * as handoff from '../../../../docs/.vitepress/lib/data/handoff.ts'

describe('legs', () => {
  it('carries the demo stored game from the fetch to the report, one leg per command', () => {
    expect(handoff.legs.map(({ command }) => command)).toEqual([
      'scotch fetch games', 'scotch index games', 'scotch match game'
    ])
    expect(handoff.legs[0]!.handed).toBeUndefined()
    const stops = handoff.legs.flatMap(leg => leg.stops)
    expect(stops.map(({ name, verb }) => `${handoff.VERBS[verb]} ${name}`)).toEqual([
      'Writes downloads/', 'Writes index/games.parquet', 'Writes index/positions.bin', 'Prints The report'
    ])
  })

  it('lights as many position keys as the demo span shares', () => {
    const drawn = handoff.legs[1]!.stops[1]!.drawn as Extract<handoff.Drawn, { kind: 'prints' }>
    expect(drawn.kind).toBe('prints')
    expect(drawn.keys.length).toBeLessThan(drawn.count)
  })
})
