import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { counted, percent, summed } from '../../../lib/data/numbers.ts'
import * as census                  from '../../../lib/front/census.ts'
import { useDrive }                 from '../../../lib/front/drive.ts'
import { readingOrder }             from '../../../lib/methods/board.ts'
import { shadeOf }                  from '../../../lib/methods/squares.ts'
import { type Readout, Panel }      from './panel.ts'

/**
 * How the store's board plays its decades: the milliseconds between two, and
 * the beats it rests on the last.
 */
const PACE = { interval: 1300, rest: 4 } as const

/**
 * Draws the board of 64 squares, each square holding a 64th of the store's
 * games and filled from a1 by decade, the decade in view drawn full.
 */
function board(at: number, fills: readonly census.Fill[], label: string): VNode {
  const bySquare = Map.groupBy(fills, fill => fill.square)
  const square   = (index: number): VNode => h('span', {
    'data-shade' : shadeOf(index),
    'class'      : [
      'relative bg-[color-mix(in_oklab,var(--sc-ink)_3%,var(--sc-raised))]',
      'data-[shade=dark]:bg-[color-mix(in_oklab,var(--sc-ink)_9%,var(--sc-raised))]'
    ]
  }, (bySquare.get(index) ?? []).map(fill => h('i', {
    'data-odd' : fill.decade % 2 ? '' : undefined,
    'data-on'  : fill.decade === at ? '' : undefined,
    'style'    : { bottom: percent(fill.from, 2), height: percent(fill.share, 2) },
    'class'    : [
      'absolute inset-x-0 bg-(--sc-entry) opacity-22 transition-[opacity] duration-settle',
      'data-odd:opacity-36 data-on:opacity-95'
    ]
  })))
  return h('div', {
    'aria-label' : label,
    'role'       : 'img',
    'class'      : [
      'grid aspect-[1] grid-cols-[repeat(8,minmax(0,1fr))] grid-rows-[repeat(8,minmax(0,1fr))]',
      'overflow-hidden',
      'rounded-[3px] [box-shadow:0_0_0_1px_var(--sc-rule)] max-sm:w-[min(260px,100%)]'
    ]
  }, readingOrder.map(index => square(index)))
}

/**
 * Draws a row per decade beside the board, a bar as long as its games beside
 * the squares they fill, a press on a row showing its decade.
 */
function eras(at: number, decades: readonly census.Decade[], go: (step: number) => void): VNode {
  const most = Math.max(...decades.map(each => each.games))
  const per  = summed(decades.map(each => each.games)) / census.SQUARES
  return h('div', {
    'aria-hidden' : 'true',
    'data-eras'   : '',
    'class'       : [
      'grid gap-[3px] font-code text-[0.65rem]/none font-medium tracking-[0.08em] text-quiet tabular-nums',
      'max-sm:hidden'
    ]
  }, decades.map((each, step) => h('div', {
    'class'   : 'group grid h-[13px] cursor-pointer grid-cols-[52px_1fr_30px] items-center gap-2 '
              + 'data-on:text-ink',
    'data-on' : step === at ? '' : undefined,
    'onClick' : () => go(step)
  }, [
    h('span', each.short),
    h('b', {
      class : 'h-[7px] rounded-[1px] bg-(--sc-entry) opacity-22 transition-[opacity] '
            + 'group-data-on:opacity-92',
      style : { width: percent(Math.max(0.02, each.games / most), 1) }
    }),
    h('span', (each.games / per).toFixed(1))
  ])))
}

/**
 * Writes what the readout names for a decade.
 */
function readoutOf(decade: census.Decade, games: number): Readout {
  return {
    big      : counted(decade.games),
    readings : decade.top.map(each => [each.name, counted(each.games)]),
    say      : `Played ${decade.when}, ${percent(decade.games / games, 1)} of the store and `
             + `${(decade.games / games * census.SQUARES).toFixed(1)} of the board’s `
             + `${census.SQUARES} squares, from ${decade.files} files`,
    unit     : 'games'
  }
}

/**
 * The Data section's widget on the front page: the store drawn as one board of
 * 64 squares, each holding a 64th of the games the store holds and filled from
 * a1 by the decade its games were played in, so the share each decade takes
 * reads as squares of the board, beside a row per decade, the clock line
 * walking the decades.
 */
export const Store = defineComponent({
  name: 'ScotchFrontStore',

  setup: () => {
    const decades = census.decadesOf()
    const fills   = census.fillsOf(decades)
    const games   = summed(decades.map(each => each.games))
    const panel   = shallowRef(null)
    const last    = decades.length - 1
    const drive   = useDrive(panel, { ...PACE, count: decades.length, settle: last, start: 0 })
    const label   = `The ${counted(games)} games the store holds as one board of 64 squares, `
                  + `each square ${counted(Math.round(games / census.SQUARES))} games, `
                  + 'filled from a1 by decade'

    return (): VNode => h(Panel, {
      drive   : drive,
      label   : 'Decades',
      names   : decades.map(each => each.name),
      readout : readoutOf(decades[drive.at.value]!, games),
      ref     : panel
    }, () => h('div', {
      class: [
        'grid grid-cols-[minmax(0,300px)_minmax(0,1fr)] items-center gap-[22px]',
        'max-sm:grid-cols-[minmax(0,1fr)] max-sm:justify-items-center'
      ]
    }, [
      board(drive.at.value, fills, label),
      eras(drive.at.value, decades, drive.go)
    ]))
  }
})
