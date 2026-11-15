import type { MarkdownRenderer } from 'vitepress'

type Rule = NonNullable<MarkdownRenderer['renderer']['rules'][string]>

/**
 * The class each citation's link takes, the square a source's number stands on.
 */
export const CITE = 'sc-cite'
/**
 * The id of the heading the Sources block at the foot of a page opens on.
 */
export const SOURCES = 'sources'

/**
 * Names the shade of the square a source's number takes, the first source on a
 * light square and each after it on the other shade, as a rank alternates.
 */
function shadeOf(id: number): 'dark' | 'light' {
  return id % 2 ? 'dark' : 'light'
}

/**
 * Sets a page's citations as squares of the board and its footnotes as the
 * Sources block closing it, over the markup `@mdit/plugin-footnote`, the
 * footnote plugin VitePress renders through, writes.
 *
 * Each citation is its source's number on the light or dark square that number
 * takes, and a run of citations written one straight after another is one strip
 * of those squares, held on one line. Every reference to one source takes the
 * same number and an anchor of its own, which the way back from the source's
 * entry returns to. A source's entry carries the shade of its square, which the
 * stylesheet draws as that entry's stretch of the file beside the numerals, and
 * each way back is labeled by the citation it returns to, lettered where the
 * page cites the source more than once.
 *
 * Every anchor a footnote takes is named for its label rather than for its
 * number, with the label HTML-escaped for use inside an attribute, so a
 * citation's anchor reads `#footnote-zobrist1970`, whereas an inline note
 * (written `^[...]`) carries no label and keeps its number.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function citeMark(md: MarkdownRenderer): void {
  const { rules } = md.renderer
  const { footnote_anchor_name: numbered, footnote_open: opened } = rules
  const named: Rule = (tokens, index, ...rest) => {
    const { subId } = tokens[index]!.meta as { subId?: number }
    const name      = rules.footnote_anchor_name!(tokens, index, ...rest)
    return subId ? `${name}:${subId}` : name
  }

  rules.footnote_anchor_name = (tokens, index, ...rest): string => {
    const label: unknown = tokens[index]!.meta.label
    return typeof label === 'string' ? `-${md.utils.escapeHtml(label)}` : numbered!(tokens, index, ...rest)
  }

  rules.footnote_caption = (tokens, index): string => String(Number(tokens[index]!.meta.id) + 1)

  rules.footnote_ref = (tokens, index, options, env, self): string => {
    const { id } = tokens[index]!.meta as { id: number }
    const number = rules.footnote_caption!(tokens, index, options, env, self)
    const href   = `#footnote${rules.footnote_anchor_name!(tokens, index, options, env, self)}`
    const anchor = `footnote-ref${named(tokens, index, options, env, self)}`
    const mark   = `<a class="${CITE}" data-shade="${shadeOf(id)}" href="${href}" id="${anchor}" aria-label="Source ${number}">`
    const opens  = tokens[index - 1]?.type !== 'footnote_ref'
    const closes = tokens[index + 1]?.type !== 'footnote_ref'
    return `${opens ? '<sup class="footnote-ref">' : ''}${mark}${number}</a>${closes ? '</sup>' : ''}`
  }

  rules.footnote_block_open = (): string =>
    `<section class="footnotes" aria-labelledby="${SOURCES}">\n<h2 id="${SOURCES}">Sources</h2>\n<ol class="footnotes-list">\n`

  rules.footnote_open = (tokens, index, ...rest): string => opened!(tokens, index, ...rest)
    .replace('>', ` data-shade="${shadeOf(Number(tokens[index]!.meta.id))}" tabindex="-1">`)

  rules.footnote_anchor = (tokens, index, options, env: { footnotes: { list: { count?: number }[] } }, self): string => {
    const { id, subId } = tokens[index]!.meta as { id: number, subId: number }
    const number        = rules.footnote_caption!(tokens, index, options, env, self)
    const several       = (env.footnotes.list[id]!.count ?? 0) > 1
    const href          = `#footnote-ref${named(tokens, index, options, env, self)}`
    const label         = several ? `Back to citation ${subId + 1} of source ${number}` : `Back to the text citing source ${number}`
    const letter        = several ? `<sup>${String.fromCodePoint(97 + subId)}</sup>` : ''
    return `${subId ? '\u00A0' : ' '}<a href="${href}" class="footnote-backref" aria-label="${label}">\u21A9\uFE0E${letter}</a>`
  }
}
