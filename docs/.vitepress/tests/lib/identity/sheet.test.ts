import { describe, expect, it } from 'vitest'

import * as sheet               from '../../../lib/identity/sheet.ts'
import { IDENTITY, propertyOf } from '../../../lib/identity/tokens.ts'
import * as timing              from '../../../lib/motion/timing.ts'

type Hook = (id: string) => string | undefined

describe('identitySheet', () => {
  it.each(Object.entries(IDENTITY.palette))('sets the %s token to its hex', (token, color) => {
    expect(sheet.identitySheet()).toContain(`${propertyOf(token)}: ${color.hex};`)
  })

  it.each(Object.entries(IDENTITY.faces))('leads the %s stack on its variable face', (face, declared) => {
    const { family, stack } = declared
    expect(sheet.identitySheet()).toContain(`--sc-face-${face}: "${family} Variable", ${stack};`)
  })
})

describe('identityPlugin', () => {
  const plugin = sheet.identityPlugin()
  const hook   = (name: 'load' | 'resolveId'): Hook => plugin[name] as unknown as Hook

  it('resolves the sheet to an id only the plugin loads', () => {
    expect(hook('resolveId')(sheet.SHEET)).toBe(`\0${sheet.SHEET}`)
    expect(hook('resolveId')('other.css')).toBeUndefined()
  })

  it('serves the tokens, the roles, and the motion in one sheet', () => {
    const served = hook('load')(`\0${sheet.SHEET}`)
    expect(served).toContain('--sc-primary: #764017;')
    expect(served).toContain('--sc-ink: light-dark(')
    expect(served).toContain('--sc-duration-glide: 420ms;')
  })

  it('leaves every other module to the next plugin', () => {
    expect(hook('load')('other.css')).toBeUndefined()
  })
})

describe('motionSheet', () => {
  it.each(Object.entries(timing.DURATIONS))('sets the %s duration in milliseconds', (name, ms) => {
    expect(sheet.motionSheet()).toContain(`  --sc-duration-${name}: ${ms}ms;`)
  })

  it.each(Object.entries(timing.CURVES))('sets the %s curve as a cubic Bézier', (name, points) => {
    expect(sheet.motionSheet()).toContain(`  --sc-curve-${name}: cubic-bezier(${points.join(', ')});`)
  })

  it.each([
    [
      'for a reader who prefers reduced motion',
      "@media (prefers-reduced-motion: reduce) {\n:root:not([data-motion='playing']) {"
    ],
    ['while the motion switch has paused the drawings', ":root[data-motion='paused'] {"]
  ])('drops every duration to zero %s', (_, opening) => {
    const [, rule] = sheet.motionSheet().split(opening)
    expect(rule?.split('}')[0]?.match(/: 0ms;/gu)).toHaveLength(Object.keys(timing.DURATIONS).length)
  })
})
