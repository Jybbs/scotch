import { describe, expect, it } from 'vitest'

import examples     from '../../../lib/rendered/examples.json' with { type: 'json' }
import * as example from '../../../lib/methods/example.ts'
import { marksAt }  from '../../../lib/methods/squares.ts'

const methods = example.exampleOf()
const plies   = [...methods.submitted.keys()]
/**
 * The plies past the starting position where no square of the two games'
 * positions differs, read from the pieces rather than from the run.
 */
const alike = plies.slice(1).filter(ply => marksAt(methods, ply).every(mark => mark === undefined))

describe('exampleOf', () => {
  it('reads the run the index matched as the Methods pages quote it, plies 7 to 17', () => {
    expect(methods.run).toEqual({ length: 11, start: 7 })
    expect(examples.methods.parting).toBe('9...Nc7')
  })

  it('reads both games over the 18 plies the pages show, from the starting position', () => {
    expect([methods.submitted.length, methods.stored.length]).toEqual([19, 19])
    expect(methods.submitted[0]).toMatchObject({ san: null, to: null })
    expect(methods.submitted[7]).toMatchObject({ san: 'e4', to: 28 })
    expect(methods.stored[7]).toMatchObject({ san: 'd4', to: 27 })
  })

  it('keeps each piece under the number it stands under at the first position', () => {
    expect(methods.submitted[1]!.standing.find(({ id }) => id === 11))
      .toEqual({ id: 11, piece: 'P', square: 27 })
  })

  it('refuses a span pairing ply n of one game with another ply of the other', () => {
    const offset = { ...examples.methods, span: { ...examples.methods.span, offset: 2 } }
    expect(() => example.exampleOf(offset)).toThrow("the example's run is offset by 2 plies")
  })
})

describe('agrees', () => {
  it('holds exactly at the plies past the starting position where no square differs', () => {
    expect(plies.filter(ply => example.agrees(methods, ply))).toEqual(alike)
  })

  it.each([[6, false], [7, true], [17, true], [18, false]])(
    'reads ply %i, at an edge of the run, as %s',
    (ply, agreed) => {
      expect(example.agrees(methods, ply)).toBe(agreed)
    }
  )
})

describe('cellOf', () => {
  it.each([[0, 'start'], [1, 'apart'], [6, 'apart'], [7, 'run'], [17, 'run'], [18, 'apart']])(
    'draws ply %i as a %s cell',
    (ply, cell) => {
      expect(example.cellOf(methods, ply)).toBe(cell)
    }
  )
})

describe('openingOf', () => {
  it('opens on the ply before the two games meet', () => {
    expect(example.openingOf(methods)).toBe(6)
  })

  it('opens on the starting position where the two games meet there', () => {
    expect(example.openingOf({ ...methods, run: { length: 3, start: 0 } })).toBe(0)
  })
})

describe('partOf', () => {
  it('parts on the first ply past the run', () => {
    expect(example.partOf(methods)).toBe(18)
  })
})

describe('statusAt', () => {
  it.each([
    [0, 'Both open on the starting position'],
    [6, 'Ply 6 · the positions differ'],
    [7, 'Ply 7 · one position'],
    [17, 'Ply 17 · one position'],
    [18, 'Ply 18 · parted']
  ])('names ply %i as %j', (ply, status) => {
    expect(example.statusAt(methods, ply)).toBe(status)
  })

  it.each(plies)('writes the status of ply %i as prose', ply => {
    expect(example.statusAt(methods, ply)).toReadAsProse()
  })
})

describe('timelineAt', () => {
  it.each([[0, 'translate(calc(0% + 0px), 0)'], [7, 'translate(calc(700% + 21px), 0)']])(
    'moves the marker to ply %i past one marker and one gap per ply',
    (ply, transform) => {
      expect(example.timelineAt(example.RUN_TUNING.gap, ply)).toBe(transform)
    }
  )
})
