import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it }   from 'vitest'

import { markdownRules } from '../../../../docs/.vitepress/lib/markdown/rules.ts'

const md = await createMarkdownRenderer('/tmp', { config: markdownRules, math: true })

/**
 * Renders `source` and returns the TeX MathJax read from each formula, kept in
 * the MathML it writes beside the drawing for a screen reader.
 */
function read(source: string): string[] {
  return [...md.render(source).matchAll(/<mjx-assistive-mml[^>]*>([^]*?)<\/mjx-assistive-mml>/gu)]
    .map(([, mathml]) => mathml!.replaceAll(/<[^>]+>/gu, ''))
}

describe('readGitHubMath', () => {
  it('reads math set between backticks as the TeX alone', () => {
    expect(read('Holds $`\\binom{k}{2}`$ pairs.\n')).toEqual(read('Holds $\\binom{k}{2}$ pairs.\n'))
  })

  it('leaves math written without backticks as written', () => {
    expect(read('One in $2^{64}$.\n')).toEqual(['264'])
  })
})
