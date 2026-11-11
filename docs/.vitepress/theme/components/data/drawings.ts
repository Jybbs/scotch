import { clamp }        from '@vueuse/core'
import { type VNode, h } from 'vue'

import * as axes      from '../../../lib/data/axes.ts'
import * as files     from '../../../lib/data/files.ts'
import { tenth }      from '../../../lib/data/numbers.ts'

/**
 * What every drawing reads to draw its marks: the entries, the one the card
 * shows, the query the find field holds, the drawing's size, and the call that
 * moves the card to another entry.
 */
export interface Drawing {
  at      : files.Entry | undefined
  entries : readonly files.Entry[]
  focus   : (entry: files.Entry) => void
  height  : number
  query   : string
  width   : number
}

/**
 * A drawing's marks in the order the arrow keys step through them, beside the
 * nodes it draws.
 */
export interface Drawn {
  marks : files.Entry[]
  nodes : VNode[]
}

/**
 * The Openings drawing's three levels from the top, each at its height with the
 * share of its hue its bands take, the files alternating between two.
 */
const LEVELS = [
  { level: 'firsts', opacity: 0.42, tall: 24, top: 6 },
  { level: 'replies', opacity: 0.24, tall: 24, top: 34 }
] as const

/**
 * Draws a file's label rotated down its band, cut to the characters the band's
 * height holds, and only where the band is wide enough to read it.
 */
function fileLabel(band: axes.Band, left: number, tall: number, width: number): VNode | null {
  const room = Math.floor((tall - 8) / 5.9)
  const stem = band.label.length > room ? `${band.label.slice(0, room - 1)}…` : band.label
  if (width <= 11) return null
  const x    = tenth(left + 4)
  return h('text', { dy: '-.2em', transform: `rotate(90 ${x} 66)`, x, y: 66 }, stem)
}

/**
 * Draws the bands of each first move and each reply, each named where it is
 * wide enough to read, opening on a press and moving the card to the busiest
 * file beneath it as a pointer rests on it.
 */
function levelBands(
  bands   : axes.Bands,
  domain  : readonly [number, number],
  drawing : Drawing,
  zoom    : (band: axes.Band) => void
): VNode[] {
  const lead = (band: axes.Band): files.Entry | undefined =>
    bands.files.find(file => file.parent === band || file.parent?.parent === band)?.entry

  return LEVELS.flatMap(({ level, opacity, tall, top }) => bands[level].map(band => {
    const [left, wide] = spanOf(band, domain, drawing.width)
    const entry        = lead(band)
    return h('g', {
      class          : 'sc-data-band',
      onClick        : () => zoom(band),
      onPointerenter : () => { if (entry) drawing.focus(entry) }
    }, [
      h('rect', {
        fill           : files.HUES.Openings,
        'fill-opacity' : opacity,
        height         : tall,
        rx             : 2,
        width          : tenth(wide),
        x              : tenth(left),
        y              : top
      }),
      wide > band.label.length * 6.6 + 10
        ? h('text', { class: 'sc-data-band-name', x: tenth(left + 5), y: top + 15.5 }, band.label)
        : null
    ])
  }))
}

/**
 * Draws one mark, dimmed where the find field's query passes over its entry and
 * ringed where the card shows it, lifted into place as the drawing unfolds.
 */
function mark(
  drawing : Drawing,
  entry   : files.Entry,
  shape   : string,
  attrs   : Record<string, unknown>,
  motion  : { delay: number, opacity: number, rise: number }
): VNode {
  return h(shape, {
    class          : ['sc-data-mark', {
      'sc-data-at'  : entry === drawing.at,
      'sc-data-dim' : !files.matches(entry, drawing.query)
    }],
    fill           : files.HUES[entry.section],
    onPointerenter : () => drawing.focus(entry),
    style          : {
      '--sc-data-a'    : motion.opacity,
      '--sc-data-from' : `${tenth(motion.rise)}px`,
      '--sc-data-i'    : motion.delay
    },
    ...attrs
  })
}

/**
 * Reads the left edge and the width of `band` across the drawing, for the
 * stretch `domain` shows, each edge held inside the drawing's sides.
 */
