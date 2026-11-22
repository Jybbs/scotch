import { clamp } from '@vueuse/core'
import { type PropType, type Ref, type VNode, defineComponent, h, shallowRef } from 'vue'

import { type Route, demoRoute, placeOf, questionsOf } from '../../../lib/overview/stops.ts'
import { routeOf }                                      from '../../../lib/site/routes.ts'
import overview                                         from '../../../../pages/methods/index.md?raw'
import { GlidingBoard }                                 from '../methods/board.ts'
import { CAPS, CARD, GAME_TEXT, NOTE }                  from '../methods/parts.ts'
import { Track }                                        from '../methods/track.ts'

/**
 * The stop the widget opens on, the position keys, where the demo game meets
 * its match.
 */
const OPENING = 2
/**
 * A stop's button, its number in a ring above its page's title.
 */
const TAB = 'group grid cursor-pointer content-start justify-items-center gap-1 rounded-sm text-center '
          + 'focus-ring'
/**
 * The title and the question of each page, as the overview's table lists
 * them.
 */
const questions = questionsOf(overview)

const titleOf = (page: string): string => questions.get(page)!.title

/**
 * Steps the stop picked with the arrow keys, Home, and End, moving the focus
 * with it.
 */
function arrows(at: Ref<number>, last: number) {
  return (event: KeyboardEvent): void => {
    const moves: Record<string, number> = {
      ArrowDown : at.value + 1,
      ArrowLeft : at.value - 1,
      ArrowRight: at.value + 1,
      ArrowUp   : at.value - 1,
      End       : last,
      Home      : 0
    }
    const to = moves[event.key]
    if (to === undefined) return
    event.preventDefault()
    at.value = clamp(to, 0, last)
    ;(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role=tab]')[at.value]?.focus()
  }
}

function board(route: Route, at: number): VNode {
  const { game, ply } = route.stops[at]!.board
  return h('div', { class: 'grid content-start gap-1.5 max-md:max-w-64 [grid-area:board]' }, [
    h(GlidingBoard, {
      label    : `The ${game === 'stored' ? 'stored' : 'demo'} game at ply ${ply}`,
      standing : route.pieces[game][ply]!
    }),
    h('div', { class: 'flex items-baseline justify-between gap-2' }, [
      h('span', { class: [CAPS, GAME_TEXT[game]] }, route.names[game]),
      h('span', { class: 'font-code text-[0.74rem]/[18px] text-ink tabular-nums' }, route.moves[game][ply])
    ])
  ])
}

/**
 * Draws the button naming the stop before or after the one picked, or an
 * empty cell where there is none.
 */
function go(route: Route, at: Ref<number>, index: number): VNode {
  const stop = route.stops[index]
  if (!stop) return h('span')
  const back = index < at.value
  return h('button', {
    class   : [
      'group grid cursor-pointer gap-0.5 rounded-md border border-rule bg-raised px-3 py-2 focus-ring',
      'transition-[border-color,transform] duration-glide ease-glide hover:border-run',
      back ? 'text-left hover:-translate-x-0.5' : 'text-right hover:translate-x-0.5'
    ],
    onClick : () => { at.value = index },
    type    : 'button'
  }, [
    h('span', { class: [CAPS, 'text-quiet'] }, back ? '← Stop before' : 'Next stop →'),
    h('span', { class: 'font-body text-[0.875rem]/[1.3] text-run' }, `${index + 1} · ${titleOf(stop.page)}`)
  ])
}

/**
 * Draws the leaders from each station on the track down to its stop's button,
 * the stop picked led in the run's color.
 */
function leaders(route: Route, at: number): VNode {
  const share = 100 / route.stops.length
  return h('svg', {
    'aria-hidden'         : 'true',
    'class'               : 'block h-5 w-full overflow-visible',
    'preserveAspectRatio' : 'none',
    'viewBox'             : '0 0 100 10'
  }, route.stops.map((_, index) => {
    const from = placeOf(route, index) * 100
    const to   = (index + 0.5) * share
    return h('path', {
      class : [
        'fill-none [vector-effect:non-scaling-stroke] transition-[stroke] duration-glide',
        index === at ? 'stroke-run stroke-[1.6]' : 'stroke-rule stroke-1'
      ],
      d     : `M ${from} 0 C ${from} 6 ${to} 4 ${to} 10`
    })
  }))
}

