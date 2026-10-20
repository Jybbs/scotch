import { describe, expect, it } from 'vitest'

import { cardOf, routeOf } from '../../../lib/site/routes.ts'

describe('routeOf', () => {
  it.each([
    ['index.md', '/'],
    ['data/index.md', '/data/'],
    ['data/lengths.md', '/data/lengths'],
    ['404.md', '/404']
  ])('serves %s at %s', (page, route) => {
    expect(routeOf(page)).toBe(route)
  })
})

describe('cardOf', () => {
  it.each([
    ['index.md', '/cards/site.png'],
    ['404.md', '/cards/site.png'],
    ['data/index.md', '/cards/data.png'],
    ['methods/limits.md', '/cards/methods-limits.png']
  ])('names the card of %s as %s', (page, card) => {
    expect(cardOf(page)).toBe(card)
  })
})
