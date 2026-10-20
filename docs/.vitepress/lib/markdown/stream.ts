import type { MarkdownRenderer } from 'vitepress'

export type Core          = Parameters<Parameters<MarkdownRenderer['core']['ruler']['push']>[1]>[0]
export type MarkdownToken = Core['tokens'][number]

/**
 * Builds a block of raw HTML the renderer writes as it stands.
 */
export function html(state: Core, content: string): MarkdownToken {
  return Object.assign(new state.Token('html_block', '', 0), { content })
}
