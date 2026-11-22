import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { CITE, SOURCES, citeMark } from '../../../../docs/.vitepress/lib/markdown/citing.ts'

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

describe('citeMark in the text', () => {
  it('numbers every reference to one source alike, with no count of its references beside the number', () => {
    expect(html.match(/href="#footnote-zobrist1970" id="[^"]+" aria-label="Source 1">1<\/a>/gu)).toHaveLength(2)
    expect(html).not.toContain('[1')
  })

  it("names each source's note by its key, so a link to it survives a reordering", () => {
    expect(html).toContain('<li id="footnote-zobrist1970" class="footnote-item" data-shade="light" tabindex="-1">')
    expect(html).toContain('<li id="footnote-fide2023" class="footnote-item" data-shade="dark" tabindex="-1">')
  })

  it('keeps an anchor of its own on each reference, which a way back returns to', () => {
    expect(html).toContain('id="footnote-ref-zobrist1970"')
    expect(html).toContain('id="footnote-ref-zobrist1970:1"')
  })

  it('keeps the number of a note written inline, which carries no key', () => {
    expect(html).toContain('<li id="footnote3" class="footnote-item" data-shade="light" tabindex="-1">')
  })

  it.each([
    ['zobrist1970', 'light'],
    ['fide2023', 'dark']
  ])('sets the citation of %s on the %s square its number takes', (key, shade) => {
    expect(html).toContain(`<a class="${CITE}" data-shade="${shade}" href="#footnote-${key}"`)
  })

  it('holds a run of citations in one strip and a citation standing alone in its own', () => {
    const strips = html.match(/<sup class="footnote-ref">.*?<\/sup>/gu)!
    expect(strips.map(strip => strip.match(new RegExp(CITE, 'gu'))!.length)).toEqual([1, 2, 1])
  })
})

describe('citeMark in the Sources block', () => {
  it('opens the block on a Sources heading the section is labeled by, with no rule above it', () => {
    expect(html).toContain(`<section class="footnotes" aria-labelledby="${SOURCES}">\n<h2 id="${SOURCES}">Sources</h2>`)
    expect(html).not.toContain('footnotes-sep')
  })

  it.each([
    ['#footnote-ref-zobrist1970', 'Back to citation 1 of source 1', '<sup>a</sup>'],
    ['#footnote-ref-zobrist1970:1', 'Back to citation 2 of source 1', '<sup>b</sup>'],
    ['#footnote-ref-fide2023', 'Back to the text citing source 2', '']
  ])('labels the way back to %s for a screen reader', (href, label, letter) => {
    expect(html).toContain(`<a href="${href}" class="footnote-backref" aria-label="${label}">↩︎${letter}</a>`)
  })

  it("joins each later way back to the one before it, so a source's arrows wrap together", () => {
    expect(html).toContain(' <a href="#footnote-ref-zobrist1970:1"')
    expect(html).toContain(' <a href="#footnote-ref-zobrist1970"')
  })

  it('escapes a label for use inside an attribute, as a label may hold a quote', () => {
    expect(md.render('A claim.[^a"b]\n\n[^a"b]: A source.\n', { relativePath: 'methods/keys.md' }))
      .toContain('<li id="footnote-a&quot;b" class="footnote-item"')
  })
})
