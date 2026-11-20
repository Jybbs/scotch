import { type ShallowRef, type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import { percent }                           from '../../../lib/data/numbers.ts'
import { useChart }                          from '../../../lib/data/chart.ts'
import { MARKS, type MarkFrame, frameAt }    from '../../../lib/reference/marks.ts'
import { narrowAt }                          from '../../../lib/reference/pick.ts'
import { type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { cardOf }                            from '../../../lib/site/routes.ts'
import { SAY, stacked, stage }               from './parts.ts'

/**
 * Where the drawing stands along its stops, beside the calls that glide it to a
 * stop and set it down at a place.
 */
interface Walk {
  glide : (goal: number) => void
  place : ShallowRef<number>
  set   : (place: number) => void
}

/**
 * The stage's height in pixels, which every stop keeps, so no stop moves the
 * sentence beneath it.
 */
const HEIGHT = 264
/**
 * Each hop of the unfold, as the stop it reaches, when it starts, and how long
 * it runs in milliseconds.
 */
const HOPS: readonly (readonly [number, number, number])[] = [[1, 300, 900], [2, 1500, 1150], [3, 3000, 900], [4, 4400, 900]]
const LAST = MARKS.stops.length - 1

/**
 * Holds the place along the stops and runs the unfold on `chart`.
 */
function useWalk(chart: NodeRef): Walk {
  const place = shallowRef(LAST)
  const beats = useBeats()

  useUnfold(chart, beats, {
    length : 6000,
    play   : (time, done) => {
      HOPS.forEach(([goal, delay, ms]) => {
        time.tween(ms, eased => {
          place.value = goal - 1 + eased
        }, { delay })
      })
      time.at(5500, done)
    },
    prime  : () => {
      place.value = 0
    },
    settle : () => {
      place.value = LAST
    }
  })

  return {
    glide: goal => {
      const from = place.value
      beats.glide(900, eased => {
        place.value = from + (goal - from) * eased
      })
    },
    place: place,
    set: at => {
      beats.halt()
      place.value = at
    }
  }
}

function drawing(id: string, frame: MarkFrame, width: number): VNode {
  const y      = HEIGHT - 14
  const middle = width / 2
  return h('svg', {
    'aria-hidden' : 'true',
    'class'       : 'absolute inset-0 size-full',
    'viewBox'     : `0 0 ${width} ${HEIGHT}`
  }, [
    h('clipPath', { id: `${id}-letters` }, h('rect', { height: 1100, width: 3000 * frame.letters, x: 600, y: -900 })),
    h('clipPath', { id: `${id}-tagline` }, h('rect', { height: 400, width: 3700 * frame.tagline, x: -120, y: 60 })),
    h('g', { class: 'fill-run', style: { opacity: 1 - frame.card }, transform: frame.transform }, [
      h('path', { 'd': MARKS.mark.paths[0]!, 'fill-rule': 'nonzero' }),
      h('path', { 'clip-path': `url(#${id}-letters)`, 'd': MARKS.wordmark.paths[1]!, 'fill-rule': 'nonzero' }),
      h('path', { 'clip-path': `url(#${id}-tagline)`, 'd': MARKS.lockup.paths[2]!, 'fill-rule': 'nonzero' })
    ]),
    h('path', {
      class : 'fill-none stroke-ink stroke-1',
      d     : `M${middle - frame.half} ${y - 4}V${y + 4}M${middle - frame.half} ${y}H${middle + frame.half}M${middle + frame.half} ${y - 4}V${y + 4}`
    })
  ])
}

function reading(place: number, frame: MarkFrame): VNode {
  const stop  = MARKS.stops[Math.round(place)]!
  const size  = frame.card > 0.5 ? `${stop.width} by ${stop.height}` : `${Math.round(frame.unitsW)} by ${Math.round(frame.unitsH)}`
  const fit   = frame.card > 0.5 ? frame.cardWide / stop.width : frame.shown
  return h('div', { class: 'absolute top-2.5 left-3' }, [
    h('b', { class: 'block font-display text-[1.25rem]/[1.15] font-normal normal-nums' }, stop.name),
    h('small', {
      class: 'block font-code text-[0.66rem]/[1.5] font-medium tracking-[0.01em] text-quiet normal-nums'
    }, `${size} px${fit < 1 ? `, shown at ${percent(fit)}` : ''}`)
  ])
}

function card(frame: MarkFrame): VNode {
  return h('img', {
    alt    : 'The link card of this page',
    class  : 'absolute top-0 left-0 h-auto max-w-none rounded-[3px]',
    height : 200,
    src    : cardOf('identity/marks.md'),
    style  : {
      display   : frame.card > 0 ? undefined : 'none',
      opacity   : frame.card,
      transform : `translate(${frame.cardLeft}px, ${frame.cardTop}px)`,
      width     : `${frame.cardWide}px`
    },
    width  : 400
  })
}

/**
 * The range walking the marks, a thin track under a square thumb in the run's
 * color.
 */
const RANGE = [
  'm-0 h-[22px] w-full cursor-grab appearance-none bg-transparent accent-run active:cursor-grabbing',
  '[&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:bg-rule',
  '[&::-moz-range-track]:h-0.5 [&::-moz-range-track]:bg-rule',
  '[&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-3.5',
  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:rounded-xs [&::-webkit-slider-thumb]:bg-run',
  '[&::-webkit-slider-thumb]:[box-shadow:0_0_0_2px_var(--sc-page)]',
  '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-xs [&::-moz-range-thumb]:border-0',
  '[&::-moz-range-thumb]:bg-run [&::-moz-range-thumb]:[box-shadow:0_0_0_2px_var(--sc-page)]'
]

function controls({ glide, place, set }: Walk): VNode {
  return h('div', [
    h('input', {
      'aria-label' : 'Along the marks from the favicon to the lockup',
      'class'      : RANGE,
      'max'        : LAST * 100,
      'min'        : 0,
      'onInput'    : (event: Event) => {
        set(Number((event.target as HTMLInputElement).value) / 100)
      },
      'type'       : 'range',
      'value'      : place.value * 100
    }),
    h('div', { class: 'relative h-[30px]' }, MARKS.stops.map((stop, index) => h('button', {
      'class'   : [
        'absolute grid text-center font-code text-[0.59rem]/[1.35] font-medium whitespace-nowrap',
        'text-quiet normal-nums [transform:translateX(-50%)] transition-[color] data-at:text-ink',
        'first:text-left first:[transform:none] last:text-right last:[transform:translateX(-100%)]'
      ],
      'data-at' : Math.round(place.value) === index ? '' : undefined,
      'onClick' : () => {
        glide(index)
      },
      'style'   : { left: `${index / LAST * 100}%` },
      'type'    : 'button'
    }, [h('span', stop.name), h('span', `${stop.width} wide`)])))
  ])
}

/**
 * The marks along one range from the favicon to the lockup, ordered by width and
 * spaced evenly, the S growing and taking on the letters, the link card and the
 * tagline, each stop naming where the site or the README sets that mark.
 */
export const Marks = defineComponent({
  name  : 'ReferenceMarks',
  setup : () => {
    const { chart, layout, sized } = useChart(narrowAt)
    const id                       = useId()
    const walk                     = useWalk(chart)

    return () => {
      const place = walk.place.value
      const width = layout.value.width
      const frame = frameAt(place, width, HEIGHT)
      return stage(chart, layout.value.narrow, [
        h('div', {
          class : 'relative overflow-clip rounded-sm bg-page [box-shadow:0_0_0_1px_var(--sc-rule)]',
          style : { height: `${HEIGHT}px` }
        }, sized.value
          ? [card(frame), drawing(id, frame, width), reading(place, frame)]
          : undefined),
        controls(walk),
        stacked(MARKS.stops.map(stop => h('p', { class: SAY }, stop.sentence)), Math.round(place))
      ])
    }
  }
})
