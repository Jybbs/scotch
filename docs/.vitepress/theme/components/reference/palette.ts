import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { useChart }                                      from '../../../lib/data/chart.ts'
import { IDENTITY, type Token, hexOf }                   from '../../../lib/identity/tokens.ts'
import { DURATIONS }                                     from '../../../lib/motion/timing.ts'
import * as palette                                      from '../../../lib/reference/palette.ts'
import { narrowAt, pickable }                            from '../../../lib/reference/pick.ts'
import { type Beats, type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { DRAWINGS }                                      from '../../../lib/site/pieces.ts'
import { stacked, stage }                                from './parts.ts'

/**
 * The picked color, what the drawing has shown so far, and the rank of squares,
 * beside the call that picks a color.
 */
interface Picking {
  at     : ShallowRef<number>
  count  : ShallowRef<number>
  homed  : ShallowRef<boolean>
  pick   : (index: number) => void
  rank   : ShallowRef<HTMLElement | null>
  ranked : ShallowRef<boolean>
  shown  : ShallowRef<boolean>
}

/**
 * The outline of the pawn each ground's cell sets in the picked color.
 */
const PAWN = /\bd="([^"]+)"/u.exec(DRAWINGS.P)![1]!

const COUNT = palette.TOKENS.length
/**
 * The picks the unfold makes after the first, as when and which square.
 */
const STOPS = [[2700, 4], [4400, 11], [6100, 0]] as const
/**
 * The characters of the widest ratio a cell writes, which its figure reserves so
 * the level beside it holds still as the figure counts.
 */
const WIDEST = Math.max(...palette.TOKENS.flatMap(token => palette.SCHEMES.flatMap(scheme =>
  palette.GROUNDS.map(ground => palette.heldOf(token, ground, scheme).toFixed(2).length))))

function card(token: Token): VNode {
  const color  = IDENTITY.palette[token]
  const taken  = palette.rolesOf(token)
  return h('div', { class: 'sc-ref-card' }, [
    h('div', [
      h('h4', { class: 'sc-ref-name' }, color.name),
      h('small', `${color.hex} · ${token}`)
    ]),
    h('div', [
      h('p', { class: 'sc-ref-say' }, palette.meaningOf(token)),
      h('div', { class: 'sc-ref-chips' }, taken.length > 0
        ? taken.map(([role, mixed]) => h('code', {
          'data-mixed' : mixed ? '' : undefined,
          'title'      : mixed ? 'Taken in a mix' : 'Taken pure'
        }, role))
        : h('code', { 'data-mixed': '' }, 'No role, a chart series'))
    ])
  ])
}

function lanes(token: Token, homed: boolean): VNode {
  return h('div', { class: 'sc-ref-lanes' }, [
    ...palette.SCHEMES.map(scheme => h('div', { class: 'sc-ref-lane' }, [
      h('small', { class: 'sc-ref-scheme' }, scheme),
      h('div', { class: 'sc-ref-track' }, [
        ...Object.values(palette.GATES).map(gate =>
          h('i', { class: 'sc-ref-gate', style: { '--sc-ref-at': palette.logShare(gate) } })),
        ...palette.GROUNDS.map(ground => h('span', {
          class : 'sc-ref-marker',
          style : {
            '--sc-ref-at'     : homed ? 0 : palette.logShare(palette.heldOf(token, ground, scheme)),
            '--sc-ref-color'  : hexOf(token),
            '--sc-ref-ground' : palette.colorOf(ground, scheme)
          }
        }, h('i')))
      ])
    ])),
    h('div', { class: 'sc-ref-lane' }, [
      h('i'),
      h('div', { class: 'sc-ref-ticks' }, palette.TICKS.map(tick =>
        h('span', { style: { left: `${palette.tickAt(tick)}%` } }, tick === 21 ? '21:1' : String(tick))))
    ])
  ])
}

function cell(token: Token, ground: palette.RoleName, scheme: palette.Scheme, count: number): VNode {
  const held = palette.heldOf(token, ground, scheme)
  return h('div', {
    class : 'sc-ref-cell',
    style : { background: palette.colorOf(ground, scheme), color: palette.colorOf('ink', scheme) }
  }, [
    h('svg', { 'aria-hidden': 'true', 'viewBox': '9 8 27 33' }, h('path', { d: PAWN, fill: hexOf(token), stroke: 'none' })),
    h('span', [
      h('b', { style: { minWidth: `${WIDEST}ch` } }, (1 + (held - 1) * count).toFixed(2)),
      h('em', palette.levelOf(held))
    ])
  ])
}

