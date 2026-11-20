import { type PropType, type VNode, defineComponent, h } from 'vue'

import { counted }                                        from '../../../lib/data/numbers.ts'
import { DRAWINGS, svgOf }                                from '../../../lib/site/pieces.ts'
import { RANKS, type Tied, dotOf, dotsOf, rankOf, ranked } from '../../../lib/viewer/ranks.ts'
import { PILL }                                           from './parts.ts'

/**
 * One dot under a rank's chip, a ring filled and grown where it stands for the
 * shown game, and the last of a row shrunk where the rank holds more games
 * than its dots.
 */
const DOT = [
  'grid h-2.5 w-[9px] cursor-pointer place-items-center border-0 bg-transparent p-0',
  'before:size-[5px] before:rounded-[50%] before:transition-[background-color,transform]',
  'before:[box-shadow:inset_0_0_0_1px_color-mix(in_oklab,var(--sc-quiet)_70%,transparent)]',
  'hover:before:[box-shadow:inset_0_0_0_1px_var(--sc-run)] in-data-more:last:before:size-[3px]',
  'data-on:before:bg-run data-on:before:[box-shadow:none] data-on:before:[transform:scale(1.3)]',
  'focus-visible:rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-1',
  'focus-visible:outline-run'
]

/**
 * Names a count of `noun`, as `1 game` or `13 games`.
 */
function named(count: number, noun: string): string {
  return `${counted(count)} ${count === 1 ? noun : `${noun}s`}`
}

/**
 * Draws the dots under one rank's chip, one per game up to the most a chip
 * carries, a press on a dot showing the first game it stands for, the shown
 * game's dot filled, and the row closing on a smaller dot where the rank holds
 * more games than its dots.
 *
 * Args:
 *   here   : The shown game's place inside the rank, or -1 where it sits in
 *     another rank.
 *   inside : The place inside the ties of each game the rank holds.
 *   show   : Shows the tied game at a place inside the ties.
 */
function drawDots(here: number, inside: readonly number[], show: (at: number) => void): VNode {
  const on   = here < 0 ? -1 : dotOf(here, inside.length)
  const dots = dotsOf(inside.length)
  return h('span', {
    'class'     : 'flex h-2.5 items-center',
    'data-more' : inside.length > dots.length ? '' : undefined
  }, dots.map((opens, dot) => h('button', {
    'aria-label' : `Game ${counted(opens + 1)} of ${counted(inside.length)} in this rank`,
    'class'      : DOT,
    'data-on'    : dot === on ? '' : undefined,
    'type'       : 'button',
    'onClick'    : () => show(inside[opens]!)
  })))
}

/**
 * Draws one rank's chip above its dots: the rank's piece beside the count of
 * games it holds, pressed while the shown game sits in it, a press stepping to
 * the rank's next game.
 *
 * Args:
 *   at     : The shown game's place inside the ties.
 *   inside : The place inside the ties of each game the rank holds.
 *   rank   : The rank's place among `RANKS`.
 *   show   : Shows the tied game at a place inside the ties.
 */
function drawRank(at: number, inside: readonly number[], rank: number, show: (at: number) => void): VNode {
  const { piece, words } = RANKS[rank]!
  const here             = inside.indexOf(at)
  return h('span', { class: 'grid justify-items-center gap-[7px]' }, [
    h('button', {
      'aria-pressed' : String(here >= 0),
      'class'        : [PILL, 'h-10 gap-1 pr-3 pl-[5px] font-code text-[0.76rem]/none font-semibold',
                        'tabular-nums'],
      'title'        : `${named(inside.length, 'game')} rated ${words}`,
      'type'         : 'button',
      'onClick'      : () => show(inside[(here + 1) % inside.length]!)
    }, [
      h('span', { class: 'block size-[30px]', innerHTML: svgOf(DRAWINGS[piece], 30) }),
      h('i', { class: 'mr-px font-medium text-quiet not-italic' }, '×'),
      counted(inside.length)
    ]),
    drawDots(here, inside, show)
  ])
}

/**
 * The stored games tied on the longest run, weighed by rating: a kicker naming
 * how many tie on how many positions, a chip per rank on its piece from the
 * queen to the pawn beside the count of games it holds, dots under each chip
 * standing for the games it holds, and a meter marking each rank's share of
 * the ties. A press on a chip steps to its next game and a press on a dot shows
 * the game it stands for, each reaching the tool through `show`.
 */
export const Tally = defineComponent({
  name: 'ScotchTally',

  props: {
    at     : { required: true, type: Number },
    length : { required: true, type: Number },
    ties   : { required: true, type: Array as PropType<readonly Tied[]> }
  },

  emits: {
    show: (at: number) => Number.isInteger(at)
  },

  setup: (props, { emit }) => {
    const show = (at: number): void => {
      emit('show', at)
    }

    return () => {
      const ranks = ranked(props.ties)
      const shown = rankOf(props.ties[props.at]!)
      let before  = 0
      return h('div', { class: 'grid min-w-0 gap-2 border-t border-rule pt-3' }, [
        h('p', {
          class: 'flex items-center justify-between gap-3 font-code text-[0.62rem]/[16px] font-medium '
               + 'tabular-nums tracking-[0.12em] text-quiet uppercase'
        }, [
          h('span', [
            h('b', { class: 'font-semibold text-ink' }, counted(props.ties.length)),
            ` games tied on ${named(props.length, 'position')}`
          ]),
          h('span', 'Weighed by rating')
        ]),
        h('div', { class: 'flex flex-wrap items-start gap-x-2 gap-y-2.5' }, ranks.flatMap(
          (inside, rank) => inside.length > 0 ? [drawRank(props.at, inside, rank, show)] : []
        )),
        h('div', {
          'aria-hidden' : 'true',
          'class'       : 'relative h-1.5 overflow-hidden rounded-[3px] bg-raised '
                        + '[box-shadow:inset_0_0_0_1px_var(--sc-rule)]'
        }, ranks.map((inside, rank) => {
          const left = before / props.ties.length * 100
          before    += inside.length
          return h('span', {
            'class'   : 'absolute inset-y-0 bg-run/28 data-on:bg-run',
            'data-on' : rank === shown ? '' : undefined,
            'style'   : { left: `${left}%`, width: `calc(${inside.length / props.ties.length * 100}% - 2px)` }
          })
        }))
      ])
    }
  }
})
