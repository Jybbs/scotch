import { type VNode, defineComponent, h, shallowRef } from 'vue'

import refused from '../../../lib/rendered/refused.json' with { type: 'json' }

/**
 * The id of the slip a phrase unfolds, which each phrase's button controls.
 */
const SLIP = 'sc-refused-slip'

/**
 * Sets each code span `stops.toml` writes between backticks, and each option
 * such as `--game`, in the code face, keeping an option and its number on one
 * line.
 */
function coded(text: string): (VNode | string)[] {
  const parts = text.split(/`([^`]+)`|(--[a-z]+(?: \d+)?)/u)
  return parts.flatMap<VNode | string>((part: string | undefined, at) => {
    if (!part) return []
    return at % 3 ? [h('code', { class: 'sc-refused-code' }, part)] : [part]
  })
}

/**
 * Draws the slip a phrase unfolds: the check the file fails, the message the
 * command prints to stderr, when it prints, and what clears it.
 */
function slip(at: number): VNode {
  const { check, clears, message, when } = refused[at]!
  return h('div', {
    'aria-label' : `Refusal ${at + 1}`,
    'class'      : 'sc-refused-slip',
    'id'         : SLIP,
    'role'       : 'region'
  }, [
    h('b', check),
    h('code', { class: 'sc-refused-message' }, message),
    h('dl', [
      h('div', [h('dt', 'When'), h('dd', coded(when))]),
      h('div', [h('dt', 'Clears it'), h('dd', coded(clears))])
    ])
  ])
}

/**
 * The games `scotch match game` refuses, as one sentence whose phrases each
 * unfold the message the command prints for that case and what clears it on a
 * slip beneath the sentence, one at a time, in the order the command checks
 * for them.
 */
export const Refused = defineComponent({
  name: 'ScotchDataRefused',

  setup: () => {
    const open = shallowRef<number | null>(null)
    const last = refused.length - 1

    return (): VNode => h('div', { class: 'sc-data-refused sc-refused' }, [
      h('p', { class: 'sc-refused-said' }, [
        'A match refuses a file that ',
        ...refused.flatMap(({ phrase }, at) => [
          h('span', { class: 'sc-refused-held' }, [
            h('button', {
              'aria-controls' : SLIP,
              'aria-expanded' : String(open.value === at),
              'class'         : 'sc-refused-term',
              'onClick'       : () => { open.value = open.value === at ? null : at },
              'type'          : 'button'
            }, coded(phrase)),
            at === last ? '.' : ','
          ]),
          at === last ? '' : at === last - 1 ? ' or ' : ' '
        ])
      ]),
      open.value === null ? h('div', { id: SLIP }) : slip(open.value)
    ])
  }
})
