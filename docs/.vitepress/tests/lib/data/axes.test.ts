import { describe, expect, it } from 'vitest'

import * as axes         from '../../../lib/data/axes.ts'
import * as files        from '../../../lib/data/files.ts'
import { SAMPLE_LISTED } from './fixtures/listed.ts'

const entries = files.entriesOf(SAMPLE_LISTED)
const years   = [1845, 2030] as const
const bands   = axes.bandsOf(files.sectionOf(entries, 'Openings'))

describe('bandsOf', () => {
  it('lays the first moves out busiest first, each the width of the games its files hold', () => {
    expect(bands.firsts.map(band => [band.label, band.from, band.to]))
      .toEqual([['1.e4', 0, 220], ['1.f4', 220, 260], ['1.d4', 260, 290]])
    expect(bands.total).toBe(290)
  })

  it('lays each reply beneath its first move, and a file with no reply under a bare band', () => {
    expect(bands.replies.map(band => [band.label, band.parent?.label, band.from, band.to]))
      .toEqual([
        ['1…c5', '1.e4', 0, 150], ['1…e6', '1.e4', 150, 220], ['…', '1.f4', 220, 260],
        ['1…d5', '1.d4', 260, 290]
      ])
  })

  it('lays each file beneath its reply, the file holding the most games first', () => {
    expect(bands.files.map(band => band.label)).toEqual(['Najdorf', 'Dragon', 'French', 'Bird', 'QGD'])
  })
})

describe('zoomed and trail', () => {
  const [e4]      = bands.firsts
  const [c5]      = bands.replies
  const [najdorf] = bands.files

  it.each([
    { band: e4!, domain: [0, 290], opened: [0, 220] },
    { band: c5!, domain: [0, 220], opened: [0, 150] },
    { band: c5!, domain: [0, 150], opened: [0, 220] },
    { band: e4!, domain: [0, 220], opened: [0, 290] }
  ])('opens $band.label from $domain onto $opened', ({ band, domain, opened }) => {
    expect(axes.zoomed(bands, band, domain as [number, number])).toEqual(opened)
  })

  it('names the stretch from every opening to the first move and the reply that fill it', () => {
    expect(axes.trail(bands, [0, 290])).toBe('All openings')
    expect(axes.trail(bands, [0, 220])).toBe('All openings  ›  1.e4')
    expect(axes.trail(bands, [0, 150])).toBe('All openings  ›  1.e4  ›  1…c5')
    expect(najdorf?.parent).toBe(c5)
  })

  it('places a band across the width for the stretch shown', () => {
    expect([axes.bandX([0, 290], 318, 0), axes.bandX([0, 290], 318, 290)]).toEqual([14, 304])
    expect(axes.bandX([5, 5], 318, 5)).toBe(14)
  })
})

describe('swarm', () => {
  const players = files.sectionOf(entries, 'Players')
  const laid    = axes.swarm(184, players, 688, years)
  const crowd   = Array.from({ length: 40 }, (_, place) => ({ ...players[2]!, stem: `M${place}` }))

  it('sets a disc for each dated archive, in the order of its year', () => {
    expect(laid.map(disc => disc.entry.stem)).toEqual(['Morphy', 'Bird', 'Carlsen'])
  })

  it('sizes the busiest archive’s disc largest and centers it on the axis line', () => {
    const carlsen = laid.at(-1)!
    expect(carlsen.box.r).toBeCloseTo(6.5)
    expect([carlsen.box.y, carlsen.rise]).toEqual([78, 0])
    expect(carlsen.box.x).toBeCloseTo(axes.yearX(688, years, files.meanYear(carlsen.entry.listed)!))
  })

  it('moves a disc off the line until it overlaps none placed before it', () => {
    const near   = axes.swarm(184, [players[2]!, { ...players[2]!, stem: 'Twin' }], 688, years)
    const [a, b] = near
    const apart  = Math.hypot(a!.box.x - b!.box.x, a!.box.y - b!.box.y)
    expect(apart).toBeGreaterThanOrEqual(a!.box.r + b!.box.r + 0.7)
    expect(near.some(disc => disc.rise !== 0)).toBe(true)
  })

  it('shrinks every disc where the swarm would rise past half the drawing', () => {
    const discs = axes.swarm(60, crowd, 688, years)
    expect(discs[0]!.box.r).toBeLessThan(laid[0]!.box.r)
  })

  it('shrinks no disc past the least scale, however high the swarm rises', () => {
    const layout = { axis: 26, gap: 0.7, least: 0.9, shrink: 0.5, side: 14 }
    const [disc] = axes.swarm(60, crowd, 688, years, layout)
    expect(disc!.box.r).toBeCloseTo(6.5 * 0.5)
  })
})

describe('bricks', () => {
  const laid = axes.bricks(files.sectionOf(entries, 'Events'), 184, 688, years)

  it('stacks each dated event in its year, shaded by the heading it is listed under', () => {
    expect(laid.map(brick => [brick.entry.stem, brick.shade])).toEqual([
      ['WorldChamp1886', 1], ['Candidates1950', 0.66], ['Linares1994', 0.36], ['WorldChamp2018', 1]
    ])
    expect(laid[0]!.box.x).toBeCloseTo(axes.yearX(688, years, 1886))
  })

  it('stacks a World Championship beneath a tournament of the same year', () => {
    const tied = files.entriesOf([
      { ...SAMPLE_LISTED[5]!, year: 2018 },
      SAMPLE_LISTED[8]!
    ])
    const [low, high] = axes.bricks(tied, 184, 688, years)
    expect([low!.entry.stem, high!.entry.stem]).toEqual(['WorldChamp2018', 'Linares1994'])
    expect(high!.box.y).toBeLessThan(low!.box.y)
  })

  it('shades an event under an unknown heading as a tournament', () => {
    expect(axes.shadeOf({ ...laid[0]!.entry, listed: { ...laid[0]!.entry.listed, group: null } })).toBe(0.36)
  })
})

describe('namedYears', () => {
  it('names each half century the axis spans', () => {
    expect(axes.namedYears(years)).toEqual([1850, 1900, 1950, 2000])
  })
})
