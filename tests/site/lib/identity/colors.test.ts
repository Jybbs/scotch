import { describe, expect, it } from 'vitest'

import * as colors from '../../../../docs/.vitepress/lib/identity/colors.ts'

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
  it.each([
    ['keeps the first color whole at 100 percent in OKLab', '#764017', 100, '#f2f1ee', 'oklab', '#764017'],
    ['keeps the first color whole at 100 percent in sRGB', '#764017', 100, '#f2f1ee', 'srgb', '#764017'],
    ['keeps the second color whole at 0 percent in OKLab', '#764017', 0, '#f2f1ee', 'oklab', '#f2f1ee'],
    ['keeps the second color whole at 0 percent in sRGB', '#764017', 0, '#f2f1ee', 'srgb', '#f2f1ee'],
    ['averages each gamma-encoded channel in sRGB', '#000000', 50, '#ffffff', 'srgb', '#808080'],
    ['mixes in OKLab by default, which lands lighter than sRGB', '#000000', 50, '#ffffff', undefined, '#636363'],
    ['clips a blue and green mix outside the sRGB gamut into it', '#0000ff', 50, '#00ff00', undefined, '#00aabf'],
    ['clips a red and yellow mix outside the sRGB gamut into it', '#ff0000', 50, '#ffff00', undefined, '#ffa000']
  ] as const)('%s', (_, first, share, second, space, mixed) => {
    expect(colors.mix(first, share, second, space)).toBe(mixed)
  })
})
