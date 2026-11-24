import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import { facesOf }                from '../../../../docs/.vitepress/lib/cards/faces.ts'
import { CARD, STARTS, drawCard } from '../../../../docs/.vitepress/lib/readme/cards.ts'
import { SCHEMES }                from '../../../../docs/.vitepress/lib/readme/preview.ts'
import { readmeDir }              from '../../../../docs/.vitepress/lib/readme/write.ts'

/**
 * Every card Where to Start sets, in each scheme.
 */
const CARDS = SCHEMES.flatMap(scheme => STARTS.map(start => ({ name: start.section.label, scheme, start })))

describe('STARTS', () => {
  it('opens the Guide, the Viewer, and Methods under the numerals I to III', () => {
    expect(STARTS.map(({ numeral, section }) => `${numeral} ${section.label}`)).toEqual([
      'I Guide', 'II Viewer', 'III Methods'
    ])
  })
})

describe('drawCard', () => {
  const fonts = facesOf(import.meta.url)

  it.each(CARDS)('draws the $name card in the $scheme scheme the README shows', async ({ scheme, start }) => {
    const file = `${readmeDir(import.meta.url)}/${start.section.slug}-${scheme}.svg`
    expect(await drawCard(fonts, scheme, start)).toBe(fs.readFileSync(file, 'utf8'))
  })

  it('labels the card for a screen reader by its section, at the size every card takes', async () => {
    const svg = await drawCard(fonts, 'light', STARTS[1]!)
    const head = `<svg role="img" aria-label="Viewer" width="${CARD.width}" height="${CARD.height}"`
    expect(svg.startsWith(head)).toBe(true)
  })
})
