import { type VNode, defineComponent, h } from 'vue'

import * as handoff      from '../../../lib/data/handoff.ts'
import { SHADE, hexOf }  from '../../../lib/front/example.ts'

/**
 * The arrow between two stops of a step, pointing down the column on a narrow
 * card and across the row on a wide one.
 */
const ARROW = [
  "before:absolute before:top-[calc(var(--sc-handoff-arrow)*-1)] before:left-6 before:content-['↓']",
  'before:font-code before:text-[1rem]/(--sc-handoff-arrow) before:font-medium before:text-run',
  '@min-[36rem]:before:top-3.5 @min-[36rem]:before:left-[calc(var(--sc-handoff-arrow)*-1-1px)]',
  "@min-[36rem]:before:w-(--sc-handoff-arrow) @min-[36rem]:before:text-center "
+ "@min-[36rem]:before:content-['→']"
]
/**
 * The command a step runs, ruled at its left beneath the step's stops on a
 * narrow card, and right-aligned in the first column and ruled at its right on
 * a wide one.
 */
const COMMAND = [
  'order-[-1] m-0! flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 border-l-2 border-l-run py-0.5 pr-0',
  'pl-3',
  'font-body text-[0.8125rem]/[20px]! font-normal text-quiet [&_code]:text-[0.8125rem]!',
  '@min-[36rem]:col-[1] @min-[36rem]:grid @min-[36rem]:content-start @min-[36rem]:justify-items-end',
  '@min-[36rem]:gap-1.5 @min-[36rem]:border-r-2 @min-[36rem]:border-r-run @min-[36rem]:[border-left:0]',
  '@min-[36rem]:pt-3.5 @min-[36rem]:pr-3.5',
  '@min-[36rem]:pb-0 @min-[36rem]:pl-0 @min-[36rem]:text-right'
]
/**
 * The color each verb's tag takes.
 */
const VERB = { prints: 'bg-ink', writes: 'bg-run' } as const

/**
 * Splits a path at each slash so it wraps there and nowhere else.
 */
function path(text: string): (VNode | string)[] {
  return text.split('/').flatMap((part, at) => at ? [h('wbr'), `/${part}`] : [part])
}

/**
 * Draws one position key as a fingerprint of its 16 hex digits, one shade per
 * digit, as the front page draws a game's keys, or an empty frame where the
 * position is not one the submitted game shares.
 */
function print(key: string | undefined): VNode {
  const digits = key ? [...hexOf(key)] : []
  return h('span', {
    'class'    : 'grid aspect-[1] grid-cols-[repeat(4,1fr)] gap-px rounded-xs p-px *:rounded-[0.5px] '
               + '*:bg-ink [box-shadow:inset_0_0_0_1px_var(--sc-rule)] '
               + 'data-lit:[box-shadow:inset_0_0_0_1px_var(--sc-stored)]',
    'data-lit' : key ? '' : undefined
  }, digits.map(digit =>
    h('i', { style: { opacity: String(SHADE.least + Number.parseInt(digit, 16) * SHADE.step) } })))
}

/**
 * Draws what a stop holds of the demo's stored game.
 */
function drawn(shown: handoff.Drawn): VNode {
  switch (shown.kind) {
    case 'path':
      return h('span', { class: 'font-code text-[0.875rem]/[20px] font-medium' }, path(shown.text))
    case 'prints':
      return h('div', {
        'aria-label' : `${shown.count} keys, the first ${shown.keys.length} shared`,
        'class'      : 'my-1 grid grid-cols-[repeat(auto-fill,14px)] gap-[3px]',
        'role'       : 'img'
      }, Array.from({ length: shown.count }, (_, at) => print(shown.keys[at])))
    case 'report':
      return h('pre', {
        class: 'my-1 rounded-md bg-raised px-3 py-2.5 font-code text-[0.75rem]/[18px] font-normal '
             + 'wrap-anywhere whitespace-pre-wrap'
      }, shown.lines.join('\n'))
    case 'row':
      return h('dl', {
        class: 'mx-0 my-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 font-body '
             + 'text-[0.8125rem]/[20px] font-normal'
      }, shown.rows.flatMap(([term, value]) => [
        h('dt', {
          class: 'font-code text-[0.75rem]/[20px] font-medium tracking-[0.1em] text-quiet uppercase'
        }, term),
        h('dd', { class: 'm-0' }, value)
      ]))
  }
}

