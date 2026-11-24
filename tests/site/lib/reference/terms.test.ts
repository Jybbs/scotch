import { describe, expect, it } from 'vitest'

import { PAGE, TERMS, addressOf, termOf } from '../../../../docs/.vitepress/lib/reference/terms.ts'
import { builtPages, pageText }           from '../../common/pages.ts'

describe('TERMS', () => {
  it('declares the terms the pages define, the terms page among the built pages', () => {
    expect(TERMS.map(term => term.anchor))
      .toEqual([
        'fen', 'floor', 'index', 'key', 'mainline', 'pgn', 'ply', 'run', 'store', 'stored-game',
        'the-parting-move', 'tie', 'transposition'
      ])
    expect(builtPages()).toContain(PAGE)
  })

  it.each(TERMS.filter(term => term.address.startsWith('.')).map(term => [term.name, term.address] as const))(
    'links %s to a page the site builds',
    (_, address) => {
      expect(builtPages()).toContain(address.replace('../', '').split('#')[0])
    }
  )
})

describe('addressOf', () => {
  it("writes the address of a term's heading", () => {
    expect(addressOf(TERMS[0]!)).toBe('/reference/terms#fen')
  })
})

describe('termOf', () => {
  it('finds a term by the fragment its heading takes', () => {
    expect(termOf('ply')?.name).toBe('Ply')
    expect(termOf('absent')).toBeUndefined()
    expect(termOf()).toBeUndefined()
  })
})

describe('the terms page', () => {
  it('holds the sentence of each term', () => {
    const page = pageText('reference/terms.md')
    expect(TERMS.every(term => page.includes(term.sentence))).toBe(true)
  })
})
