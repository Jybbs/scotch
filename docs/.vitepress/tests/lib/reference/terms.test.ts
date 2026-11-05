import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import { PAGE, TERMS, addressOf, termOf } from '../../../lib/reference/terms.ts'
import { builtPages }                     from '../../common/pages.ts'

describe('TERMS', () => {
  it('declares the terms the pages define, the terms page among the built pages', () => {
    expect(TERMS.map(term => term.anchor))
      .toEqual(['key', 'mainline', 'ply', 'run', 'the-parting-move', 'transposition'])
    expect(builtPages()).toContain(PAGE)
  })

  it.each(TERMS.filter(term => term.address.startsWith('.')).map(term => [term.name, term.address] as const))(
    'links %s to a page the site builds',
    (_, address) => {
      expect(builtPages()).toContain(address.replace('../', ''))
    }
  )

  it('compiles each pattern in the dialect the renderer reads', () => {
    expect(() => TERMS.map(term => new RegExp(term.pattern, 'iu'))).not.toThrow()
  })
})

describe('addressOf', () => {
  it("writes the address of a term's heading", () => {
    expect(addressOf(TERMS[0]!)).toBe('/reference/terms#key')
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
    const page = fs.readFileSync(new URL('../../../../pages/reference/terms.md', import.meta.url), 'utf8')
    expect(TERMS.every(term => page.includes(term.sentence))).toBe(true)
  })
})
