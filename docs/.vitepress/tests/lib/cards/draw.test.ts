import { describe, expect, it } from 'vitest'

import * as draw           from '../../../lib/cards/draw.ts'
import { IDENTITY, hexOf } from '../../../lib/identity/tokens.ts'
import { SECTIONS }        from '../../../lib/site/sections.ts'

const EDITION: draw.Edition = {
  host     : 'scotch.fyi',
  run      : { length: 6, start: 7 },
  version  : '0.1.0',
  wordmark : '<svg viewBox="0 -840 3350 890"><path fill="currentColor" d="M0 0"/></svg>'
}

/**
 * Reads the style of every node of the card for the section at `place` that is
 * drawn in that section's color.
 */
function accented(place: number): Record<string, number | string>[] {
  const section = SECTIONS[place]!
  return nodes(draw.pageCard(EDITION, { section, title: 'A Page' }, SECTIONS))
    .flatMap(node => node.props.style?.background === hexOf(section.color) ? [node.props.style] : [])
}

/**
 * Finds the node of a card setting `text` as one of its children.
 */
function holding(card: draw.Tree, text: string): draw.Tree | undefined {
  return nodes(card).find(node => [node.props.children].flat().includes(text))
}

/**
 * Lists a node and every node beneath it, in tree order.
 */
function nodes(node: draw.Tree | string): draw.Tree[] {
  if (typeof node === 'string') return []
  return [node, ...[node.props.children ?? []].flat().flatMap(child => nodes(child))]
}

/**
 * Reads how far from the rails' left the run starts on the card for the section
 * at `place`.
 */
function runStart(place: number): number {
  return Math.min(...accented(place).flatMap(style => typeof style.left === 'number' ? [style.left] : []))
}

/**
 * Lists every string a node and the nodes beneath it set, in tree order.
 */
function texts(node: draw.Tree | string): string[] {
  if (typeof node === 'string') return [node]
  return [node.props.children ?? []].flat().flatMap(child => texts(child))
}

describe('siteCard', () => {
  const card = draw.siteCard(EDITION)

  it("draws at the card's size", () => {
    expect(card.props.style).toMatchObject({ height: draw.CARD.height, width: draw.CARD.width })
  })

  it.each([IDENTITY.tagline, 'EDITION', '0.1.0', 'SCOTCH.FYI', 'STORED', 'SUBMITTED'])('sets %s', text => {
    expect(texts(card)).toContain(text)
  })

  it('draws the wordmark in Cashmere at the height its viewBox gives its width', () => {
    const mark = nodes(card).find(node => node.type === 'img')
    expect(mark?.props).toMatchObject({ height: 480 * 890 / 3350, width: 480 })
    const svg = Buffer.from(String(mark?.props.src).replace(/^[^,]+,/u, ''), 'base64').toString()
    expect(svg).toContain('fill="#e3c3a3"')
  })
})

describe('pageCard', () => {
  it.each(SECTIONS.map((section, place) => ({ place: place + 1, section })))(
    'names the $section.label section by its place among the sections',
    ({ place, section }) => {
      expect(texts(draw.pageCard(EDITION, { section, title: 'A Page' }, SECTIONS)))
        .toContain(`${section.label.toUpperCase()} · SECTION 0${place} OF 0${SECTIONS.length}`)
    }
  )

  it("sets the page's title and the edition", () => {
    expect(texts(draw.pageCard(EDITION, { section: SECTIONS[0], title: 'A Page' }, SECTIONS)))
      .toEqual(expect.arrayContaining(['A Page', 'SCOTCH.FYI · 0.1.0']))
  })

  it.each([['A Page', 7], ['Matches the Rule Passes Over', 6]])('sets %s at %d units', (title, units) => {
    const card = draw.pageCard(EDITION, { section: SECTIONS[0], title }, SECTIONS)
    expect(holding(card, title)?.props.style?.fontSize).toBe(units * draw.CARD.width / 100)
  })
})

describe("pageCard, in its section's color", () => {
  it.each(SECTIONS.map((section, place) => ({ place, section })))(
    "draws both rules and the run's squares on dark columns in the $section.label color",
    ({ place }) => {
      const styles = accented(place)
      expect(styles.filter(style => !('left' in style))).toHaveLength(2)
      expect(styles.filter(style => 'left' in style)).toHaveLength(EDITION.run.length / 2)
    }
  )

  it("moves the run along the rails as the section's place grows", () => {
    const starts = SECTIONS.map((_, place) => runStart(place))
    expect(starts).toEqual(starts.toSorted((a, b) => a - b))
    expect(new Set(starts).size).toBe(SECTIONS.length)
  })
})
