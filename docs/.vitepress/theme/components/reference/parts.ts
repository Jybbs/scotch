import { type VNode, type VNodeChild, h } from 'vue'

import type { NodeRef } from '../../../lib/reference/timeline.ts'

interface Stepping {
  at    : number
  cell? : (index: number) => VNode
  names : readonly string[]
  pick  : (index: number) => void
}

/**
 * The bed setting a drawing beside the column reading it, one over the other
 * on a narrow drawing.
 */
export const BED = 'grid grid-cols-2 items-start gap-5 in-data-narrow:grid-cols-1 in-data-narrow:gap-3'

/**
 * The column a drawing's bed sets beside the drawing.
 */
export const BESIDE = 'grid min-w-0 content-start gap-[11px]'

/**
 * A Reference drawing's outlined button.
 */
export const BUTTON = 'rounded-sm border border-rule px-2.5 py-[7px] font-code text-[0.7rem]/none font-medium '
                    + 'whitespace-nowrap text-quiet normal-nums transition-[color] hover:text-ink'

/**
 * The name a Reference drawing heads its pick with.
 */
export const NAME = 'm-0 border-0 p-0 font-display text-[1.25rem]/[1.25] font-normal tracking-normal text-ink normal-nums'

/**
 * The sentence saying what a Reference drawing's pick is.
 */
export const SAY = 'font-body text-[0.875rem]/[1.45] text-quiet normal-nums'

/**
 * The small print of a Reference drawing, in the code face.
 */
export const SMALL = 'font-code text-[0.66rem]/[1.35] font-medium tracking-[0.01em] text-quiet normal-nums'

/**
 * Draws the root of a Reference drawing, marked for the narrow form its
 * utilities read, on the element its chart measures.
 */
export function stage(chart: NodeRef, narrow: boolean, children: VNodeChild[]): VNode {
  return h('div', {
    'class'       : 'relative grid min-w-0 gap-3.5 tabular-nums *:min-w-0 [&_p]:m-0! '
                  + '[&_[data-off]]:opacity-0',
    'data-narrow' : narrow ? '' : undefined,
    'ref'         : chart
  }, children)
}

/**
 * Sets every state of a panel in one cell of a grid, the state at `at` shown and
 * the others hidden, so the panel always stands as tall as its tallest state and
 * a pick moves nothing beneath it.
 */
export function stacked(states: readonly VNodeChild[], at: number): VNode {
  return h('div', { class: 'grid' }, states.map((state, index) => h('div', {
    'aria-hidden' : index === at ? undefined : 'true',
    'class'       : 'invisible min-w-0 [grid-area:1/1] data-at:visible',
    'data-at'     : index === at ? '' : undefined
  }, [state])))
}

/**
 * The rank of cells a stepper draws in place of its dots, in one row, or in rows
 * of nine on a narrow drawing.
 */
const CELLS = 'col-span-full mt-1 grid auto-cols-[minmax(0,1fr)] grid-flow-col '
            + 'in-data-narrow:grid-flow-row in-data-narrow:grid-cols-[repeat(9,minmax(0,1fr))]'

/**
 * A stepper's dot, a bar in the rule's color, alternately lighter, tinted once
 * passed and raised in the run's color where the stepper stands.
 */
const DOT = [
  'grid h-[18px] min-w-0 flex-[1_1_0] items-center',
  "before:h-1 before:bg-rule before:transition-[background-color]",
  'even:before:bg-[color-mix(in_oklab,var(--sc-rule)_55%,var(--sc-page))]',
  'data-seen:before:bg-[color-mix(in_oklab,var(--sc-run)_42%,var(--sc-page))]',
  'aria-[current]:before:h-1.5 aria-[current]:before:bg-run'
]

/**
 * Draws Back, Next, the reading of the place, and a rank of cells a reader
 * presses, stepping through a named list and wrapping at either end. Every
 * reading stands in one stack, so a step to a longer name moves nothing.
 */
export function stepper({ at, cell, names, pick }: Stepping): VNode {
  const count = names.length
  return h('div', { class: 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1' }, [
    h('button', {
      class   : BUTTON,
      onClick : () => {
        pick((at - 1 + count) % count)
      },
      type    : 'button'
    }, 'Back'),
    h('output', {
      'aria-live' : 'polite',
      'class'     : 'overflow-hidden text-center font-code text-[0.74rem]/[1.3] font-medium whitespace-nowrap '
                  + 'text-ink normal-nums [&_span]:text-quiet'
    }, [
      stacked(names.map((name, index) => [h('span', `${index + 1} of ${count} · `), name]), at)
    ]),
    h('button', {
      class   : BUTTON,
      onClick : () => {
        pick((at + 1) % count)
      },
      type    : 'button'
    }, 'Next'),
    h('div', { class: cell ? CELLS : 'col-span-full flex' }, names.map((name, index) => cell?.(index) ?? h('button', {
      'aria-current' : index === at ? 'step' : undefined,
      'aria-label'   : name,
      'class'        : DOT,
      'data-seen'    : index < at ? '' : undefined,
      'onClick'      : () => {
        pick(index)
      },
      'type'         : 'button'
    })))
  ])
}