/**
 * Draws a button for each stop, its number in a ring and its page's title.
 */
function tabs(route: Route, at: Ref<number>): VNode {
  return h('div', {
    'aria-label' : 'Steps',
    'class'      : 'grid grid-cols-5 gap-1',
    'onKeydown'  : arrows(at, route.stops.length - 1),
    'role'       : 'tablist'
  }, route.stops.map((stop, index) => {
    const picked = index === at.value
    return h('button', {
      'aria-label'    : titleOf(stop.page),
      'aria-selected' : String(picked),
      'class'         : TAB,
      'onClick'       : () => { at.value = index },
      'role'          : 'tab',
      'tabindex'      : picked ? 0 : -1,
      'type'          : 'button'
    }, [
      h('span', {
        class: [
          'grid size-6 place-items-center rounded-full border font-display text-[0.8rem]/[1]',
          'transition-[background-color,color,transform] duration-glide ease-glide',
          picked
            ? 'scale-110 border-run bg-run text-page'
            : 'border-run bg-page text-run group-hover:scale-110'
        ]
      }, String(index + 1)),
      h('span', {
        class: [CAPS, 'text-balance max-sm:hidden', picked ? 'text-run' : 'text-quiet group-hover:text-ink']
      }, titleOf(stop.page))
    ])
  }))
}

/**
 * Draws what a stop says: its place on the way, its page's question linked to
 * the page, and the sentence it says about the demo game.
 */
function told(route: Route, at: number): VNode {
  const stop  = route.stops[at]!
  const title = titleOf(stop.page)
  return h('div', { class: 'grid content-start gap-1.5 [grid-area:told]' }, [
    h('span', { class: [CAPS, 'text-run'] }, `Step ${at + 1} of ${route.stops.length} · ${title}`),
    h('a', {
      class : 'font-body text-[1.05rem]/[1.35] italic text-ink! no-underline! hover:text-run!',
      href  : routeOf(`methods/${stop.page}.md`)
    }, questions.get(stop.page)!.question),
    h('p', { class: NOTE }, stop.says)
  ])
}

function track(route: Route, at: Ref<number>): VNode {
  const span = route.pair.runs.at(-1)!
  return h('div', { class: 'grid gap-1 [grid-area:track]' }, [
    h(Track, {
      at    : route.stops[at.value]!.ply,
      bold  : true,
      label : `The demo game and ${route.players} as two lines joining through their run`,
      pair  : route.pair
    }),
    leaders(route, at.value),
    tabs(route, at),
    h('div', { class: [CAPS, 'flex justify-between gap-2 text-quiet'] }, [
      h('span', { class: GAME_TEXT.submitted }, route.names.submitted),
      h('span', { class: 'text-run max-sm:hidden' }, `Run of ${span.length}`),
      h('span', { class: GAME_TEXT.stored }, route.players)
    ])
  ])
}

/**
 * The Methods overview's way from the demo game to its match: the two games
 * as a track, each station led down to the page it opens, a marker gliding to
 * the station picked, the sentence that stop says beside a board at its
 * position, and two buttons naming the stop before and the stop after.
 */
export const Stops = defineComponent({
  name: 'ScotchStops',

  props: {
    route: { default: () => demoRoute, type: Object as PropType<Route> }
  },

  setup: props => {
    const at = shallowRef(OPENING)
    return (): VNode => h('div', {
      class: [
        CARD,
        'gap-x-6 [grid-template-areas:"track"_"told"_"board"_"go"]',
        'md:grid-cols-[minmax(0,1fr)_13rem] md:[grid-template-areas:"track_track"_"told_board"_"go_board"]',
        'lg:grid-cols-[minmax(0,1fr)_12rem]'
      ]
    }, [
      track(props.route, at),
      told(props.route, at.value),
      board(props.route, at.value),
      h('div', { class: 'grid grid-cols-2 gap-2 [grid-area:go]' }, [
        go(props.route, at, at.value - 1),
        go(props.route, at, at.value + 1)
      ])
    ])
  }
})
