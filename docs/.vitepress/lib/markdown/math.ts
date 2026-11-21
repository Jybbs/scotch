import type { MarkdownRenderer } from 'vitepress'

/**
 * Reads inline math written in GitHub's form, its TeX set between backticks
 * inside the dollar signs, as the TeX alone, so an expression a page writes in
 * that form to keep Markdown off a backslash renders on the site as it does on
 * GitHub rather than with a backtick at each end.
 *
 * Args:
 *   md: The renderer VitePress builds for the site.
 */
export function readGitHubMath(md: MarkdownRenderer): void {
  md.core.ruler.push('scotch-math', state => {
    for (const child of state.tokens.flatMap(token => token.children ?? [])) {
      if (child.type === 'math_inline') child.content = child.content.replace(/^`([^]*)`$/u, '$1')
    }
  })
}
