import { readFileSync } from 'node:fs'
import { resolve }      from 'node:path'

import { describe, expect, it } from 'vitest'

const DECLARED = /(?:^|[{;])\s*([a-z-]+)\s*:(?!:)/gmu
const sheet    = readFileSync(resolve(import.meta.dirname, '../../../theme/styles/page.css'), 'utf8')
/**
 * The properties a whitespace utility sets, which the `text-wrap` shorthand
 * resets beside the wrap style.
 */
const whitespace = new Set(['text-wrap', 'text-wrap-mode', 'white-space'])

describe('page.css', () => {
  it('declares no property a whitespace utility sets, leaving each one as a component writes it', () => {
    const declared = new Set([...sheet.matchAll(DECLARED)].map(([, property = '']) => property))
    expect([...declared.intersection(whitespace)]).toEqual([])
    expect(declared).toContain('text-wrap-style')
  })
})
