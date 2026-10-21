import type { MarkdownRenderer } from 'vitepress'

/**
 * The class a citation takes when it follows another directly, which is the one
 * place two marks sit side by side and need a gap between them.
 */
export const CITED_AFTER = 'sc-cite-after'

/**
 * Numbers every reference to one source the same. `@mdit/plugin-footnote`, the
 * footnote plugin VitePress renders through, writes a second reference to a
 * source it has already numbered as `[1:1]` and a third as `[1:2]`. The caption
 * keeps the part that names the source and drops the part that counts the
 * references, and each reference keeps the anchor of its own that the back
 * link at the foot of the page returns to.
 *
 * Every anchor a footnote takes is named for its label rather than for its
 * number, with the label HTML-escaped for use inside an attribute, so a
 * citation's anchor reads `#footnote-zobrist1970`, whereas an inline note
 * (written `^[...]`) carries no label and keeps its number.
 *
 * Two sources cited together take a gap between their marks only where the page
 * writes one straight after the other, and every back link after a source's
 * first is joined to the one before it, so the arrows wrap together.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function citeMark(md: MarkdownRenderer): void {
  const { footnote_anchor: returned, footnote_anchor_name: numbered, footnote_ref: cited } = md.renderer.rules

  md.renderer.rules.footnote_anchor_name = (tokens, index, ...rest): string => {
    const label: unknown = tokens[index]!.meta.label
    return typeof label === 'string' ? `-${md.utils.escapeHtml(label)}` : numbered!(tokens, index, ...rest)
  }

  md.renderer.rules.footnote_caption = (tokens, index): string => `[${Number(tokens[index]!.meta.id) + 1}]`

  md.renderer.rules.footnote_ref = (tokens, index, ...rest): string => {
    const html  = cited!(tokens, index, ...rest)
    const after = tokens[index - 1]?.type === 'footnote_ref'
    return after ? html.replace('footnote-ref', `footnote-ref ${CITED_AFTER}`) : html
  }

  md.renderer.rules.footnote_anchor = (tokens, index, ...rest): string => {
    const html = returned!(tokens, index, ...rest)
    return Number(tokens[index]!.meta.subId) > 0 ? `\u00A0${html.trimStart()}` : html
  }
}
