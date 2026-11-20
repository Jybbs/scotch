import { type VNode, h } from 'vue'

import * as flow          from '../../../lib/data/flow.ts'
import { counted, tenth } from '../../../lib/data/numbers.ts'
import { TAGS }           from '../../../lib/data/tags.ts'
import * as tie           from '../../../lib/data/tie.ts'
import * as parts         from './parts.ts'

/**
 * The calls a part of the figure makes once a reader points at it, presses it,
 * or moves the focus onto it.
 */
type Calls = (focus: tie.Focus) => Record<string, () => void>

/**
 * The end of a lane, and the source every lane leaves.
 */
const END = 'fill-(--sc-data-ink)'
/**
 * Each tone of label the figure draws, in the code face.
 */
const LABELS = {
  over   : 'pointer-events-none fill-(--sc-data-page) font-code text-[8.5px] font-medium tracking-[0.12em] '
         + 'tabular-nums uppercase',
  pinned : 'pointer-events-none fill-(--sc-data-ink) font-code text-[9px] font-bold tracking-[0] '
         + 'tabular-nums uppercase',
  plain  : 'fill-(--sc-data-quiet) font-code text-[8.5px] font-medium tracking-[0.12em] tabular-nums '
         + 'uppercase',
  strong : 'fill-(--sc-data-ink) font-code text-[9.5px] font-bold tracking-[0.08em] tabular-nums uppercase'
} as const
/**
 * The fill of each rating kind's ribbon, the games carrying both ratings in the
 * link's color.
 */
const LANE = 'data-off:opacity-26 data-[k=0]:fill-(--sc-data-link) '
           + 'data-[k=1]:fill-[color-mix(in_oklab,var(--sc-data-ink)_60%,var(--sc-data-page))] '
           + 'data-[k=2]:fill-[color-mix(in_oklab,var(--sc-data-ink)_22%,var(--sc-data-page))]'
/**
 * One of the order's two tests, ruled down the figure.
 */
const TEST = 'stroke-(--sc-data-ink) stroke-1 [stroke-dasharray:3_3]'

/**
 * Draws one label of the figure in the code face, in the ink where it is
 * `strong`, in the page's color where it lies `over` the band, and in a bold
 * figure where it is `pinned`.
 */
function label(
  text   : string,
  x      : number,
  y      : number,
  tone   : keyof typeof LABELS = 'plain',
  anchor : string              = 'start'
): VNode {
  return h('text', {
    'class'       : LABELS[tone],
    'text-anchor' : anchor,
    'x'           : tenth(x),
    'y'           : tenth(y)
  }, text)
}

/**
 * Draws the band carrying both ratings: a bar per bin, each a column a pointer
 * or a press reads, the means labeled beneath them, and the band's name.
 */
function meanBand(band: flow.Band, calls: Calls, layout: flow.FlowLayout, lit: tie.Lit): VNode {
  const pinned = lit.game?.rated === 2 ? tie.binOf(lit.game) : null
  return h('g', {
    'class'    : [parts.FADE, 'data-off:opacity-26'],
    'data-off' : lit.kind === 0 ? undefined : ''
  }, [
    ...band.bars.map((bar, at) => h('g', {
      'class'    : [parts.FADE, 'cursor-pointer data-off:opacity-40'],
      'data-off' : (lit.bin ?? pinned ?? at) === at ? undefined : '',
      ...calls({ at, by: 'bin' })
    }, [
      h('rect', {
        class  : 'fill-transparent',
        height : tenth(layout.both),
        width  : tenth(bar.width),
        x      : tenth(bar.column),
        y      : layout.top
      }),
      h('rect', {
        class  : 'fill-[color-mix(in_oklab,var(--sc-data-page)_62%,var(--sc-data-link))]',
        height : tenth(bar.height),
        rx     : 1,
        width  : tenth(bar.width - 2),
        x      : tenth(bar.column + 1),
        y      : tenth(bar.y)
      })
    ])),
    ...band.ticks.map(([x, mean]) => label(String(mean), x, band.foot + 11, 'over', 'middle')),
    label('By the mean of the two →', band.left, layout.top + 13, 'over')
  ])
}

/**
 * Draws the path of each tied game through its lane, a halo beneath its line
 * and a dot at either end, shown where the focus lights the game.
 */
