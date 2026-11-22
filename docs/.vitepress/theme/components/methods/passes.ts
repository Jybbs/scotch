import { TransitionPresets, useTransition }            from '@vueuse/core'
import { type VNode, computed, defineComponent, h, shallowRef } from 'vue'

import { counted }                                    from '../../../lib/data/numbers.ts'
import { MATCHED, PASSED, type Passed, type Sampled } from '../../../lib/methods/passes.ts'
import { useMotion }                                  from '../../../lib/motion/control.ts'
import { CAPS, CARD, NOTE, stacked }                  from './parts.ts'
import { Track }                                      from './track.ts'

/**
 * Draws one sampled match as a track beneath its games and its longest run,
 * faint where it stands for another stored game the match does not draw.
 */
function sampled({ box, game, other, pair, stored }: Sampled): VNode {
  const named = other ? 'another stored game' : `stored game ${counted(stored)}`
  const { length, start } = pair.longest
  return h('div', { class: 'grid gap-1.5' }, [
    h('div', { class: other ? 'opacity-45' : '' },
      h(Track, { box, label: `Sampled game ${counted(game)} against ${named}`, pair })),
    h('div', { class: [CAPS, 'flex flex-wrap justify-between gap-x-4 text-quiet'] }, [
      h('span', `Game ${counted(game)} · ${other ? 'another stored game' : `stored ${counted(stored)}`}`),
      h('span', { class: 'text-run' }, `Run of ${length} from ply ${start}`)
    ])
  ])
}

/**
 * Draws a row of the strips: its label beside what it draws.
 */
function row(text: string, tone: string, body: (VNode | undefined)[], key: string): VNode {
  return h('div', {
    class : 'grid gap-2 playing:animate-unfold lg:grid-cols-[8.5rem_minmax(0,1fr)] lg:gap-x-5',
    key
  }, [h('span', { class: [CAPS, tone, 'lg:pt-0.5'] }, text), h('div', { class: 'grid min-w-0 gap-2' }, body)])
}

/**
 * Draws the match a measure's rule names, then what it passes over with its
 * sentence, under one column of labels.
 */
function strips(passed: Passed, at: number): VNode[] {
  return [
    row('The match the rule names', 'text-run', [sampled(passed.named)], `named${at}`),
    h('hr', { class: 'm-0! border-rule' }),
    row('What it passes over', 'text-quiet', [
      passed.over && sampled(passed.over),
      h('p', { class: NOTE }, passed.says)
    ], `over${at}`)
  ]
}

/**
 * The faint line of a game in a measure's picture, and the heavy line of a run.
 */
const LINE = 'fill-none stroke-[1.1] stroke-quiet/75'
const RUN  = 'fill-none stroke-[3] [stroke-linecap:round]'

/**
 * Each measure drawn small in the track's own marks, two lines joining into a
 * run: the run joining past the start, two runs as long, a run many other
 * lines pass through, and a shorter run reaching a rarer position by another
 * way.
 */
const PICTURES: Record<string, (tone: string) => VNode[]> = {
  'Crowded positions': tone => [
    ...[2, 6, 14, 18].flatMap(y => [
      h('path', { class: LINE, d: `M 2 ${y} C 8 ${y} 10 10 14 10` }),
      h('path', { class: LINE, d: `M 26 10 C 30 10 32 ${y} 38 ${y}` })
    ]),
    h('path', { class: [RUN, tone], d: 'M 14 10 H 26' })
  ],
  'Rarer by another order': tone => [
    h('path', { class: [RUN, 'stroke-quiet opacity-45'], d: 'M 3 6 H 27' }),
    h('path', { class: 'fill-none stroke-quiet/70 stroke-[1.1] [stroke-dasharray:2_1.6]', d: 'M 3 16 C 14 16 22 14 30 14' }),
    h('path', { class: [RUN, tone], d: 'M 21 14 H 30' }),
    h('circle', { class: ['fill-page stroke-[1.6]', tone], cx: 34, cy: 14, r: 3.2 })
  ],
  'Runs starting later': tone => [
    h('rect', { class: 'fill-none stroke-quiet/60 stroke-[0.9] [stroke-dasharray:2_1.6]', height: 16, rx: 2, width: 14, x: 1, y: 2 }),
    h('path', { class: 'fill-none stroke-submitted stroke-[1.6]', d: 'M 3 5 H 13 L 18 10' }),
    h('path', { class: 'fill-none stroke-stored stroke-[1.6]', d: 'M 3 15 H 13 L 18 10' }),
    h('path', { class: [RUN, tone], d: 'M 18 10 H 38' })
  ],
  'Ties': tone => [
    h('path', { class: [RUN, tone], d: 'M 8 6 H 32' }),
    h('path', { class: [RUN, tone, 'opacity-45'], d: 'M 8 14 H 32' }),
    h('path', { class: 'fill-none stroke-quiet stroke-[0.9]', d: 'M 4 6 V 14 M 36 6 V 14' })
  ]
}

/**
 * Draws a measure's segment of the switch: its picture over a bar of its
 * share.
 */
function segment(passed: Passed, picked: boolean): VNode[] {
  return [
    h('svg', { 'aria-hidden': 'true', 'class': 'mx-auto block h-6 w-12 overflow-visible', 'viewBox': '0 0 40 20' },
      PICTURES[passed.name]!(picked ? 'stroke-run' : 'stroke-quiet')),
    h('span', {
      'aria-hidden' : 'true',
      'class'       : 'mx-auto mt-1.5 block h-1 w-full max-w-16 overflow-hidden rounded-full bg-quiet/20'
    }, h('span', {
      class : ['block h-full rounded-full', picked ? 'bg-run' : 'bg-quiet/70'],
      style : { width: `${passed.share}%` }
    }))
  ]
}

