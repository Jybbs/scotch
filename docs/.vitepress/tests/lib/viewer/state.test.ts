import { describe, expect, it } from 'vitest'

import { EXAMPLES, SAMPLES } from '../../../lib/viewer/examples.ts'
import { useViewer }         from '../../../lib/viewer/state.ts'
import { meet }              from '../../common/matches.ts'

describe('useViewer', () => {
  it('opens on the example match at the first position the two share, from White’s side', () => {
    const viewer = useViewer()
    expect([viewer.loaded.value.match, viewer.cursor.value, viewer.facing.value])
      .toEqual([EXAMPLES.match, meet, 'white'])
    expect([viewer.sample.value, viewer.source.value]).toEqual([SAMPLES[0].name, SAMPLES[0].source])
    expect(viewer.status.value).toEqual(viewer.loaded.value.status(meet))
  })

  it.each([
    [undefined, meet],
    [12.4, 12],
    [-40, 0],
    [9999, EXAMPLES.match.submitted.moves.length]
  ])('moves the cursor to %s held to the match’s plies', (to, cursor) => {
    const viewer = useViewer()
    viewer.go(to)
    expect(viewer.cursor.value).toBe(cursor)
  })

  it.each([
    ['at the first position the two share', EXAMPLES.match, undefined, meet],
    ['at the start where it shares none', EXAMPLES.alone, undefined, 0],
    ['at the ply a link names', EXAMPLES.match, 30, 30]
  ])('loads a match %s', (_, match, ply, cursor) => {
    const viewer = useViewer()
    viewer.go(20)
    viewer.load(match, 'game.json', undefined, ply)
    expect([viewer.loaded.value.match, viewer.cursor.value, viewer.sample.value, viewer.source.value])
      .toEqual([match, cursor, undefined, 'game.json'])
  })

  it('turns both boards to a side', () => {
    const viewer = useViewer()
    viewer.turn('black')
    expect(viewer.facing.value).toBe('black')
  })
})
