import { type ShallowRef, type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import { useChart }                                      from '../../../lib/data/chart.ts'
import { DURATIONS }                                     from '../../../lib/motion/timing.ts'
import * as plan                                         from '../../../lib/reference/construction.ts'
import { MARKS }                                         from '../../../lib/reference/marks.ts'
import { narrowAt }                                      from '../../../lib/reference/pick.ts'
import { type Beats, type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { stacked, stage, stepper }                       from './parts.ts'

/**
 * Where the drawing stands, each length's place, the outline's progress, and the
 * pen tracing it, beside the call that draws a length.
 */
interface Drafting {
  at      : ShallowRef<number>
  dash    : ShallowRef<number>
  draw    : (index: number) => void
  faint   : ShallowRef<boolean>
  first   : ShallowRef<SVGPathElement | null>
  named   : ShallowRef<boolean>
  nib     : ShallowRef<{ x: number, y: number } | null>
  outline : ShallowRef<number>
  rise    : ShallowRef<number>
}

const [X, Y, W, H] = MARKS.mark.view as unknown as readonly [number, number, number, number]
const GUIDES       = MARKS.guides
const LAST         = GUIDES.length - 1
const NAMES        = GUIDES.map(item => `${item.length} units`)

/**
 * Traces the outline with the pen, raises the fill behind it, and then draws
 * each length in turn.
 */
function unfold(state: Drafting, time: Beats, done: () => void): void {
  const total = state.first.value!.getTotalLength()
  time.tween(1500, (_, share) => {
    const { x, y }      = state.first.value!.getPointAtLength(total * share)
    state.nib.value     = { x, y }
    state.outline.value = share
  }, { done: () => {
    state.nib.value = null
  }, ease: share => share })
  time.tween(800, eased => {
    state.rise.value = eased
  }, { delay: 1450 })
  time.at(2500, () => {
    state.faint.value = true
  })
  GUIDES.forEach((_, index) => {
    time.at(2800 + index * 1000, () => {
      state.draw(index)
    })
  })
  time.at(2800 + GUIDES.length * 1000, done)
}

/**
 * Holds the drawing's state and runs its unfold on `chart`.
 */
function useDrafting(chart: NodeRef): Drafting {
  const beats = useBeats()
  const state = {
    at      : shallowRef(LAST),
    dash    : shallowRef(1),
    faint   : shallowRef(true),
    first   : shallowRef<SVGPathElement | null>(null),
    named   : shallowRef(true),
    nib     : shallowRef<{ x: number, y: number } | null>(null),
    outline : shallowRef(1),
    rise    : shallowRef(1)
  }

  const draw = (index: number): void => {
    state.at.value    = index
    state.named.value = true
    beats.glide(DURATIONS.settle + 120, eased => {
      state.dash.value = eased
    })
  }
  const stand = (drawn: boolean): void => {
    state.at.value      = drawn ? LAST : 0
    state.dash.value    = Number(drawn)
    state.faint.value   = drawn
    state.named.value   = drawn
    state.nib.value     = null
    state.outline.value = Number(drawn)
    state.rise.value    = Number(drawn)
  }

  useUnfold(chart, beats, {
    length : 12_800,
    play   : (time, done) => {
      unfold({ ...state, draw }, time, done)
    },
    prime  : () => {
      stand(false)
    },
    settle : () => {
      stand(true)
    }
  })

  return { ...state, draw }
}

function guide(state: Drafting, index: number): VNode {
  const item  = GUIDES[index]!
  const at    = state.at.value
  const place = index === at ? 'now' : 'seen'
  const shown = !state.named.value || index > at ? 'next' : place
  const d     = plan.guidePath(item as Parameters<typeof plan.guidePath>[0])
  return h('g', { 'class': 'sc-ref-guide', 'data-state': shown }, [
    h('path', { class: 'sc-ref-halo-line', d }),
    h('path', { 'd': d, 'pathLength': 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': shown === 'now' ? 1 - state.dash.value : 0 }),
    h('text', { 'text-anchor': item.anchor, 'x': item.label[0], 'y': item.label[1] }, String(item.length))
  ])
}

/**
 * Draws one subpath's outline, lit while the length on show measures it.
 */
function outlineOf(state: Drafting, d: string, index: number): VNode {
  const lit = state.named.value && GUIDES[state.at.value]!.owners.includes(index)
  return h('path', {
    'class'             : 'sc-ref-out',
    'd'                 : d,
    'pathLength'        : 1,
    'ref'               : index === 0 ? state.first : undefined,
    'stroke-dasharray'  : '1 1',
    'stroke-dashoffset' : 1 - state.outline.value,
    'style'             : state.named.value ? { opacity: lit ? 1 : 0.28, strokeWidth: lit ? '7px' : '3px' } : undefined
  })
}

function defs(id: string, rise: number): VNode {
  return h('defs', [
    h('pattern', { height: 200, id: `${id}-board`, patternUnits: 'userSpaceOnUse', width: 200 }, [
      h('rect', { 'fill': 'var(--sc-rule)', 'fill-opacity': 0.22, 'height': 100, 'width': 100 }),
      h('rect', { 'fill': 'var(--sc-rule)', 'fill-opacity': 0.22, 'height': 100, 'width': 100, 'x': 100, 'y': 100 })
    ]),
    h('clipPath', { id: `${id}-rise` }, h('rect', { height: 960 * rise, width: 900, x: -100, y: 60 - 960 * rise }))
  ])
}

function drawing(state: Drafting, id: string): VNode {
  const nib = state.nib.value
  return h('svg', {
    'aria-label' : 'The mark with each measured length',
    'class'      : 'sc-ref-plan',
    'role'       : 'img',
    'viewBox'    : plan.PLAN
  }, [
    defs(id, state.rise.value),
    h('rect', { fill: `url(#${id}-board)`, height: H, width: W, x: X, y: Y }),
    h('rect', { class: 'sc-ref-frame', height: H, width: W, x: X, y: Y }),
    h('line', { class: 'sc-ref-base', x1: -60, x2: 700, y1: 0, y2: 0 }),
    h('path', {
      'class'     : 'sc-ref-fill',
      'clip-path' : `url(#${id}-rise)`,
      'd'         : MARKS.mark.paths[0]!,
      'fill-rule' : 'nonzero',
      'style'     : { fillOpacity: state.faint.value ? 0.14 : 1 }
    }),
    ...plan.SUBPATHS.map((d, index) => outlineOf(state, d, index)),
    nib
      ? h('rect', { class: 'sc-ref-nib', height: 18, transform: `translate(${nib.x} ${nib.y}) rotate(45)`, width: 18, x: -9, y: -9 })
      : null,
    ...GUIDES.map((_, index) => guide(state, index))
  ])
}

function beside(state: Drafting): VNode {
  const at    = state.at.value
  const named = state.named.value
  return h('div', { class: 'sc-ref-beside' }, [
    h('div', { class: 'sc-ref-figure' }, [
      h('b', String(named ? Math.round(GUIDES[at]!.length * state.dash.value) : 0)),
      stacked([
        h('div', [h('h4', 'The outline'), h('p', 'One compound path, drawn from its five subpaths')]),
        ...GUIDES.map(item => h('div', [h('h4', item.name), h('p', item.note)]))
      ], named ? at + 1 : 0)
    ]),
    h('div', { class: 'sc-ref-list' }, [
      h('i', { 'aria-hidden': 'true', 'class': 'sc-ref-slide', 'style': { transform: `translateY(${at * 25}px)` } }),
      ...GUIDES.map((item, index) => h('button', {
        'aria-label'   : `${item.name}, ${item.length}`,
        'aria-pressed' : String(named && index === at),
        'data-known'   : named && index <= at ? '' : undefined,
        'onClick'      : () => {
          state.draw(index)
        },
        'type'         : 'button'
      }, [h('small', `${index + 1}.`), h('span', item.name), h('em', String(item.length))]))
    ])
  ])
}

/**
 * The mark's construction as a plan on a board of hundred-unit squares, each
 * length measured from the tracked SVG drawn on it one at a time with its figure
 * beside it, the subpaths it measures standing out from the others.
 */
export const Construction = defineComponent({
  name  : 'ReferenceConstruction',
  setup : () => {
    const { chart, layout } = useChart(narrowAt)
    const id                = useId()
    const state             = useDrafting(chart)

    return () => stage(chart, layout.value.narrow, [
      h('div', { class: 'sc-ref-bed' }, [drawing(state, id), beside(state)]),
      stepper({ at: state.at.value, names: NAMES, pick: state.draw })
    ])
  }
})
