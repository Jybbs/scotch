import { describe, expect, it } from 'vitest'

import * as tokens from '../../../lib/identity/tokens.ts'

describe('hexOf', () => {
  it.each(Object.entries(tokens.IDENTITY.palette))('reads %s as its declared hex', (token, color) => {
    expect(tokens.hexOf(token as tokens.Token)).toBe(color.hex)
  })
})

describe('propertyOf', () => {
  it.each([
    ['series_1', '--sc-series-1'],
    ['face-body', '--sc-face-body'],
    ['quiet', '--sc-quiet']
  ])('names %s as %s', (name, property) => {
    expect(tokens.propertyOf(name)).toBe(property)
  })
})
