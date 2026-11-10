import { clamp }                                                       from '@vueuse/core'
import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart }               from '../../../lib/data/chart.ts'
import { counted }                         from '../../../lib/data/numbers.ts'
import { DURATIONS }                         from '../../../lib/motion/timing.ts'
import { narrowAt }                          from '../../../lib/reference/pick.ts'
import * as series                           from '../../../lib/reference/series.ts'
import { type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { stage }                             from './parts.ts'

/**
 * Which lines are on, how far each has been drawn, and how much of each is
 * shown, beside the call that switches a line.
 */
interface Lines {
  on      : ShallowRef<boolean[]>
  pen     : ShallowRef<number[]>
  toggle  : (index: number) => void
  weights : ShallowRef<number[]>
}

const SPARKS = series.sparksOf()
const TOGGLES: readonly (readonly [number, number])[] = [[3900, 4], [4900, 3], [5900, 4], [6500, 3]]

function figure(file: series.File, column: number): string {
  return column < 0
    ? `${counted(file.games)} games`
    : `${counted(file.counts[column]!)} · ${series.DECADES[column]!}s`
}

/**
 * Holds the state of the lines and runs the unfold on `chart`.
 */
function useLines(chart: NodeRef): Lines {
  const on      = shallowRef(series.FILES.map(() => true))
  const weights = shallowRef(series.FILES.map(() => 1))
  const pen     = shallowRef(series.FILES.map(() => 1))
  const beats   = useBeats()

  const toggle = (index: number): void => {
    const from = weights.value
    on.value   = on.value.with(index, !on.value[index])
    beats.glide(DURATIONS.settle, eased => {
      weights.value = from.map((weight, place) => weight + (Number(on.value[place]) - weight) * eased)
    })
  }

  useUnfold(chart, beats, {
    length : 7600,
    play   : (time, done) => {
      series.FILES.forEach((_, index) => {
        time.tween(780, eased => {
          pen.value = pen.value.with(index, eased)
        }, { delay: index * 620 })
      })
      TOGGLES.forEach(([at, index]) => {
        time.at(at, () => {
          toggle(index)
        })
      })
      time.at(7100, done)
    },
    prime  : () => {
      on.value      = series.FILES.map(() => true)
      pen.value     = series.FILES.map(() => 0)
      weights.value = series.FILES.map(() => 1)
    },
    settle : () => {
      pen.value     = series.FILES.map(() => 1)
      weights.value = on.value.map(Number)
    }
  })

  return { on, pen, toggle, weights }
}

function line(lines: Lines, d: string, index: number, klass: string, opacity = 1): VNode {
  const drawn = lines.pen.value[index]!
  return h('path', {
    class      : klass,
    d          : d,
    pathLength : 1,
    stroke     : series.FILES[index]!.hex,
    style      : { opacity, ...drawn < 1 && { strokeDasharray: '1', strokeDashoffset: 1 - drawn } }
  })
}

function plot(lines: Lines, column: number, width: number): VNode {
  const drawn = series.linesAt(width, lines.weights.value)
  return h('svg', {
    'aria-label' : 'Games by decade, one line per player file',
    'height'     : series.CHART.height,
    'role'       : 'img',
    'viewBox'    : `0 0 ${width} ${series.CHART.height}`
  }, [
    ...drawn.rows.map(row => h('g', { style: { opacity: row.seen ? 1 : 0 } }, [
      h('line', { class: 'sc-ref-row', x1: series.CHART.left, x2: width, y1: row.y, y2: row.y }),
      h('text', { x: 0, y: row.y - 3 }, counted(row.label))
    ])),
    ...drawn.axis.map(tick => h('text', { 'text-anchor': tick.anchor, 'x': tick.x, 'y': series.CHART.height - 4 }, String(tick.label))),
    ...drawn.ds.map((d, index) => line(lines, d, index, 'sc-ref-trace', lines.weights.value[index]!)),
    column < 0
      ? null
      : h('line', {
        class : 'sc-ref-hair',
        x1    : drawn.xs(column),
        x2    : drawn.xs(column),
        y1    : series.CHART.top,
        y2    : series.CHART.height - series.CHART.foot
      })
  ])
}

function spark(lines: Lines, index: number): VNode {
  return h('svg', {
    'aria-hidden'         : 'true',
    'preserveAspectRatio' : 'none',
    'viewBox'             : '0 0 100 40'
  }, [
    ...SPARKS.flatMap((d, other) => other === index ? [] : [h('path', { class: 'sc-ref-other', d })]),
    line(lines, SPARKS[index]!, index, 'sc-ref-spark')
  ])
}

function switches(lines: Lines, column: number): VNode {
  return h('div', { class: 'sc-ref-switches' }, series.FILES.map((file, index) => h('button', {
    'aria-label'   : `${file.name}, ${file.token}, ${file.hex}`,
    'aria-pressed' : String(lines.on.value[index]),
    'class'        : 'sc-ref-switch',
    'onClick'      : () => {
      lines.toggle(index)
    },
    'style'        : { '--sc-ref-color': file.hex },
    'type'         : 'button'
  }, [
    h('b', file.name),
    h('code', file.hex),
    spark(lines, index),
    h('em', figure(file, column))
  ])))
}

/**
 * The chart series as lines over the decades, one to a player file, a reader
 * switching each on and off beneath the chart and reading any decade off the
 * line under the pointer.
 */
export const Series = defineComponent({
  name  : 'ReferenceSeries',
  setup : () => {
    const { chart, layout, sized } = useChart(narrowAt)
    const column                   = shallowRef(-1)
    const lines                    = useLines(chart)

    return () => stage(chart, layout.value.narrow, [
      h('div', {
        class          : 'sc-ref-chart',
        onPointerleave : () => {
          column.value = -1
        },
        onPointermove  : (event: PointerEvent) => {
          const { left, right } = series.CHART
          const share           = (pointerAt(event).x - left) / (layout.value.width - left - right)
          column.value          = clamp(Math.round(share * (series.DECADES.length - 1)), 0, series.DECADES.length - 1)
        },
        style          : { height: `${series.CHART.height}px` }
      }, sized.value ? plot(lines, column.value, layout.value.width) : undefined),
      switches(lines, column.value)
    ])
  }
})