function spanOf(band: axes.Band, domain: readonly [number, number], width: number): [number, number] {
  const edge = (at: number): number => clamp(axes.bandX(domain, width, at), 14, width - 14)
  const left = edge(band.from)
  return [left, Math.max(0, edge(band.to) - left - 0.75)]
}

/**
 * Draws the year axis the Players and Events drawings stand on, a tick at each
 * decade, a longer one at each half century, and the half centuries named.
 */
function yearAxis(width: number, y: number, years: axes.Years): VNode[] {
  const x       = (year: number): number => Math.round(axes.yearX(width, years, year)) + 0.5
  const count   = Math.floor((years[1] - years[0]) / 10)
  const decades = Array.from({ length: count }, (_, step) => years[0] + 5 + step * 10)
  const tick    = (decade: number): VNode => h('line', {
    class : 'sc-data-files-axis',
    x1    : x(decade),
    x2    : x(decade),
    y1    : y,
    y2    : y + (decade % 50 ? 3 : 6)
  })
  const named   = (year: number): VNode =>
    h('text', { 'text-anchor': 'middle', x: tenth(axes.yearX(width, years, year)), y: y + 17 }, String(year))

  return [
    h('line', { class: 'sc-data-files-axis', x1: 14, x2: width - 14, y1: y + 0.5, y2: y + 0.5 }),
    ...decades.map(decade => tick(decade)),
    ...axes.namedYears(years).map(year => named(year))
  ]
}

/**
 * Draws every Events file as a brick in its year, each shaded by the heading
 * it is listed under, over the year axis.
 */
export function eventsDrawing(drawing: Drawing, years: axes.Years): Drawn {
  const events = files.sectionOf(drawing.entries, 'Events')
  const laid   = axes.bricks(events, drawing.height, drawing.width, years)

  return {
    marks : laid.map(brick => brick.entry),
    nodes : [
      ...yearAxis(drawing.width, drawing.height - 26, years),
      ...laid.map(({ box, delay, entry, rise, shade }) => mark(drawing, entry, 'rect', {
        height : tenth(box.height),
        width  : tenth(box.width),
        x      : tenth(box.x),
        y      : tenth(box.y)
      }, { delay, opacity: shade, rise }))
    ]
  }
}

/**
 * Draws the Openings as bands across the stretch `domain` shows, each first
 * move and each reply a band a press opens, each file a mark beneath its reply,
 * and beneath them the trail naming the stretch.
 */
export function openingsDrawing(
  bands   : axes.Bands,
  domain  : readonly [number, number],
  drawing : Drawing,
  zoom    : (band: axes.Band) => void
): Drawn {
  const { height, width } = drawing
  const tall   = height - 92
  const marked = bands.files.map((band, place) => {
    const [left, wide] = spanOf(band, domain, width)
    return h('g', [
      mark(drawing, band.entry!, 'rect', { height: tall, rx: 2, width: tenth(wide), x: tenth(left), y: 62 }, {
        delay   : Math.round(left / width * 900),
        opacity : place % 2 ? 0.55 : 0.8,
        rise    : 12
      }),
      fileLabel(band, left, tall, wide)
    ])
  })
  const opened = domain[1] - domain[0] < bands.total
  const trail  = axes.trail(bands, domain) + (opened ? '   ·   press the open band to step back' : '')

  return {
    marks : bands.files.map(band => band.entry!),
    nodes : [
      ...levelBands(bands, domain, drawing, zoom),
      ...marked,
      h('text', { x: 14, y: height - 10 }, trail)
    ]
  }
}

/**
 * Draws every Players archive as a disc at the mean year of its games, sized
 * by the games the store holds, over the year axis.
 */
export function playersDrawing(drawing: Drawing, years: axes.Years): Drawn {
  const players = files.sectionOf(drawing.entries, 'Players')
  const laid    = axes.swarm(drawing.height, players, drawing.width, years)

  return {
    marks : laid.map(disc => disc.entry),
    nodes : [
      ...yearAxis(drawing.width, drawing.height - 26, years),
      ...laid.map(({ box, delay, entry, rise }) => mark(drawing, entry, 'circle', {
        cx : tenth(box.x),
        cy : tenth(box.y),
        r  : tenth(box.r)
      }, { delay, opacity: 0.78, rise }))
    ]
  }
}
