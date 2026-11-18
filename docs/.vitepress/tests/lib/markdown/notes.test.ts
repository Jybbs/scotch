// @vitest-environment happy-dom
import { createMarkdownRenderer }               from 'vitepress'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { citeMark }                                            from '../../../lib/markdown/citing.ts'
import { CITED, PICKED, anchored, citationOf, clauseOf, pick } from '../../../lib/markdown/notes.ts'

const md   = await createMarkdownRenderer('/tmp', { config: citeMark, highlight: () => '' })
const PAGE = [
  'Keys hash a board.[^zobrist1970] Two games share a run, and the rule reads it.[^gusfield1997][^fide2023]',
  '',
  '[^zobrist1970]: Zobrist.',
  '',
  '[^gusfield1997]: Gusfield.',
  '',
  '[^fide2023]: FIDE.',
  ''
].join('\n')

function page(): Document {
  document.body.innerHTML = md.render(PAGE, { relativePath: 'methods/runs.md' })
  return document
}

function mark(id: string): HTMLAnchorElement {
  return anchored(id, document) as HTMLAnchorElement
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('citationOf', () => {
  it('reads a citation as itself', () => {
    const doc = page()
    expect(citationOf(mark('footnote-ref-fide2023'), doc)).toBe(mark('footnote-ref-fide2023'))
  })

  it('reads a way back as the citation it returns to', () => {
    const doc  = page()
    const back = doc.querySelector('a.footnote-backref[href="#footnote-ref-gusfield1997"]')!
    expect(citationOf(back, doc)).toBe(mark('footnote-ref-gusfield1997'))
  })

  it('reads a way back whose citation the page no longer holds as no citation', () => {
    const doc  = page()
    const back = doc.querySelector('a.footnote-backref[href="#footnote-ref-gusfield1997"]')!
    mark('footnote-ref-gusfield1997').remove()
    expect(citationOf(back, doc)).toBeNull()
  })

  it('reads any other link as no citation', () => {
    const doc = page()
    doc.body.insertAdjacentHTML('beforeend', '<a id="other" href="#sources">Sources</a>')
    expect(citationOf(anchored('other', doc)!, doc)).toBeNull()
  })
})

describe('anchored', () => {
  it('finds an id holding a colon, which a selector would read as a pseudo-class', () => {
    page()
    document.body.insertAdjacentHTML('beforeend', '<i id="a:1"></i>')
    expect(anchored('a:1', document)!.tagName).toBe('I')
  })

  it('finds nothing for an empty id', () => {
    expect(anchored('', page())).toBeNull()
  })
})

describe('clauseOf', () => {
  it.each([
    ['footnote-ref-zobrist1970', 'Keys hash a board.'],
    ['footnote-ref-gusfield1997', 'Two games share a run, and the rule reads it.'],
    ['footnote-ref-fide2023', 'Two games share a run, and the rule reads it.']
  ])('spans the sentence %s follows, leaving out every mark before it', (id, clause) => {
    page()
    expect(clauseOf(mark(id))!.toString()).toBe(clause)
  })

  it('spans nothing where a run opens its block', () => {
    document.body.innerHTML = md.render('[^fide2023] opens the line.\n\n[^fide2023]: FIDE.\n', { relativePath: 'a.md' })
    expect(clauseOf(mark('footnote-ref-fide2023'))).toBeNull()
  })
})

describe('pick', () => {
  it("picks out the citation, its source's entry, and the way back to that citation", () => {
    const doc = page()
    pick(mark('footnote-ref-gusfield1997'), doc)
    expect([...doc.querySelectorAll(`[${PICKED}]`)].map(node => node.id))
      .toEqual(['footnote-ref-gusfield1997', 'footnote-gusfield1997'])
    expect(doc.querySelector('[aria-current]')!.getAttribute('href')).toBe('#footnote-ref-gusfield1997')
  })

  it('releases what the last pick picked out', () => {
    const doc = page()
    pick(mark('footnote-ref-gusfield1997'), doc)
    pick(mark('footnote-ref-zobrist1970'), doc)
    expect([...doc.querySelectorAll(`[${PICKED}], [aria-current]`)].map(node => node.id))
      .toEqual(['footnote-ref-zobrist1970', 'footnote-zobrist1970', ''])
  })

  it('registers the clause as the highlight the stylesheet draws, and removes it where no clause is spanned', () => {
    const highlights = new Map<string, unknown>()
    const { escape } = CSS
    vi.stubGlobal('Highlight', class { range: Range; constructor(range: Range) { this.range = range } })
    vi.stubGlobal('CSS', { escape, highlights })
    const doc = page()
    pick(mark('footnote-ref-zobrist1970'), doc)
    expect((highlights.get(CITED) as { range: Range }).range.toString()).toBe('Keys hash a board.')
    doc.body.innerHTML = md.render('[^fide2023] opens.\n\n[^fide2023]: FIDE.\n', { relativePath: 'a.md' })
    pick(mark('footnote-ref-fide2023'), doc)
    expect(highlights.has(CITED)).toBe(false)
  })
})
