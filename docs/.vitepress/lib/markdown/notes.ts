import { CITE } from './citing.ts'

/**
 * The name the clause a picked citation follows is registered under in the
 * document's highlights, which the stylesheet draws through `::highlight()`.
 */
export const CITED = 'sc-cited'
/**
 * The attribute set on the citation and the source's entry a jump picks out.
 */
export const PICKED = 'data-picked'

const BACK = 'a.footnote-backref'
const MARK = `a.${CITE}`

/**
 * Finds the element holding the id `id`, read whole rather than as a selector,
 * since a footnote's id may carry a colon or a quote, and nothing where `id` is
 * empty.
 */
export function anchored(id: string, page: Document): HTMLElement | null {
  return id ? page.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null
}

/**
 * Finds the element a link on the page leads to.
 */
export function targetOf(link: Element, page: Document): HTMLElement | null {
  return anchored(link.getAttribute('href')!.slice(1), page)
}

/**
 * Finds the citation a press on `link` reaches, the citation itself where the
 * link is one, or the one a way back from a source's entry returns to.
 */
export function citationOf(link: Element, page: Document): HTMLAnchorElement | null {
  if (link.matches(MARK)) return link as HTMLAnchorElement
  const cited = link.matches(BACK) ? targetOf(link, page) : null
  return cited?.matches(MARK) ? cited as HTMLAnchorElement : null
}

/**
 * Spans the clause a citation follows, from the start of the sentence its run
 * of marks closes to the run itself, reading the block's text without the marks
 * in it, so a number never joins the sentence before it. A run opening its
 * block spans nothing.
 */
export function clauseOf(mark: Element): Range | null {
  const run   = mark.closest('sup') ?? mark
  const block = run.parentElement!.closest('p, li, td, dd, blockquote') ?? run.parentElement!
  const page  = block.ownerDocument
  const walk  = page.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  const nodes: { node: Text, start: number }[] = []
  let text = ''
  for (let node = walk.nextNode() as Text | null; node; node = walk.nextNode() as Text | null) {
    if (run.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) break
    if (node.parentElement?.closest('sup.footnote-ref')) continue
    nodes.push({ node, start: text.length })
    text += node.data
  }
  const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text)]
  const last      = sentences.at(-1)
  if (!last?.segment.trim()) return null
  const from  = last.index + last.segment.length - last.segment.trimStart().length
  const first = nodes.findLast(({ start }) => start <= from)!
  const range = page.createRange()
  range.setStart(first.node, from - first.start)
  range.setEndBefore(run)
  return range
}

/**
 * Picks out a citation, the entry of the source it cites, and the clause it
 * follows, marking the entry's way back to that citation as the current one and
 * releasing whatever the last pick picked out.
 *
 * Args:
 *   mark : The citation to pick out.
 *   page : The document holding the citation and the page's Sources block.
 */
export function pick(mark: HTMLAnchorElement, page: Document): void {
  for (const node of page.querySelectorAll(`[${PICKED}]`)) node.removeAttribute(PICKED)
  for (const node of page.querySelectorAll(`${BACK}[aria-current]`)) node.removeAttribute('aria-current')
  const back   = page.querySelector(`${BACK}[href="#${CSS.escape(mark.id)}"]`)
  const clause = clauseOf(mark)
  mark.setAttribute(PICKED, '')
  targetOf(mark, page)?.setAttribute(PICKED, '')
  back?.setAttribute('aria-current', 'location')
  if (typeof Highlight === 'function') {
    if (clause) CSS.highlights.set(CITED, new Highlight(clause))
    else CSS.highlights.delete(CITED)
  }
}
