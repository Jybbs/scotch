import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { pageSheet } from '../../common/markdown.ts'

const DECLARED = /(?:^|[{;])\s*([a-z-]+)\s*:(?!:)/gmu
const sheet    = readFileSync(pageSheet, 'utf8')
/**
 * The properties that write `text-wrap-mode`, the longhand a whitespace
 * utility sets through `white-space`, so any one declared in this unlayered
 * sheet outranks the utility.
 */
const whitespace = new Set(['text-wrap', 'text-wrap-mode', 'white-space'])

describe('page.css', () => {
  it('declares no property a whitespace utility sets, leaving each one as a component writes it', () => {
    const declared = new Set([...sheet.matchAll(DECLARED)].map(([, property = '']) => property))
    expect([...declared.intersection(whitespace)]).toEqual([])
    expect(declared).toContain('text-wrap-style')
  })

  it('selects no class a component writes, leaving each to its utilities', () => {
    expect(sheet).not.toMatch(/\.sc-/u)
  })
})
