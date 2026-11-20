import { type ShallowRef, type VNode, defineComponent, h, shallowRef } from 'vue'

import { useChart }                                      from '../../../lib/data/chart.ts'
import { IDENTITY, type Token, hexOf }                   from '../../../lib/identity/tokens.ts'
import { DURATIONS }                                     from '../../../lib/motion/timing.ts'
import * as palette                                      from '../../../lib/reference/palette.ts'
import { narrowAt, pickable }                            from '../../../lib/reference/pick.ts'
import { type Beats, type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { DRAWINGS }                                      from '../../../lib/site/pieces.ts'
import { NAME, SAY, SMALL, stacked, stage }             from './parts.ts'

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

/**
 * Either half of the picked color's card.
 */
const HALF = 'grid min-w-0 content-start gap-[5px]'

/**
 * A role the picked color takes, dashed and quiet where it takes the color in a
 * mix.
 */
const CHIP = [
  'rounded-[3px]! border border-rule bg-transparent! px-[5px]! py-px! font-code text-[0.66rem]/[1.4]!',
  'font-medium text-ink! normal-nums data-mixed:border-dashed data-mixed:text-quiet!'
]

/**
 * Sets a gate or a marker at its share of the lane's width.
 */
const AT = '[transform:translateX(calc(var(--sc-ref-at)*100cqw))]'

function card(token: Token): VNode {
  const color  = IDENTITY.palette[token]
  const taken  = palette.rolesOf(token)
  return h('div', {
    class: 'grid grid-cols-[11rem_minmax(0,1fr)] content-start gap-x-4 gap-y-1 in-data-narrow:grid-cols-1'
  }, [
    h('div', { class: HALF }, [
      h('h4', { class: NAME }, color.name),
      h('small', { class: SMALL }, `${color.hex} · ${token}`)
    ]),
    h('div', { class: HALF }, [
      h('p', { class: SAY }, palette.meaningOf(token)),
      h('div', { class: 'flex flex-wrap gap-1' }, taken.length > 0
        ? taken.map(([role, mixed]) => h('code', {
          'class'      : CHIP,
          'data-mixed' : mixed ? '' : undefined,
          'title'      : mixed ? 'Taken in a mix' : 'Taken pure'
        }, role))
        : h('code', { 'class': CHIP, 'data-mixed': '' }, palette.noRoleOf(token)))
    ])
  ])
}

/**
 * A lane of the scale, its label beside its track.
 */
const LANE = 'grid h-5 grid-cols-[2.6rem_minmax(0,1fr)] items-center'

function lanes(token: Token, homed: boolean): VNode {
  return h('div', { class: 'grid gap-0.5' }, [
    ...palette.SCHEMES.map(scheme => h('div', { class: LANE }, [
      h('small', { class: [SMALL, 'capitalize'] }, scheme),
      h('div', {
        class: 'relative h-full @container before:absolute before:inset-x-0 before:top-1/2 before:h-px '
             + 'before:bg-rule'
      }, [
        ...Object.values(palette.GATES).map(gate => h('i', {
          class : ['absolute top-[3px] bottom-[3px] left-0 w-px bg-quiet', AT],
          style : { '--sc-ref-at': palette.logShare(gate) }
        })),
        ...palette.GROUNDS.map(ground => h('span', {
          class : [
            'absolute top-[3px] -left-[7px] grid size-3.5 place-items-center rounded-xs border border-rule',
            'bg-(--sc-ref-ground) transition-[transform] duration-settle',
            AT
          ],
          style : {
            '--sc-ref-at'     : homed ? 0 : palette.logShare(palette.heldOf(token, ground, scheme)),
            '--sc-ref-color'  : hexOf(token),
            '--sc-ref-ground' : palette.colorOf(ground, scheme)
          }
        }, h('i', { class: 'size-1.5 bg-(--sc-ref-color) transition-[background-color]' })))
      ])
    ])),
    h('div', { class: LANE }, [
      h('i'),
      h('div', { class: 'relative self-stretch' }, palette.TICKS.map(tick => h('span', {
        class : [
          'absolute font-code text-[0.6rem]/[1.2] font-medium text-quiet normal-nums',
          '[transform:translateX(-50%)] last:[transform:translateX(-100%)]'
        ],
        style : { left: `${palette.tickAt(tick)}%` }
      }, tick === 21 ? '21:1' : String(tick))))
    ])
  ])
}

function cell(token: Token, ground: palette.RoleName, scheme: palette.Scheme, count: number): VNode {
  const held = palette.heldOf(token, ground, scheme)
  return h('div', {
    class : [
      'grid h-[34px] grid-cols-[13px_minmax(0,1fr)] items-center gap-1.5 pr-1.5 pl-2',
      'font-code text-[0.84rem]/none font-medium normal-nums',
      'in-data-narrow:grid-cols-[9px_minmax(0,1fr)] in-data-narrow:gap-1 in-data-narrow:pr-[3px]',
      'in-data-narrow:pl-[5px] in-data-narrow:text-[0.74rem]'
    ],
    style : { background: palette.colorOf(ground, scheme), color: palette.colorOf('ink', scheme) }
  }, [
    h('svg', {
      'aria-hidden' : 'true',
      'class'       : 'h-4 w-full',
      'viewBox'     : '9 8 27 33'
    }, h('path', { d: PAWN, fill: hexOf(token), stroke: 'none' })),
    h('span', { class: 'whitespace-nowrap' }, [
      h('b', { class: 'inline-block font-medium tabular-nums', style: { minWidth: `${WIDEST}ch` } },
        (1 + (held - 1) * count).toFixed(2)),
      h('em', {
        class: 'ml-[3px] font-code text-[0.58rem]/none font-medium not-italic normal-nums opacity-72 '
             + 'in-data-narrow:m-0 in-data-narrow:mt-0.5 in-data-narrow:block'
      }, palette.levelOf(held))
    ])
  ])
}

/**
 * A ground's name over its column, or a scheme's beside its row.
 */
const HEAD = [SMALL, 'self-center pb-[3px]']

function grounds(token: Token, count: number): VNode {
  return h('div', {
    class: 'grid grid-cols-[2.6rem_repeat(4,minmax(0,1fr))] '
         + 'in-data-narrow:grid-cols-[2.3rem_repeat(4,minmax(0,1fr))]'
  }, [
    h('i'),
    ...palette.GROUNDS.map(ground => h('small', { class: [HEAD, 'pl-2 in-data-narrow:pl-[5px]'] }, ground)),
    ...palette.SCHEMES.flatMap(scheme => [
      h('small', { class: [HEAD, 'capitalize'] }, scheme),
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
  return h('div', {
    'class'    : 'relative grid grid-cols-12 in-data-narrow:grid-cols-6',
    'data-off' : ranked.value ? undefined : '',
    'ref'      : rank
  }, [
    ...palette.TOKENS.map((name, index) => h('button', {
      ...pickable(index, at.value, COUNT, pick),
      'aria-label' : `${IDENTITY.palette[name].name}, ${hexOf(name)}`,
      'class'      : [
        'flex aspect-square min-w-0 items-end overflow-hidden p-0 pb-[5px] pl-[5px]',
        '[box-shadow:inset_0_0_0_1px_color-mix(in_srgb,var(--sc-ink)_16%,transparent)]'
      ],
      'style'      : { background: hexOf(name), color: palette.onColorOf(name) }
    }, h('span', {
      class: 'font-code text-[0.54rem]/none font-medium tracking-[-0.01em] whitespace-nowrap normal-nums'
    }, hexOf(name)))),
    h('i', {
      'aria-hidden' : 'true',
      'class'       : [
        'pointer-events-none absolute top-0 left-0 aspect-square w-[calc(100%/12)]',
        'in-data-narrow:w-[calc(100%/6)]',
        '[box-shadow:inset_0_0_0_2px_var(--sc-page),0_0_0_2px_var(--sc-ink)]',
        'transition-[transform,opacity] duration-glide'
      ],
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
        h('div', { 'class': 'transition-[opacity]', 'data-off': state.shown.value ? undefined : '' },
          [stacked(palette.TOKENS.map(name => card(name)), state.at.value)]),
        lanes(token, state.homed.value),
        grounds(token, state.count.value)
      ])
    }
  }
})
