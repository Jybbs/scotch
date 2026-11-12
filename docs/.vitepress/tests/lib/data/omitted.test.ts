import { describe, expect, it } from 'vitest'

import * as numbers from '../../../lib/data/numbers.ts'
import * as omitted from '../../../lib/data/omitted.ts'

const SMALL: omitted.FloorCounts = {
  bins    : [1, 2000, 2500],
  counts  : [[3, 2, 1, 4], [0, 5, 6, 7]],
  decades : ['1990s', '2000s'],
  floor   : 2500
}

const openings = omitted.OMISSIONS.sections.find(({ section }) => section === 'Openings')!

describe('keptAt', () => {
  it.each([
    [2500, { decades: [1, 6], kept: 7, total: 28, under: 10, unrated: 11 }],
    [2000, { decades: [3, 11], kept: 14, total: 28, under: 3, unrated: 11 }]
  ])('keeps the rated games reaching a floor of %i and counts the unrated games apart', (floor, kept) => {
    expect(omitted.keptAt(floor, SMALL)).toEqual(kept)
  })

  it('matches the Openings games the store keeps at the floor it declares, by decade', () => {
    const kept = omitted.keptAt(omitted.OMISSIONS.floor.floor)
    expect(kept.kept + kept.under + kept.unrated).toBe(kept.total)
    expect(kept.decades.length).toBe(omitted.OMISSIONS.floor.decades.length)
  })
})

describe('floorLayout and floorAt', () => {
  const layout = omitted.floorLayout(600, SMALL)

  it('lays the grid, its margin, and its strip across the width', () => {
    expect(layout).toEqual({
      cell   : (600 - 62 - 92 - 10) / 2,
      edge   : 62 + 2 * ((600 - 62 - 92 - 10) / 2) + 10,
      gap    : 10,
      grid   : 4 * 16 + 10,
      height : 74 + 30 + 22,
      left   : 62,
      margin : 92,
      row    : 16,
      strip  : 30,
      width  : 600
    })
    expect(omitted.floorLayout(320, SMALL)).toMatchObject({ left: 52, margin: 46, row: 14 })
    expect(omitted.floorLayout(0, SMALL).cell).toBe(0)
  })

  it.each([
    [0, 2500],
    [16, 2500],
    [24, 1800],
    [40, 1800],
    [400, 1800]
  ])('sets the floor at the row edge nearest %i pixels down, held to the floors it drags to', (y, floor) => {
    expect(omitted.floorAt(layout, y, { ...SMALL, bins: [1, 1800, 2500] })).toBe(floor)
  })
})

describe('the ledger', () => {
  it('reads every game a section holds and names its files', () => {
    expect(omitted.readOf(openings)).toBe(numbers.summed(omitted.KINDS.map(({ key }) => openings[key])))
    expect(omitted.sectionFiles('Events')).toBe('the Events files')
    expect(omitted.sectionFiles('Players')).toBe('the Players archives')
  })

  it('lists the files behind a count, the most first, leaving out the files holding none', () => {
    const files = omitted.holding('repeat', 'Events')
    expect(files.length).toBeGreaterThan(0)
    expect(files.every(([, count]) => count > 0)).toBe(true)
    expect(files.map(([, count]) => count)).toEqual(files.map(([, count]) => count).toSorted((a, b) => b - a))
  })

  it.each(omitted.KINDS.map(({ key }) => key))('writes the sentence for the %s count', kind => {
    const read = numbers.counted(omitted.readOf(openings))
    expect(omitted.ledgerSentence(kind, openings))
      .toMatch(`${numbers.counted(openings[kind])} of the ${read} games the Openings archives hold `)
  })

  it('steps among the segments drawn, leaving out a kind a section holds none of', () => {
    const below = omitted.segments.filter(({ kind }) => kind === 'below')
    expect(below.some(({ section }) => section === 'Players')).toBe(false)
    expect(omitted.segmentPast(omitted.segments[0]!, -1)).toBe(0)
    expect(omitted.segmentPast(omitted.segments[0]!, 1)).toBe(1)
    expect(omitted.segmentPast(omitted.segments.at(-1)!, 1)).toBe(omitted.segments.length - 1)
  })

  it('shades a count on a log scale against the largest', () => {
    expect([omitted.levelOf(0, 99), omitted.levelOf(9, 99), omitted.levelOf(99, 99)]).toEqual([0, 0.5, 1])
  })

  it('writes the sentence the floor reads', () => {
    expect(omitted.floorSentence(2500, omitted.keptAt(2500, SMALL))).toBe(
      'At a floor of 2,500, the index keeps 7 of the 28 Openings games dated to a decade, leaving out 10 '
      + 'under the floor and 11 rated on neither side.'
    )
  })
})
