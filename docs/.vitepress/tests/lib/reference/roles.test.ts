import fs   from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { ROLES, resolve }         from '../../../lib/identity/roles.ts'
import { ORDER, START, heldLine } from '../../../lib/reference/roles.ts'
import { pagesDir }               from '../../../lib/site/paths.ts'

describe('ORDER', () => {
  it('steps through every role the identity declares, opening on the run color', () => {
    expect([...ORDER].toSorted()).toEqual(Object.keys(ROLES).toSorted())
    expect(ORDER[START]).toBe('run')
  })
})

describe('heldLine', () => {
  it('writes a role against the page, the page itself as it stands', () => {
    expect(heldLine('ink', 12.345)).toBe('12.35:1 on the page')
    expect(heldLine('page', 1)).toBe('The page itself')
  })
})

describe('the identity page', () => {
  const page = fs.readFileSync(path.join(pagesDir(import.meta.url), 'reference/identity.md'), 'utf8')

  it.each(Object.entries(ROLES))('states the hex a browser draws %s in', (role, { dark, light }) => {
    const row = page.split('\n').find(line => line.startsWith(`| \`${role}\` |`))!
    expect(row).toContain(`\`${resolve(light)}\``)
    expect(row).toContain(`\`${resolve(dark)}\``)
  })
})
