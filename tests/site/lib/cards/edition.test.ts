import { describe, expect, it } from 'vitest'

import { editionOf }    from '../../../../docs/.vitepress/lib/cards/edition.ts'
import examples         from '../../../../docs/.vitepress/lib/rendered/examples.json' with { type: 'json' }
import { projectFacts } from '../../../../docs/.vitepress/lib/site/manifest.ts'

describe('editionOf', () => {
  const edition = editionOf(import.meta.url)

  it('states the host and the version the manifest declares', () => {
    const { host, version } = projectFacts(import.meta.url)
    expect(edition).toMatchObject({ host, version })
  })

  it("draws the run the index matched for the front page's example", () => {
    expect(edition.run).toEqual(examples.front.span)
  })

  it('reads the wordmark drawn in currentColor', () => {
    expect(edition.wordmark).toMatch(/^<svg[^>]+viewBox="0 -840 3350 890"[^]*currentColor/u)
  })
})
