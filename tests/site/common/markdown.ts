import { readFileSync }  from 'node:fs'
import { createRequire } from 'node:module'
import { resolve }       from 'node:path'

import { type VueWrapper, mount } from '@vue/test-utils'
import { onTestFinished }         from 'vitest'
import type { Component }         from 'vue'

import { styled, utilities } from './tailwind.ts'

/**
 * The spacing a list and its rows end with.
 */
interface Spacing {
  margin : string[]
  marked : string[]
  marker : string
  rows   : string[]
}

/**
 * The spacing of a list drawn flush in its plate, with no outer margin, no
 * start padding, and no marker, each row 22px tall and set against the one
 * above it. happy-dom maps no shorthand onto a logical property and applies no
 * rule the `*:` variant writes, so the start padding and the rows' margins read
 * as the utilities that outrank the doc column's list rules by their important
 * mark.
 */
export const FLUSH: Spacing = {
  margin : ['0px', '0px'],
  marked : ['list list-style-type', 'list margin', 'list padding', 'rows margin'],
  marker : 'none',
  rows   : ['22px']
}
const require = createRequire(import.meta.url)
/**
 * The default theme's Markdown sheet and the site's own, each outside every
 * cascade layer.
 */
const SHEETS = [
  require.resolve('vitepress/dist/client/theme-default/styles/components/vp-doc.css'),
  resolve(import.meta.dirname, '../../../docs/.vitepress/theme/styles/page.css')
]

/**
 * Mounts `component` with `props` into a doc column under the default theme's
 * Markdown sheet, the site's `page.css`, and the utilities it carries, as a
 * page places it, taking all three away once the case finishes.
 */
export async function columned(
  component : Component,
  props     : Record<string, unknown> = {}
): Promise<VueWrapper> {
  const page  = document.createElement('div')
  const rules = document.createElement('style')
  page.className    = 'vp-doc'
  rules.textContent = SHEETS.map(path => readFileSync(path, 'utf8')).join('\n')
  page.append(rules)
  document.body.append(page)
  const drawn = mount(component, { attachTo: page, props })
  const sheet = await styled(drawn.element)
  onTestFinished(() => {
    drawn.unmount()
    page.remove()
    sheet.remove()
  })
  return drawn
}

/**
 * Reads the margin and marker `list` ends with, each property its utilities
 * mark important on the list or on its rows, and each distinct line height
 * among its rows.
 */
export async function spacing(list: Element): Promise<Spacing> {
  const style = getComputedStyle(list)
  const rules = (await utilities([...list.classList])).matchAll(/([^{};]+)\{([^{}]*)\}/gu)
  return {
    margin : [style.marginTop, style.marginBottom],
    marker : style.listStyleType,
    rows   : [...new Set([...list.children].map(row => getComputedStyle(row).lineHeight))],
    marked : [...rules]
      .flatMap(([, selector = '', body = '']) => [...body.matchAll(/([\w-]+):[^;]*!important/gu)]
        .map(([, property = '']) => `${selector.includes('> *') ? 'rows' : 'list'} ${property}`))
      .toSorted()
  }
}
