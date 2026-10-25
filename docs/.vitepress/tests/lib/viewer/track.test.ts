import { describe, expect, it } from 'vitest'

import { EXAMPLES }    from '../../../lib/viewer/examples.ts'
import { Loaded }      from '../../../lib/viewer/loaded.ts'
import * as track      from '../../../lib/viewer/track.ts'
import type { Facing } from '../../../lib/viewer/trail.ts'

/**
 * Each of the track's colors named for its role, so a drawing reads back which
 * role each mark was drawn in.
 */
const COLORS = Object.fromEntries(Object.keys(track.TRACK_ROLES).map(key => [key, key])) as track.TrackColors

/**
 * Stands in for a canvas's 2D context, recording each rectangle filled and each
 * line of text written beside the color it was drawn in.
 */
class Recorder {
  cleared?     : number[]
  fillStyle    = ''
  font         = ''
  readonly rects = [] as { fill: string, h: number, w: number, x: number, y: number }[]
  readonly texts = [] as { fill: string, text: string, x: number, y: number }[]
  textBaseline = ''

  clearRect(x: number, y: number, w: number, h: number): void {
    this.cleared = [x, y, w, h]
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.rects.push({ fill: this.fillStyle, h, w, x, y })
  }

  fillText(text: string, x: number, y: number): void {
    this.texts.push({ fill: this.fillStyle, text, x, y })
  }
}

/**
 * Reads where a column's glyph starts across the track.
 */
function columnAt(loaded: Loaded, cursor: number): number {
  return (cursor - loaded.first) * track.TRACK.column + (track.TRACK.column - track.GLYPH) / 2
}

/**
 * Reads the dark squares of every glyph drawn, thirty-two to a glyph.
 */
function darkSquares(recorder: Recorder): Recorder['rects'] {
  return recorder.rects.filter(({ fill }) => fill === 'glyphDark')
}

/**
 * Draws a match's track into a recorder from a side.
 */
function drawn(loaded: Loaded, facing: Facing = 'white'): Recorder {
  const recorder = new Recorder()
  track.drawTrack(recorder as unknown as CanvasRenderingContext2D, COLORS, facing, loaded)
  return recorder
}

/**
 * Reads where each piece of the submitted game's opening glyph is inked, from
 * the glyph's top left corner.
 */
function openingInk(loaded: Loaded, recorder: Recorder): [number, number][] {
  const left = columnAt(loaded, 0)
  return recorder.rects
    .filter(({ fill, x, y }) => fill === 'ink' && x < left + track.GLYPH && y < track.TRACK.top + track.GLYPH)
    .map(({ x, y }) => [x - left, y - track.TRACK.top])
}

/**
 * Reads the top of each dark square drawn in the columns from cursor `from` up
 * to cursor `to`.
 */
function topsAcross(from: number, loaded: Loaded, recorder: Recorder, to: number): number[] {
  const [left, right] = [columnAt(loaded, from), columnAt(loaded, to)]
  return darkSquares(recorder).filter(({ x }) => x >= left && x < right).map(({ y }) => y)
}