function paths(band: flow.Band, layout: flow.FlowLayout, lit: tie.Lit): VNode[] {
  return tie.tiedGames.map(game => {
    const { d, ends: [start, end] } = flow.pathOf(band, game, layout)
    return h('g', {
      'class'   : [
        parts.FADE, 'pointer-events-none opacity-0 data-on:opacity-100 [&_circle]:fill-(--sc-data-ink)',
        '[&_circle]:stroke-(--sc-data-page) [&_circle]:stroke-[1.5]'
      ],
      'data-on' : lit.games.includes(game) ? '' : undefined
    }, [
      h('path', {
        class : 'fill-none stroke-(--sc-data-page) stroke-[4.5] opacity-85 [stroke-linecap:round]',
        d     : d
      }),
      h('path', { class: 'fill-none stroke-(--sc-data-ink) stroke-[1.75] [stroke-linecap:round]', d }),
      h('circle', { cx: layout.stub + 3, cy: tenth(start![1]), r: 3 }),
      h('circle', { cx: tenth(end![0] - 3), cy: tenth(end![1]), r: 3.5 })
    ])
  })
}

/**
 * Draws each tied game carrying both ratings as a pin above the bars at its
 * mean, a control lighting that game.
 */
function pins(band: flow.Band, calls: Calls, lit: tie.Lit): VNode[] {
  return tie.ratingKinds[0]!.games.map((game, at) => {
    const [x, y] = band.pins[at]!
    const shown  = lit.games.includes(game)
    return h('g', {
      'aria-label' : `Place ${game.place}, ${game.name}, a mean of ${game.key}`,
      'class'      : [parts.FADE, 'group/pin cursor-pointer outline-none data-off:opacity-30'],
      'data-off'   : lit.kind === 0 ? undefined : '',
      'data-on'    : shown ? '' : undefined,
      'role'       : 'button',
      'tabindex'   : 0,
      ...calls({ at: game.place - 1, by: 'game' })
    }, [
      h('line', {
        class : 'stroke-(--sc-data-page) stroke-1 opacity-75 transition-[stroke-width,opacity] '
              + 'duration-settle ease-glide group-data-on/pin:stroke-2 group-data-on/pin:opacity-100',
        x1    : tenth(x),
        x2    : tenth(x),
        y1    : tenth(y),
        y2    : tenth(band.foot)
      }),
      h('circle', {
        class : 'fill-(--sc-data-page) stroke-(--sc-data-ink) stroke-1 transition-[r,stroke-width] '
              + 'duration-settle ease-glide [r:8px] group-focus-visible/pin:stroke-(--sc-data-link) '
              + 'group-focus-visible/pin:stroke-[2.5] group-data-on/pin:stroke-[2.5] '
              + 'group-data-on/pin:[r:9.5px]',
        cx    : tenth(x),
        cy    : tenth(y)
      }),
      label(String(game.place), x, y + 3.2, 'pinned', 'middle')
    ])
  })
}

/**
 * Draws the dashed rule of a test at `x`, from `y1` down to `y2`.
 */
function testRule(x: number, y1: number, y2: number): VNode {
  return h('line', { class: TEST, x1: tenth(x), x2: tenth(x), y1: y1, y2: y2 })
}

/**
 * Draws the figure of the tie order: every stored game leaving the source as
 * one lane per kind of rating through the order's two tests, the band carrying
 * both drawn by its mean, the end of each lane, the tests and their labels, the
 * path of each tied game, and the pins.
 */
export function flowDrawn(calls: Calls, layout: flow.FlowLayout, lit: tie.Lit): VNode {
  const band     = flow.bandOf(layout)
  const [x1, x2] = layout.tests
  const second   = layout.narrow ? '2 · One rating?' : '2 · If not, one rating?'
  const { both, gap, plot, stub, tall, top } = layout
  return h('svg', {
    'aria-label' : 'Every stored game through the two tests of the tie order, each branch as thick as its '
                 + 'share, and the path of each tied game the figure lights',
    'class'      : parts.SVG,
    'height'     : layout.height,
    'role'       : 'img',
    'viewBox'    : `0 0 ${plot} ${layout.height}`,
    'width'      : plot
  }, [
    h('rect', { class: END, height: tall, width: stub, x: 0, y: top }),
    ...layout.lanes.map((lane, at) => h('path', {
      'class'    : [parts.FADE, LANE],
      'd'        : flow.ribbonOf(lane),
      'data-k'   : at,
      'data-off' : lit.kind === at ? undefined : '',
      ...calls({ at, by: 'kind' })
    })),
    meanBand(band, calls, layout, lit),
    ...layout.lanes.map(lane => h('rect', {
      class  : END,
      height : tenth(Math.max(1.5, lane.at(-1)![2] - lane.at(-1)![1])),
      width  : stub,
      x      : plot - stub,
      y      : tenth(lane.at(-1)![1])
    })),
    testRule(x1, top - 6, tenth(top + tall + gap + 4)),
    testRule(x2, tenth(top + both + gap - 8), top + tall + 2 * gap + 4),
    label(`Every stored game · ${counted(TAGS.every.games)}`, 0, 10),
    label('1 · Both ratings?', x1 + 6, top - 8, 'strong'),
    label(second, x2 + 6, top + both + gap - 8, 'strong'),
    ...paths(band, layout, lit),
    ...pins(band, calls, lit)
  ])
}
