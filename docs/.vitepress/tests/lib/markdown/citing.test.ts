import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { CITED_AFTER, citeMark } from '../../../lib/markdown/citing.ts'

const md   = await createMarkdownRenderer('/tmp', { config: citeMark })
const PAGE = [
  "A claim.[^zobrist1970] Another.[^zobrist1970][^fide2023] An aside.^[A note of the page's own.]",
  '',
  '[^zobrist1970]: Zobrist.',
  '',
  '[^fide2023]: FIDE.',
  ''
].join('\n')
const html = md.render(PAGE, { relativePath: 'methods/keys.md' })

describe('citeMark', () => {
  it('numbers every reference to one source alike, with no count of its references beside the number', () => {
    expect(html.match(/<a href="#footnote-zobrist1970">\[1\]<\/a>/gu)).toHaveLength(2)
    expect(html).not.toContain('[1:1]')
  })

  it("names each source's note by its key, so a link to it survives a reordering", () => {
    expect(html).toContain('<li id="footnote-zobrist1970" class="footnote-item">')
    expect(html).toContain('<li id="footnote-fide2023" class="footnote-item">')
  })

  it('keeps an anchor of its own for each reference, which a back link returns to', () => {
    expect(html).toContain('id="footnote-ref-zobrist1970"')
    expect(html).toContain('id="footnote-ref-zobrist1970:1"')
  })

  it('keeps the number of a note written inline, which carries no key', () => {
    expect(html).toContain('<li id="footnote3" class="footnote-item">')
  })

  it('sets a gap only before a mark following another mark straight after it', () => {
    expect(html.match(new RegExp(CITED_AFTER, 'gu'))).toHaveLength(1)
    expect(html).toContain(`<sup class="footnote-ref ${CITED_AFTER}"><a href="#footnote-fide2023">`)
  })

  it("joins each later back link to the one before it, so a source's arrows wrap together", () => {
    expect(html).toContain(' <a href="#footnote-ref-zobrist1970:1" class="footnote-backref">')
    expect(html).toContain(' <a href="#footnote-ref-zobrist1970" class="footnote-backref">')
  })
})
