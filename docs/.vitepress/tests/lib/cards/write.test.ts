import fs   from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { planCards, writeCards } from '../../../lib/cards/write.ts'
import { pagesDir }              from '../../../lib/site/paths.ts'
import { cardOf }                from '../../../lib/site/routes.ts'
import { builtPages }            from '../../common/pages.ts'
import { test }                  from '../../common/repo.ts'

const BUILT = { outDir: '', pages: builtPages(), srcDir: pagesDir(import.meta.url) }

describe('planCards', () => {
  it("plans the site's card for the not-found page, whose head names it too", () => {
    expect([...planCards({ ...BUILT, pages: [] }, import.meta.url).keys()]).toEqual([cardOf('404.md')])
  })

  it('plans the card the head of each page names and no other', () => {
    const plan = planCards(BUILT, import.meta.url)
    expect(new Set(plan.keys())).toEqual(new Set(builtPages().map(page => cardOf(page))))
  })
})

describe('writeCards', () => {
  test('writes each card as a PNG at 1200 by 600 under the built site', async ({ repo }) => {
    const pages   = ['index.md', 'methods/keys.md']
    const written = await writeCards({ ...BUILT, outDir: repo.root, pages }, import.meta.url)
    const png     = fs.readFileSync(path.join(repo.root, 'cards', 'methods-keys.png'))
    expect(written.toSorted()).toEqual(['/cards/methods-keys.png', '/cards/site.png'])
    expect(png.toString('ascii', 1, 4)).toBe('PNG')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 600])
  }, 30_000)
})
