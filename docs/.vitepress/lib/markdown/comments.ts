import type { MarkdownRenderer } from 'vitepress'

/**
 * Drops each HTML comment inside a line of prose, such as a figure's markers,
 * because Vue keeps comments in every build but a production one and its
 * whitespace condensing removes a space between a comment and a comment or an
 * element. A comment on a line of its own, such as a region's marker, stays for
 * the rules that read it.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function dropComments(md: MarkdownRenderer): void {
  md.core.ruler.push('scotch-comments', state => {
    for (const token of state.tokens) {
      token.children &&= token.children.filter(child =>
        child.type !== 'html_inline' || !child.content.startsWith('<!--'))
    }
  })
}