function grounds(token: Token, count: number): VNode {
  return h('div', { class: 'sc-ref-grounds' }, [
    h('i'),
    ...palette.GROUNDS.map(ground => h('small', { class: 'sc-ref-top' }, ground)),
    ...palette.SCHEMES.flatMap(scheme => [
      h('small', { class: 'sc-ref-scheme' }, scheme),
      ...palette.GROUNDS.map(ground => cell(token, ground, scheme, count))
    ])
  ])
}

/**
 * Moves each square of `rank` up into place, one after another.
 */
function unfold(rank: HTMLElement | null, time: Beats): void {
  Array.from(rank?.querySelectorAll('button') ?? []).forEach((tile, index) => {
    time.move(tile, [
      { opacity: 0, transform: 'translateY(14px) scale(0.86)' },
      { opacity: 1, transform: 'none' }
    ], { delay: index * 46, duration: DURATIONS.enter + 60 })
  })
}

/**
 * Holds the pick and runs the unfold on `chart`.
 */
function usePicking(chart: NodeRef): Picking {
  const at     = shallowRef(0)
  const count  = shallowRef(1)
  const homed  = shallowRef(false)
  const ranked = shallowRef(true)
  const shown  = shallowRef(true)
  const rank   = shallowRef<HTMLElement | null>(null)
  const beats  = useBeats()

  const pick = (index: number): void => {
    at.value    = index
    homed.value = false
    beats.glide(DURATIONS.settle, eased => {
      count.value = eased
    })
  }
  const stand = (open: boolean): void => {
    count.value  = 1
    homed.value  = !open
    ranked.value = open
    shown.value  = open
  }

  useUnfold(chart, beats, {
    length : 8000,
    play   : (time, done) => {
      ranked.value = true
      unfold(rank.value, time)
      time.at(780, () => {
        shown.value = true
        pick(0)
      })
      STOPS.forEach(([ms, index]) => { time.at(ms, () => { pick(index) }) })
      time.at(7300, done)
    },
    prime  : () => {
      at.value = 0
      stand(false)
    },
    settle : () => {
      stand(true)
    }
  })

  return { at, count, homed, pick, rank, ranked, shown }
}

function squares({ at, pick, rank, ranked, shown }: Picking, columns: number): VNode {
  return h('div', { 'class': 'sc-ref-rank', 'data-off': ranked.value ? undefined : '', 'ref': rank }, [
    ...palette.TOKENS.map((name, index) => h('button', {
      ...pickable(index, at.value, COUNT, pick),
      'aria-label' : `${IDENTITY.palette[name].name}, ${hexOf(name)}`,
      'class'      : 'sc-ref-square',
      'style'      : { background: hexOf(name), color: palette.onColorOf(name) }
    }, h('span', hexOf(name)))),
    h('i', {
      'aria-hidden' : 'true',
      'class'       : 'sc-ref-ring',
      'data-off'    : shown.value ? undefined : '',
      'style'       : { transform: `translate(${at.value % columns * 100}%, ${Math.floor(at.value / columns) * 100}%)` }
    })
  ])
}

/**
 * The palette as a rank of squares a reader picks among, the picked color's
 * name, meaning, and roles beneath them, beside what it holds against each
 * ground in both schemes, on a scale and on the grounds themselves.
 */
export const Palette = defineComponent({
  name  : 'ReferencePalette',
  setup : () => {
    const { chart, layout } = useChart(narrowAt)
    const state             = usePicking(chart)

    return () => {
      const token = palette.TOKENS[state.at.value]!
      return stage(chart, layout.value.narrow, [
        squares(state, layout.value.narrow ? 6 : COUNT),
        h('div', { 'class': 'sc-ref-picked', 'data-off': state.shown.value ? undefined : '' },
          [stacked(palette.TOKENS.map(name => card(name)), state.at.value)]),
        lanes(token, state.homed.value),
        grounds(token, state.count.value)
      ])
    }
  }
})
