import { type VNode, h } from 'vue'

import * as flow          from '../../../lib/data/flow.ts'
import { counted, tenth } from '../../../lib/data/numbers.ts'
import { TAGS }           from '../../../lib/data/tags.ts'
import * as tie           from '../../../lib/data/tie.ts'

/**
 * The calls a part of the figure makes once a reader points at it, presses it,
 * or moves the focus onto it.
 */
type Calls = (focus: tie.Focus) => Record<string, () => void>

/**
 * Draws one label of the figure in the code face, in the ink where it is
 * `strong`, in the page's color where it lies `over` the band, and in a bold
 * figure where it is `pinned`.
 */
function label(text: string, x: number, y: number, tone = '', anchor = 'start'): VNode {
  return h('text', {
    'class'       : ['sc-data-tie-label', tone && `sc-data-tie-${tone}`],
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
  return h('g', { class: ['sc-data-tie-band', { 'sc-data-off': lit.kind !== 0 }] }, [
    ...band.bars.map((bar, at) => h('g', {
      class: ['sc-data-tie-bin', { 'sc-data-off': (lit.bin ?? pinned ?? at) !== at }],
      ...calls({ at, by: 'bin' })
    }, [
      h('rect', {
        class  : 'sc-data-tie-hit',
        height : tenth(layout.both),
        width  : tenth(bar.width),
        x      : tenth(bar.column),
        y      : layout.top
      }),
      h('rect', {
        class  : 'sc-data-tie-bar',
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
    return h('g', { class: ['sc-data-tie-path', { 'sc-data-on': lit.games.includes(game) }] }, [
      h('path', { class: 'sc-data-tie-halo', d }),
      h('path', { class: 'sc-data-tie-line', d }),
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
      'class'      : ['sc-data-tie-pin', { 'sc-data-off': lit.kind !== 0, 'sc-data-on': shown }],
      'role'       : 'button',
      'tabindex'   : 0,
      ...calls({ at: game.place - 1, by: 'game' })
    }, [
      h('line', { x1: tenth(x), x2: tenth(x), y1: tenth(y), y2: tenth(band.foot) }),
      h('circle', { cx: tenth(x), cy: tenth(y) }),
      label(String(game.place), x, y + 3.2, 'pinned', 'middle')
    ])
  })
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
    'class'      : 'sc-data-svg sc-data-tie-svg',
    'height'     : layout.height,
    'role'       : 'img',
    'viewBox'    : `0 0 ${plot} ${layout.height}`,
    'width'      : plot
  }, [
    h('rect', { class: 'sc-data-tie-end', height: tall, width: stub, x: 0, y: top }),
    ...layout.lanes.map((lane, at) => h('path', {
      'class'  : ['sc-data-tie-ribbon', { 'sc-data-off': lit.kind !== at }],
      'd'      : flow.ribbonOf(lane),
      'data-k' : at,
      ...calls({ at, by: 'kind' })
    })),
    meanBand(band, calls, layout, lit),
    ...layout.lanes.map(lane => h('rect', {
      class  : 'sc-data-tie-end',
      height : tenth(Math.max(1.5, lane.at(-1)![2] - lane.at(-1)![1])),
      width  : stub,
      x      : plot - stub,
      y      : tenth(lane.at(-1)![1])
    })),
    h('line', {
      class : 'sc-data-tie-test',
      x1    : tenth(x1),
      x2    : tenth(x1),
      y1    : top - 6,
      y2    : tenth(top + tall + gap + 4)
    }),
    h('line', {
      class : 'sc-data-tie-test',
      x1    : tenth(x2),
      x2    : tenth(x2),
      y1    : tenth(top + both + gap - 8),
      y2    : top + tall + 2 * gap + 4
    }),
    label(`Every stored game · ${counted(TAGS.every.games)}`, 0, 10),
    label('1 · Both ratings?', x1 + 6, top - 8, 'strong'),
    label(second, x2 + 6, top + both + gap - 8, 'strong'),
    ...paths(band, layout, lit),
    ...pins(band, calls, lit)
  ])
}
