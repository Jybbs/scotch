import fs   from 'node:fs'
import path from 'node:path'

import type { PageData } from 'vitepress'

import { FRONT } from '../markdown/front.ts'

type TransformedPage = Pick<PageData, 'frontmatter' | 'relativePath'>

/**
 * The buttons beneath the front page's lockup, each linking a page that
 * explains what the tool does.
 */
export const ACTIONS = [
  { link: '/guide/', text: 'Read the Guide', theme: 'brand' },
  { link: '/methods/runs', text: 'How Matching Works', theme: 'alt' }
] as const

/**
 * Reads the first sentence of a page's opening paragraph as plain text, the
 * description its head carries, leaving out the heading, every marker a task
 * writes a region between, a link's address, a footnote's marker, and the
 * asterisks and backticks that set a word in italics or in code, or `undefined`
 * where the page opens on no paragraph.
 */
export function leadOf(markdown: string): string | undefined {
  const paragraph = markdown.split(/\n\s*\n/u)
    .map(block => block.trim())
    .find(block => /^(?!```)[\p{L}*`[]/u.test(block))
  const text = paragraph?.replaceAll(/<!--.*?-->/gu, '')
    .replaceAll(/\[\^[^\]]+\]/gu, '')
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replaceAll(/[*`]/gu, '')
    .replaceAll(/\s+/gu, ' ')
  return text?.match(/^.+?\.(?=\s|$)/u)?.[0] ?? text
}

/**
 * Adds what VitePress needs to lay out one page, so no page carries a framework
 * option of its own. The front page takes the home layout and its hero's
 * buttons, and every other page takes the first sentence of its own prose as
 * its description.
 *
 * Args:
 *   page    : The page VitePress is writing.
 *   context : What VitePress hands the transform, the folder the pages sit in
 *     among it.
 */
export function pageData(
  page    : TransformedPage,
  context : { siteConfig: { srcDir: string } }
): Partial<PageData> | undefined {
  if (page.relativePath === FRONT) {
    return { frontmatter: { ...page.frontmatter, hero: { actions: ACTIONS }, layout: 'home' } }
  }
  const description = leadOf(fs.readFileSync(path.join(context.siteConfig.srcDir, page.relativePath), 'utf8'))
  return description === undefined ? undefined : { description }
}
