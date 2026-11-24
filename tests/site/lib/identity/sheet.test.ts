import { describe, expect, it } from 'vitest'

import * as sheet               from '../../../../docs/.vitepress/lib/identity/sheet.ts'
import { IDENTITY, propertyOf } from '../../../../docs/.vitepress/lib/identity/tokens.ts'
import * as timing              from '../../../../docs/.vitepress/lib/motion/timing.ts'

describe('identitySheet', () => {
  it('sets every token to its hex and leads every stack on its variable face', () => {
    expect(sheet.identitySheet().split('\n')).toEqual(expect.arrayContaining([
      ...Object.entries(IDENTITY.palette).map(([token, color]) => `  ${propertyOf(token)}: ${color.hex};`),
      ...Object.entries(IDENTITY.faces).map(([face, { family, stack }]) =>
        `  --sc-face-${face}: "${family} Variable", ${stack};`)
    ]))
  })
})

describe('identityPlugin', () => {
  it('serves the tokens, the roles, and the motion in one sheet', () => {
    const load   = sheet.identityPlugin().load as unknown as (id: string) => string
    const served = load(`\0${sheet.SHEET}`)
    expect(served).toContain('--sc-primary: #764017;')
    expect(served).toContain('--sc-ink: light-dark(')
    expect(served).toContain('--sc-duration-glide: 420ms;')
  })
})

describe('motionSheet', () => {
  it('sets every duration in milliseconds and every curve as a cubic Bézier', () => {
    expect(sheet.motionSheet().split('\n')).toEqual(expect.arrayContaining([
      ...Object.entries(timing.DURATIONS).map(([name, ms]) => `  --sc-duration-${name}: ${ms}ms;`),
      ...Object.entries(timing.CURVES).map(([name, points]) =>
        `  --sc-curve-${name}: cubic-bezier(${points.join(', ')});`)
    ]))
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