describe('drawTrack', () => {
  const loaded = new Loaded(EXAMPLES.match)
  const shared = loaded.shared!
  const match  = drawn(loaded)

  it('clears the whole track before drawing', () => {
    expect(match.cleared).toEqual([0, 0, track.trackWidth(loaded), track.TRACK_HEIGHT])
  })

  it('numbers every tenth ply above its column', () => {
    const numbers = match.texts.filter(({ fill }) => fill === 'quiet')
    expect(numbers.map(({ text }) => text))
      .toEqual(Array.from({ length: Math.floor(loaded.last / 10) + 1 }, (_, at) => String(at * 10)))
    expect(numbers[1]).toMatchObject({ x: columnAt(loaded, 10), y: track.TRACK.top - 8 })
  })

  it('names where the two meet and part under their columns in the run’s color', () => {
    expect(match.texts.filter(({ fill }) => fill === 'run').map(({ text, x }) => [text, x]))
      .toEqual([['MEET', columnAt(loaded, shared.meet)], ['PART', columnAt(loaded, loaded.partAt!)]])
  })

  it('marks each ply a game holds no position at with a dot, and each differing pair with a rule', () => {
    const rules = match.rects.filter(({ fill }) => fill === 'rule')
    const dots  = loaded.last - EXAMPLES.match.stored!.moves.length
    const pairs = loaded.last - loaded.first + 1 - dots - shared.length
    expect(rules.filter(({ w }) => w === 2)).toHaveLength(dots)
    expect(rules.filter(({ w }) => w === 1)).toHaveLength(pairs)
  })

  it('underlines each differing glyph in its game’s color', () => {
    const lines = loaded.last - loaded.first + 1 - shared.length
    expect(match.rects.filter(({ fill }) => fill === 'submitted')).toHaveLength(lines)
  })

  it('draws each glyph from Black’s side turned about its middle', () => {
    const across = track.GLYPH - track.TRACK.cell + 1
    const turned = openingInk(loaded, drawn(loaded, 'black')).map(([x, y]) => [across - x, across - y])
    expect(turned.toSorted()).toEqual(openingInk(loaded, match).toSorted())
  })
})

describe('drawTrack across the run the two share', () => {
  const loaded = new Loaded(EXAMPLES.match)
  const shared = loaded.shared!
  const match  = drawn(loaded)

  it('tints every column the two share and draws its position once, midway between the two rows', () => {
    const tops = topsAcross(shared.meet, loaded, match, shared.last + 1)
    expect(match.rects.filter(({ fill }) => fill === 'tint').map(({ x }) => x + 4))
      .toEqual(Array.from({ length: shared.length }, (_, at) => columnAt(loaded, shared.meet + at)))
    expect(match.rects.filter(({ fill }) => fill === 'run')).toHaveLength(0)
    expect([Math.min(...tops), Math.max(...tops)])
      .toEqual([track.ROWS.shared, track.ROWS.shared + track.GLYPH - track.TRACK.cell])
  })

  it('draws a glyph in each row of a column the two do not share, and one glyph in a column they do', () => {
    const dots  = loaded.last - EXAMPLES.match.stored!.moves.length
    const apart = loaded.last - loaded.first + 1 - shared.length
    expect(darkSquares(match)).toHaveLength(32 * (apart * 2 - dots + shared.length))
  })
})

describe('drawTrack with nothing matched', () => {
  it('says in the stored row that nothing matched, and names no meeting', () => {
    const alone = new Loaded(EXAMPLES.alone)
    const texts = drawn(alone).texts
    expect(texts.at(-1))
      .toMatchObject({ fill: 'quiet', text: 'No stored game shares a position with this game.' })
    expect(texts.some(({ text }) => text === 'MEET')).toBe(false)
  })
})

describe('headOf', () => {
  it('stands the head over both rows, a column wide and 6 past the glyphs', () => {
    expect(track.headOf(new Loaded(EXAMPLES.match))).toEqual({ height: 114, top: 14, width: 50 })
  })

  it('stands the head over the submitted row alone where no stored game matched', () => {
    expect(track.headOf(new Loaded(EXAMPLES.alone))).toEqual({ height: 52, top: 14, width: 50 })
  })
})

describe('plyUnder', () => {
  const loaded = new Loaded(EXAMPLES.match)

  it.each([
    [-20, loaded.first],
    [0, loaded.first],
    [track.TRACK.column * 3 + 1, loaded.first + 3],
    [1e6, loaded.last]
  ])('reads the ply under %d pixels from the left, held to the cursor’s range', (x, ply) => {
    expect(track.plyUnder(loaded, x)).toBe(ply)
  })
})

describe('trackWidth', () => {
  it('reads one column for each ply of the cursor’s range', () => {
    const loaded = new Loaded(EXAMPLES.match)
    expect(track.trackWidth(loaded)).toBe((loaded.last - loaded.first + 1) * track.TRACK.column)
  })
})
