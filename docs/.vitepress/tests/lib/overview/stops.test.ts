import { describe, expect, it } from 'vitest'

import overview                             from '../../../../pages/methods/index.md?raw'
import { placeOf, questionsOf, routeOf }    from '../../../lib/overview/stops.ts'
import keys                                 from '../../../lib/rendered/keys.json' with { type: 'json' }
import { EXAMPLES }                         from '../../../lib/viewer/examples.ts'

const route = routeOf(EXAMPLES.match, keys.viewer, { games: '1,000', positions: '9,000' })

describe('questionsOf', () => {
  it('reads each page the overview lists in its order, with its title and question', () => {
    const questions = questionsOf(overview)
    expect([...questions.keys()]).toEqual(['reading', 'indexing', 'keys', 'runs', 'limits'])
    expect(questions.get('runs')).toEqual({
      question : 'How does the search find the stored game sharing the longest run?',
      title    : 'The Longest Run'
    })
  })

  it('reads nothing from a page with no such table', () => {
    expect(questionsOf('# Methods\n\nNo table.').size).toBe(0)
  })
})

describe('routeOf', () => {
  it('sets a stop on each page the overview lists, in its order', () => {
    expect(route.stops.map(stop => stop.page)).toEqual(['reading', 'indexing', 'keys', 'runs', 'limits'])
  })

  it('names the stored game by its players, its event, and its year', () => {
    expect(route.players).toBe('Kasparov – Sosonko, Tilburg 1981')
  })

  it('refuses a match whose run is offset', () => {
    const offset = { ...EXAMPLES.match, span: { ...EXAMPLES.match.span!, offset: 2 } }
    expect(() => routeOf(offset, keys.viewer, { games: '1', positions: '9' }))
      .toThrow("the demo match's run is offset by 2 plies")
  })

  it('leaves a player the stored game does not tag unnamed', () => {
    const { White: _, ...headers } = EXAMPLES.match.stored!.headers
    const untagged                 = { ...EXAMPLES.match, stored: { ...EXAMPLES.match.stored!, headers } }
    expect(routeOf(untagged, keys.viewer, { games: '1', positions: '9' }).names.stored).toBe(' – Sosonko')
  })

  it('draws the track a few plies past the parting, the start and the run shared', () => {
    expect(route.pair).toMatchObject({
      plies : [49, 49],
      runs  : [{ length: 1, offset: 0, start: 0 }, { length: 36, offset: 0, start: 7 }]
    })
  })

  it('writes the key of the position where the two games meet in groups of four', () => {
    expect(route.stops[2]!.says).toMatch(/the key is [0-9A-F]{4} [0-9A-F]{4} [0-9A-F]{4} [0-9A-F]{4}, /u)
  })

  it('carries the counts of the index it is given', () => {
    expect(route.stops[1]!.says).toContain('an index of 1,000 games and the 9,000 positions they reach')
  })

  it('stands the last stop on the stored game at the move where the two part', () => {
    expect(route.stops[4]!.board).toEqual({ game: 'stored', ply: 43 })
    expect(route.stops[4]!.says).toMatch(/^They part at ply 43, where the stored game plays /u)
  })

  it.each([0, 1, 2, 3, 4])('says stop %i as prose', index => {
    expect(route.stops[index]!.says).toReadAsProse()
  })

  it('follows the pieces of both games through every ply', () => {
    expect(route.pieces.submitted).toHaveLength(EXAMPLES.match.submitted.placements.length)
    expect(route.pieces.stored).toHaveLength(EXAMPLES.match.stored!.placements.length)
  })
})

describe('placeOf', () => {
  it('sets each station along the track in order, none two on one point', () => {
    const places = route.stops.map((_, index) => placeOf(route, index))
    expect(places).toEqual(places.toSorted((a, b) => a - b))
    expect(new Set(places).size).toBe(5)
    expect(Math.min(...places)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...places)).toBeLessThanOrEqual(1)
  })
})