/**
 * Draws one stop: the verb and the name of what it is, the drawing of the
 * stored game in it, and the line saying what that is.
 */
function stop({ drawn: shown, line, name, verb }: handoff.Stop, index: number): VNode {
  return h('li', {
    'class'     : [
      'relative grid min-w-0 content-start gap-1 rounded-md border border-rule bg-page px-4 py-3.5',
      index > 0 ? ARROW : null
    ],
    'data-verb' : verb
  }, [
    h('span', {
      class: 'grid justify-items-start gap-1 font-code text-[0.75rem]/[18px] font-medium tracking-[0.1em] '
           + 'text-quiet uppercase'
    }, [
      h('span', { class: ['rounded-sm px-1.5 py-px text-page', VERB[verb]] }, handoff.VERBS[verb]),
      h('span', { class: 'font-medium tracking-[0] text-ink normal-case' }, path(name))
    ]),
    drawn(shown),
    h('span', { class: 'font-body text-[0.8125rem]/[20px] font-normal text-quiet' }, line)
  ])
}

/**
 * The store's flow on the Guide's store page: each command numbered beside
 * what it writes or prints of the demo match's stored game, and between two
 * steps a line saying what the later one reads of the earlier one's files.
 */
export const Handoff = defineComponent({
  name: 'ScotchDataHandoff',

  setup: () => (): VNode => h('div', { class: '@container' }, h('ol', {
    'aria-label' : 'From the fetched files to a match',
    'class'      : 'm-0! grid list-none! gap-(--sc-handoff-arrow) p-0! [--sc-handoff-arrow:28px] '
                 + '[&_li+li]:mt-0! @min-[36rem]:grid-cols-[12rem_minmax(0,1fr)] @min-[36rem]:gap-x-5'
  }, handoff.legs.map(({ command, does, handed, stops }, at) => h('li', {
    class : 'relative grid gap-2 @min-[36rem]:col-span-full @min-[36rem]:grid-cols-subgrid '
          + '@min-[36rem]:gap-y-2.5',
    style : { '--sc-handoff-stops': stops.length }
  }, [
    handed
      ? h('p', {
          class: 'order-[-2] m-0! flex flex-wrap items-baseline gap-x-1.5 gap-y-0 font-body '
               + 'text-[0.8125rem]/[20px]! font-normal text-quiet @min-[36rem]:col-[2] @min-[36rem]:row-[1]'
        }, [
          h('span', {
            'aria-hidden' : 'true',
            'class'       : 'font-code text-[1rem]/[20px] font-semibold text-run'
          }, '↓'),
          handed
        ])
      : null,
    h('ol', {
      class: [
        'm-0! grid list-none! gap-(--sc-handoff-arrow) p-0! @min-[36rem]:col-[2]',
        '@min-[36rem]:grid-cols-[repeat(var(--sc-handoff-stops),minmax(0,1fr))]',
        at ? '@min-[36rem]:row-[2]' : '@min-[36rem]:row-[1]'
      ]
    }, stops.map((each, index) => stop(each, index))),
    h('p', { class: [COMMAND, at ? '@min-[36rem]:row-[1/span_2]' : '@min-[36rem]:row-[1]'] }, [
      h('span', {
        class: 'inline-flex items-center gap-2 font-code text-[0.75rem]/[24px] font-medium tracking-[0.1em] '
             + 'whitespace-nowrap text-quiet uppercase @min-[36rem]:flex-row-reverse'
      }, [
        h('b', {
          class: 'grid size-6 place-items-center rounded-full bg-run font-code text-[0.8125rem]/none '
               + 'font-semibold tracking-[0] text-page'
        }, String(at + 1)),
        `Step ${at + 1} of ${handoff.legs.length}`
      ]),
      h('code', command),
      h('span', { class: 'basis-full' }, does)
    ])
  ]))))
})
