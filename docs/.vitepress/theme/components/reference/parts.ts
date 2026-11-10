import { type VNode, type VNodeChild, h } from 'vue'

import type { NodeRef } from '../../../lib/reference/timeline.ts'

interface Stepping {
  at    : number
  cell? : (index: number) => VNode
  names : readonly string[]
  pick  : (index: number) => void
}

/**
 * Draws the root of a Reference drawing, marked for the narrow form its
 * stylesheet reads, on the element its chart measures.
 */
export function stage(chart: NodeRef, narrow: boolean, children: VNodeChild[]): VNode {
  return h('div', { 'class': 'sc-ref', 'data-narrow': narrow ? '' : undefined, 'ref': chart }, children)
}

/**
 * Sets every state of a panel in one cell of a grid, the state at `at` shown and
 * the others hidden, so the panel always stands as tall as its tallest state and
 * a pick moves nothing beneath it.
 */
export function stacked(states: readonly VNodeChild[], at: number): VNode {
  return h('div', { class: 'sc-ref-stack' }, states.map((state, index) =>
    h('div', { 'aria-hidden': index === at ? undefined : 'true', 'data-at': index === at ? '' : undefined }, [state])))
}

/**
 * Draws Back, Next, the reading of the place, and a rank of cells a reader
 * presses, stepping through a named list and wrapping at either end. Every
 * reading stands in one stack, so a step to a longer name moves nothing.
 */
export function stepper({ at, cell, names, pick }: Stepping): VNode {
  const count = names.length
  return h('div', { class: 'sc-ref-step' }, [
    h('button', {
      class   : 'sc-ref-button',
      onClick : () => {
        pick((at - 1 + count) % count)
      },
      type    : 'button'
    }, 'Back'),
    h('output', { 'aria-live': 'polite' }, [
      stacked(names.map((name, index) => [h('span', `${index + 1} of ${count} · `), name]), at)
    ]),
    h('button', {
      class   : 'sc-ref-button',
      onClick : () => {
        pick((at + 1) % count)
      },
      type    : 'button'
    }, 'Next'),
    h('div', { class: cell ? 'sc-ref-cells' : 'sc-ref-dots' }, names.map((name, index) => cell?.(index) ?? h('button', {
      'aria-current' : index === at ? 'step' : undefined,
      'aria-label'   : name,
      'data-seen'    : index < at ? '' : undefined,
      'onClick'      : () => {
        pick(index)
      },
      'type'         : 'button'
    })))
  ])
}
