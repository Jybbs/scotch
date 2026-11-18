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

/**
 * A file's line, round at its ends and its joins.
 */
const PEN = 'fill-none [stroke-linecap:round] [stroke-linejoin:round]'

/**
 * A line in a switch's spark, holding its width as the spark stretches.
 */
const SPARK = `${PEN} [vector-effect:non-scaling-stroke]`

/**
 * The chart's labels, in the code face.
 */
const LABEL = 'fill-quiet font-code text-[11px] leading-normal font-medium normal-nums'

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
    'class'      : 'block w-full overflow-visible',
    'height'     : series.CHART.height,
    'role'       : 'img',
    'viewBox'    : `0 0 ${width} ${series.CHART.height}`
  }, [
    ...drawn.rows.map(row => h('g', { style: { opacity: row.seen ? 1 : 0 } }, [
      h('line', { class: 'stroke-rule stroke-1', x1: series.CHART.left, x2: width, y1: row.y, y2: row.y }),
      h('text', { class: LABEL, x: 0, y: row.y - 3 }, counted(row.label))
    ])),
    ...drawn.axis.map(tick => h('text', {
      'class'       : LABEL,
      'text-anchor' : tick.anchor,
      'x'           : tick.x,
      'y'           : series.CHART.height - 4
    }, String(tick.label))),
    ...drawn.ds.map((d, index) => line(lines, d, index, `${PEN} [stroke-width:2.25]`, lines.weights.value[index]!)),
    column < 0
      ? null
      : h('line', {
        class : 'stroke-ink stroke-1 opacity-55',
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
    'class'               : 'mt-[3px] mb-0.5 block h-10 w-full overflow-visible',
    'preserveAspectRatio' : 'none',
    'viewBox'             : '0 0 100 40'
  }, [
    ...SPARKS.flatMap((d, other) => other === index ? [] : [h('path', { class: `${SPARK} stroke-rule stroke-1`, d })]),
    line(lines, SPARKS[index]!, index, `${SPARK} [stroke-width:2]`)
  ])
}

function switches(lines: Lines, column: number): VNode {
  return h('div', {
    class: 'grid grid-cols-5 gap-x-1.5 gap-y-2 in-data-narrow:grid-cols-6'
  }, series.FILES.map((file, index) => h('button', {
    'aria-label'   : `${file.name}, ${file.token}, ${file.hex}`,
    'aria-pressed' : String(lines.on.value[index]),
    'class'        : [
      'relative grid min-w-0 content-start gap-px pt-[9px] text-left transition-[opacity]',
      'in-data-narrow:col-span-2 in-data-narrow:nth-[n+4]:col-span-3',
      'before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-(--sc-ref-color)',
      'before:[box-shadow:inset_0_0_0_1px_var(--sc-ref-color)] before:transition-[background-color]',
      'aria-[pressed=false]:opacity-62 aria-[pressed=false]:before:bg-transparent'
    ],
    'onClick'      : () => {
      lines.toggle(index)
    },
    'style'        : { '--sc-ref-color': file.hex },
    'type'         : 'button'
  }, [
    h('b', {
      class: 'font-display text-[0.95rem]/[1.25] font-normal whitespace-nowrap normal-nums '
           + 'in-aria-[pressed=false]:line-through'
    }, file.name),
    h('code', {
      class: 'bg-transparent! p-0! font-code text-[0.625rem]/[1.45]! font-medium whitespace-nowrap '
           + 'text-quiet! normal-nums'
    }, file.hex),
    spark(lines, index),
    h('em', {
      class: 'p-0 font-code text-[0.69rem]/[1.45] font-medium whitespace-nowrap text-ink not-italic normal-nums'
    }, figure(file, column))
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
        class          : 'relative touch-pan-y',
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
