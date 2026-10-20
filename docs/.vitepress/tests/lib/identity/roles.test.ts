import { describe, expect, it } from 'vitest'

import { contrast }   from '../../../lib/identity/colors.ts'
import * as roles     from '../../../lib/identity/roles.ts'
import { propertyOf } from '../../../lib/identity/tokens.ts'
import { SECTIONS }   from '../../../lib/site/sections.ts'

type Painted = [string, { dark: roles.Paint, light: roles.Paint }]
type Scheme  = (typeof SCHEMES)[number]

const SCHEMES = ['dark', 'light'] as const

const page    = (scheme: Scheme): string => roles.resolve(roles.ROLES.page[scheme])
const rolesOf = (kind: string): Painted[] =>
  Object.entries(roles.ROLES).filter(([, role]) => role.kind === kind)
const grounds = rolesOf('ground')
const marks   = rolesOf('mark')

describe('the roles hold the contrast WCAG 2.2 sets', () => {
  it.each(SCHEMES.flatMap(scheme => rolesOf('text').flatMap(([role, paints]) =>
    grounds.map(([ground, under]) => ({ ground, role, scheme, text: paints[scheme], under: under[scheme] }))
  )))(
    'sets $role at 4.5:1 or more on $ground in the $scheme scheme',
    ({ text, under }) => {
      expect(contrast(roles.resolve(text), roles.resolve(under))).toBeGreaterThanOrEqual(4.5)
    }
  )

  it.each(SCHEMES.flatMap(scheme => marks.map(([role, paints]) => ({ mark: paints[scheme], role, scheme }))))(
    'draws the $role mark at 3:1 or more on the page in the $scheme scheme',
    ({ mark, scheme }) => {
      expect(contrast(roles.resolve(mark), page(scheme))).toBeGreaterThanOrEqual(3)
    }
  )

  it.each(SECTIONS)('accents the $slug preview card at 3:1 or more on the dark page', ({ color }) => {
    expect(contrast(roles.resolve(color), page('dark'))).toBeGreaterThanOrEqual(3)
  })
})

describe('the brand button', () => {
  it.each(SCHEMES)("sets the page's color on the run's fill at 4.5:1 or more in the %s scheme", scheme => {
    expect(contrast(page(scheme), roles.resolve(roles.ROLES.run[scheme]))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('resolve', () => {
  it.each([
    ['primary', '#764017'],
    ['white', '#ffffff'],
    ['black', '#000000'],
    [['white', 100, 'black'], '#ffffff']
  ] as [roles.Paint, string][])('resolves %j to %s', (paint, hex) => {
    expect(roles.resolve(paint)).toBe(hex)
  })
})

describe('rolesSheet', () => {
  it('sets each role through light-dark, a mix through color-mix in OKLab, and an end by its keyword', () => {
    expect(roles.rolesSheet({ shade: { dark: ['dark', 66, 'black'], kind: 'ground', light: 'ground' } }))
      .toContain('  --sc-shade: light-dark(var(--sc-ground), '
               + 'color-mix(in oklab, var(--sc-dark) 66%, black));')
  })

  it.each(Object.keys(roles.ROLES))('sets the %s role', role => {
    expect(roles.rolesSheet()).toMatch(new RegExp(`^  ${propertyOf(role)}: light-dark\\(`, 'mu'))
  })
})