/**
 * Draws a hundred squares, the first `share` of them in the run's color, each
 * filling in turn as the share changes.
 */
function waffle(share: number, moving: boolean): VNode {
  return h('div', {
    'aria-hidden' : 'true',
    'class'       : 'grid w-full max-w-40 grid-cols-[repeat(10,1fr)] gap-[2px] lg:max-w-none'
  }, Array.from({ length: 100 }, (_, square) => h('i', {
    class : ['aspect-square rounded-[1.5px]', square < share ? 'bg-run' : 'bg-quiet/20', moving ? 'transition-colors duration-glide' : ''],
    style : { transitionDelay: moving ? `${square * 5}ms` : '0ms' }
  })))
}

/**
 * Steps the measure picked with the arrow keys, Home, and End, as a tab list
 * does, moving the focus with it.
 */
function arrows(at: { value: number }): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent): void => {
    const last = PASSED.length - 1
    const to   = { ArrowDown: at.value + 1, ArrowLeft: at.value - 1, ArrowRight: at.value + 1, ArrowUp: at.value - 1, End: last, Home: 0 }[event.key]
    if (to === undefined) return
    event.preventDefault()
    at.value = (to + PASSED.length) % PASSED.length
    ;((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role=tab]')[at.value])?.focus()
  }
}

/**
 * Draws the switch of the four measures, a bar gliding under the one picked.
 */
function tabs(at: { value: number }): VNode {
  return h('div', {
    'aria-label' : 'Measures',
    'class'      : 'relative grid grid-cols-4 rounded-[999px] border border-rule bg-raised p-1 [grid-area:switch]',
    'onKeydown'  : arrows(at),
    'role'       : 'tablist'
  }, [
    h('span', {
      'aria-hidden' : 'true',
      'class'       : [
        'pointer-events-none absolute bottom-0 left-[calc(0.25rem+1.25rem)] h-0.5 w-[calc((100%-0.5rem)/4-2.5rem)]',
        'rounded-full bg-run transition-transform duration-glide ease-glide'
      ],
      'style'       : { transform: `translateX(calc(${at.value} * (100% + 2.5rem)))` }
    }),
    ...PASSED.map((passed, index) => {
      const picked = index === at.value
      return h('button', {
        'aria-label'    : passed.name,
        'aria-selected' : String(picked),
        'class'         : [
          'relative cursor-pointer rounded-[999px] px-2 py-2 text-center focus-ring',
          'transition-colors duration-glide',
          picked ? 'bg-tint text-run' : 'text-quiet hover:bg-tint/50 hover:text-ink'
        ],
        'onClick'       : () => { at.value = index },
        'role'          : 'tab',
        'tabindex'      : picked ? 0 : -1,
        'title'         : passed.name,
        'type'          : 'button'
      }, segment(passed, picked))
    })
  ])
}

/**
 * The widget Matches the Rule Passes Over compares its measures with: one
 * switch of the four measures, each segment its picture over a bar of its
 * share, and beneath it the picked measure's share counting to its figure over
 * a hundred squares, then the match its rule names and what it passes over,
 * every measure set in one cell so the widget keeps one height whichever is
 * picked.
 */
export const Passes = defineComponent({
  name: 'ScotchPasses',

  setup: () => {
    const { moving } = useMotion()
    const at         = shallowRef(1)
    const count      = useTransition(computed(() => PASSED[at.value]!.share), {
      disabled   : computed(() => !moving.value),
      duration   : 520,
      transition : TransitionPresets.easeOutCubic
    })

    return (): VNode => h('div', {
      class: [
        CARD,
        'gap-x-8 gap-y-5',
        '[grid-template-areas:"switch"_"figure"_"strips"]',
        'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:[grid-template-areas:"switch_switch"_"figure_strips"]',
        'lg:grid-cols-[minmax(0,1fr)] lg:[grid-template-areas:"switch"_"figure"_"strips"]'
      ]
    }, [
      tabs(at),
      stacked(at.value, PASSED.map((passed, index) => h('div', {
        class: [
          'grid content-start justify-items-center gap-3 text-center',
          'lg:grid-cols-[12rem_16rem] lg:items-center lg:justify-center lg:gap-x-8 lg:text-left'
        ]
      }, [
        h('div', { class: 'grid gap-1 lg:order-2 lg:max-w-56' }, [
          h('span', { class: [CAPS, 'text-run'] }, passed.name),
          h('span', { 'aria-hidden': 'true', 'class': 'font-display text-[3rem]/[1] text-ink tabular-nums' },
            `${index === at.value ? Math.round(count.value) : passed.share}%`),
          h('span', { 'aria-live': index === at.value ? 'polite' : undefined, 'class': 'sr-only' }, `${passed.share}%`),
          h('p', { class: NOTE }, `of ${counted(MATCHED)} sampled games, where ${passed.clause}.`)
        ]),
        waffle(passed.share, moving.value)
      ])), '[grid-area:figure]'),
      stacked(at.value, PASSED.map((passed, index) => h('div', { class: 'grid content-start gap-4' }, strips(passed, index))),
        'border-rule [grid-area:strips] lg:border-t lg:pt-4')
    ])
  }
})
