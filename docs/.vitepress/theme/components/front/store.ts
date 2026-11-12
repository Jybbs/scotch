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
  const square   = (index: number): VNode => h('span', { 'data-shade': shadeOf(index) },
    (bySquare.get(index) ?? []).map(fill => h('i', {
      'data-odd' : fill.decade % 2 ? '' : undefined,
      'data-on'  : fill.decade === at ? '' : undefined,
      'style'    : { bottom: percent(fill.from, 2), height: percent(fill.share, 2) }
    })))
  const attributes = { 'aria-label': label, 'class': 'sc-front-store', 'role': 'img' }
  return h('div', attributes, readingOrder.map(index => square(index)))
}

/**
 * Draws a row per decade beside the board, a bar as long as its games beside
 * the squares they fill, a press on a row showing its decade.
 */
function eras(at: number, decades: readonly census.Decade[], go: (step: number) => void): VNode {
  const most = Math.max(...decades.map(each => each.games))
  const per  = summed(decades.map(each => each.games)) / census.SQUARES
  return h('div', { 'aria-hidden': 'true', 'class': 'sc-front-eras' }, decades.map((each, step) =>
    h('div', { 'data-on': step === at ? '' : undefined, 'onClick': () => go(step) }, [
      h('span', each.short),
      h('b', { style: { width: percent(Math.max(0.02, each.games / most), 1) } }),
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
    say      : `games played ${decade.when}, ${percent(decade.games / games, 1)} of the store and `
             + `${(decade.games / games * census.SQUARES).toFixed(1)} of the board’s `
             + `${census.SQUARES} squares, from ${decade.files} files`
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
    }, () => h('div', { class: 'sc-front-census' }, [
      board(drive.at.value, fills, label),
      eras(drive.at.value, decades, drive.go)
    ]))
  }
})
