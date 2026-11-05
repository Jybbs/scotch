import fs   from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { MARKS, frameAt } from '../../../lib/reference/marks.ts'
import { repoRoot }       from '../../../lib/site/paths.ts'

const LAST = MARKS.stops.length - 1

describe('MARKS', () => {
  it('orders the stops by width, each stating it', () => {
    expect(MARKS.stops.map(stop => stop.width)).toEqual([12, 17, 384, 400, 560])
    expect(MARKS.stops.map(stop => stop.name)).toEqual(['Favicon', 'Nav mark', 'Wordmark', 'Link card', 'Lockup'])
  })
})

describe('frameAt', () => {
  it('draws the favicon alone at its size', () => {
    const frame = frameAt(0, 688, 264)
    expect([frame.letters, frame.tagline, frame.card]).toEqual([0, 0, 0])
    expect(Math.round(frame.unitsH)).toBe(16)
    expect(Math.round(frame.unitsW)).toBe(12)
    expect(frame.shown).toBe(1)
  })

  it('adds the letters by the wordmark', () => {
    const frame = frameAt(2, 688, 264)
    expect([frame.letters, frame.tagline, frame.card]).toEqual([1, 0, 0])
    expect(Math.round(frame.unitsW)).toBe(384)
  })

  it('stands the link card over the drawing at its stop alone', () => {
    expect(frameAt(3, 688, 264).card).toBe(1)
    expect(frameAt(2.5, 688, 264).card).toBe(0)
    expect(frameAt(3.5, 688, 264).card).toBe(0)
  })

  it('ends on the lockup with its tagline, fitting the column', () => {
    const frame = frameAt(LAST, 342, 264)
    expect(frame.tagline).toBe(1)
    expect(Math.round(frame.unitsW)).toBe(560)
    expect(frame.shown).toBeLessThan(1)
    expect(frame.half * 2).toBeLessThanOrEqual(342)
  })

  it('fits the link card inside a narrow stage', () => {
    const frame = frameAt(3, 342, 264)
    expect(frame.cardWide).toBeLessThanOrEqual(342 - 24)
    expect(frame.cardLeft).toBeCloseTo((342 - frame.cardWide) / 2)
  })
})

function read(...parts: string[]): string {
  return fs.readFileSync(path.join(repoRoot(import.meta.url), ...parts), 'utf8')
}

function stopNamed(name: string): (typeof MARKS.stops)[number] {
  return MARKS.stops.find(item => item.name === name)!
}

describe('the stops', () => {
  it('run by width, the mark first and the lockup last', () => {
    const widths = MARKS.stops.map(({ width }) => width)
    expect(widths).toEqual(widths.toSorted((first, second) => first - second))
    expect(MARKS.stops[0]!.name).toBe('Favicon')
    expect(MARKS.stops.at(-1)!.name).toBe('Lockup')
  })

  it('state the sizes the site and the README set each drawing at', () => {
    expect(read('docs/.vitepress/theme/styles/page.css')).toContain(`height       : ${stopNamed('Nav mark').height}px`)
    expect(read('docs/.vitepress/theme/styles/front/hero.css')).toContain(`min(${stopNamed('Wordmark').width / 16}rem`)
    expect(read('.github/README.md')).toContain(`width="${stopNamed('Lockup').width}"`)
  })
})
