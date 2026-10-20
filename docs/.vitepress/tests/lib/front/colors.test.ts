import { describe, expect, it } from 'vitest'

import * as colors from '../../../lib/front/colors.ts'

const palette = Object.fromEntries(Object.keys(colors.PAINTS)
  .map(color => [color, `rgb(${color})`])) as colors.Palette
const crop = `viewBox="${colors.CROP.x} ${colors.CROP.y} ${colors.CROP.w} ${colors.CROP.h}"`

describe('drawing', () => {
  it('crops a piece to the part of its square it stands in at the size it is drawn at', () => {
    expect(colors.drawing(false, 'p', 'ink', palette, 48)).toContain(`width="48" height="48" ${crop}`)
  })

  it.each(['ink', 'run'] as const)('draws the %s coloring as a solid silhouette', layer => {
    const svg = colors.drawing(false, 'n', layer, palette, 40)
    expect(svg).toContain(`<style>*{fill:rgb(${layer})!important;stroke:rgb(${layer})!important}</style>`)
  })

  it.each([
    [false, 'plain-top', 'white', 'paper', 'line', 'paper'],
    [true, 'plain-top', 'white', 'paper', 'line', 'paper'],
    [false, 'plain-bot', 'black', 'detail', 'line', 'line'],
    [true, 'plain-bot', 'white', 'hollow', 'rim', 'hollow'],
    [false, 'edged-top', 'white', 'paper', 'submitted', 'paper'],
    [true, 'edged-bot', 'white', 'hollow', 'stored', 'hollow']
  ] as const)(
    'draws, dark %s, the %s coloring from the %s set in %s and %s, its body in %s',
    (dark, layer, set, light, shade, body) => {
      const svg = colors.drawing(dark, 'q', layer, palette, 40)
      expect(svg).toContain(`id="${set}-queen" class="${set} queen" fill="rgb(${body})"`)
      expect(svg).toContain(`rgb(${light})`)
      expect(svg).toContain(`rgb(${shade})`)
      expect(svg).not.toMatch(/#(?:fff|000)(?![0-9a-f])/iu)
    }
  )

  it.each(['edged-bot', 'edged-top', 'plain-bot', 'plain-top'] as const)(
    "recolors the knight's white and black written in six digits in the %s coloring",
    layer => {
      expect(colors.drawing(false, 'n', layer, palette, 40)).not.toMatch(/#(?:ffffff|000000)/iu)
    }
  )
})
