import { describe, expect, it } from 'vitest'

import { exampleOf }    from '../../../../docs/.vitepress/lib/methods/example.ts'
import * as runs        from '../../../../docs/.vitepress/lib/methods/runs.ts'
import { marksAt }      from '../../../../docs/.vitepress/lib/methods/squares.ts'

const methods = exampleOf()
const pair    = new runs.Pair([18, 18], methods.runs)
const plies   = [...methods.submitted.keys()]

describe('runAt', () => {
  it('falls in a run exactly where no square of the two positions differs', () => {
    const alike = plies.filter(ply => marksAt(methods, ply).every(mark => mark === undefined))
    expect(plies.filter(ply => pair.runAt(ply))).toEqual(alike)
  })

  it('reads the longest run where two hold a ply', () => {
    const nested = new runs.Pair([9, 9], [
      { length: 2, offset: 0, start: 3 },
      { length: 5, offset: 0, start: 2 }
    ])
    expect(nested.runAt(3)).toEqual({ length: 5, offset: 0, start: 2 })
  })
})

describe('longestOf', () => {
  it('reads the run the match counts', () => {
    expect(pair.longest).toEqual({ length: 11, offset: 0, start: 7 })
  })
})

describe('inRow', () => {
  it.each([[0, 1], [6, 0], [7, 1], [12, 6], [17, 11], [18, 0]])(
    'counts ply %i as %i in a row',
    (ply, row) => {
      expect(pair.inRow(ply)).toBe(row)
    }
  )
})

describe('columnsOf', () => {
  it('draws a station for each ply of the longer game', () => {
    expect(new runs.Pair([4, 9], [{ length: 1, offset: 0, start: 0 }]).columns).toBe(10)
  })
})

describe('heightAt', () => {
  it.each([[0, 6, 0], [1, 6, runs.TRACK.apart], [0, 7, runs.TRACK.apart / 2], [1, 7, runs.TRACK.apart / 2]])(
    'stands lane %i at ply %i at %d',
    (lane, ply, height) => {
      expect(pair.heightAt(lane, ply)).toBe(height)
    }
  )
})

describe('lineOf', () => {
  it('opens at the shared start and eases each ply into the next', () => {
    const line = new runs.Pair([2, 2], [{ length: 1, offset: 0, start: 0 }]).lineOf(1)
    expect(line).toBe('M 0 11 C 8 11 8 22 16 22 C 24 22 24 22 32 22')
  })

  it('draws a station for every ply the game plays', () => {
    expect(pair.lineOf(0).match(/C /gu)).toHaveLength(18)
  })
})

describe('statusAt', () => {
  it.each([
    [0, 'Ply 0 · one position, 1 in a row'],
    [6, 'Ply 6 · two positions'],
    [12, 'Ply 12 · one position, 6 in a row'],
    [18, 'Ply 18 · they part']
  ])('names ply %i as %j', (ply, status) => {
    expect(pair.statusAt(ply)).toBe(status)
  })

  it.each(plies)('writes the status of ply %i as prose', ply => {
    expect(pair.statusAt(ply)).toReadAsProse()
  })
})
