import { describe, expect, it } from 'vitest'

import * as colors from '../../../lib/identity/colors.ts'

describe('byteHex', () => {
  it.each([[0, '00'], [0.5, '80'], [1, 'ff'], [-1, '00'], [2, 'ff']])('writes %d as %s', (share, digits) => {
    expect(colors.byteHex(share)).toBe(digits)
  })
})

describe('contrast', () => {
  it.each([
    ['#ffffff', '#000000', 21],
    ['#764017', '#f2f1ee', 7.39],
    ['#e3c3a3', '#1a1a1a', 10.44],
    ['#1e69a6', '#1a1a1a', 3.01]
  ])('reads %s against %s at a contrast ratio of %s to 1', (first, second, ratio) => {
    expect(colors.contrast(first, second)).toBeCloseTo(ratio, 2)
    expect(colors.contrast(second, first)).toBeCloseTo(ratio, 2)
  })

  it('refuses a color that is not six hexadecimal digits', () => {
    expect(() => colors.contrast('#fff', '#000000')).toThrow('#fff is not six hexadecimal digits')
  })
})

describe('luminance', () => {
  it.each([['#000000', 0], ['#ffffff', 1]])('reads %s at %d', (hex, expected) => {
    expect(colors.luminance(hex)).toBeCloseTo(expected, 6)
  })
})

describe('mix', () => {
  it.each(['oklab', 'srgb'] as const)('keeps the first color whole at 100 percent in %s', space => {
    expect(colors.mix('#764017', 100, '#f2f1ee', space)).toBe('#764017')
  })

  it.each(['oklab', 'srgb'] as const)('keeps the second color whole at 0 percent in %s', space => {
    expect(colors.mix('#764017', 0, '#f2f1ee', space)).toBe('#f2f1ee')
  })

  it('averages each gamma-encoded channel in sRGB', () => {
    expect(colors.mix('#000000', 50, '#ffffff', 'srgb')).toBe('#808080')
  })

  it('mixes in OKLab by default, which lands lighter than sRGB between black and white', () => {
    expect(colors.mix('#000000', 50, '#ffffff')).toBe('#636363')
  })

  it.each([
    ['#0000ff', '#00ff00', '#00aabf'],
    ['#ff0000', '#ffff00', '#ffa000']
  ])('clips the mix of %s and %s, which falls outside the sRGB gamut, back into it as %s', (a, b, hex) => {
    expect(colors.mix(a, 50, b)).toBe(hex)
  })
})
