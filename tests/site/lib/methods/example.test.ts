import { describe, expect, it } from 'vitest'

import examples     from '../../../../docs/.vitepress/lib/rendered/examples.json' with { type: 'json' }
import * as example from '../../../../docs/.vitepress/lib/methods/example.ts'

const methods = example.exampleOf()

describe('exampleOf', () => {
  it('reads the run the index matched as the Methods pages quote it, plies 7 to 17', () => {
    expect(methods.run).toEqual({ length: 11, start: 7 })
    expect(examples.methods.parting).toBe('9...Nc7')
  })

  it('reads every run the two games share, the starting position one of them', () => {
    expect(methods.runs).toEqual([{ length: 11, offset: 0, start: 7 }, { length: 1, offset: 0, start: 0 }])
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
