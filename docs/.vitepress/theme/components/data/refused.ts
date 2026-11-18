import { type VNode, defineComponent, h, shallowRef } from 'vue'

import refused from '../../../lib/rendered/refused.json' with { type: 'json' }

/**
 * A term of the slip, in capitals of the code face.
 */
const LABEL = 'font-code text-[0.75rem]/[1.4] font-medium tracking-[0.1em] text-quiet uppercase'
/**
 * A command named inside a phrase, clear of the page's chip.
 */
const NAMED = 'bg-transparent! bg-none! p-0! text-[0.9em]! whitespace-nowrap text-inherit!'
/**
 * The id of the slip a phrase unfolds, which each phrase's button controls.
 */
const SLIP = 'sc-refused-slip'
/**
 * The sweep beneath a phrase, a dotted rule the run's color fills from the
 * left while the phrase is pointed at, focused, or unfolded.
 */
const TERM = [
  'inline cursor-pointer border-0 bg-transparent px-0 pt-0 pb-0.5 [font:inherit] whitespace-normal text-ink',
  '[--sc-sweep:0%] transition-[color] duration-fade ease-glide',
  '[background-image:repeating-conic-gradient(var(--sc-page)_0_25%,transparent_0_50%),linear-gradient(90deg,var(--sc-run)_var(--sc-sweep),color-mix(in_oklab,currentColor_62%,var(--sc-page))_0)]',
  '[background-position:0_100%,0_100%] [background-repeat:repeat-x,no-repeat]',
  '[background-size:4px_4px,100%_4px]',
  '[&:hover]:text-run [&:hover]:[--sc-sweep:100%] focus-visible:text-run focus-visible:[--sc-sweep:100%]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-run',
  'aria-expanded:text-run aria-expanded:[--sc-sweep:100%]'
]

/**
 * Sets each code span `stops.toml` writes between backticks, and each option
 * such as `--game`, in the code face, keeping an option and its number on one
 * line.
 */
function coded(text: string): (VNode | string)[] {
  const parts = text.split(/`([^`]+)`|(--[a-z]+(?: \d+)?)/u)
  return parts.flatMap<VNode | string>((part: string | undefined, at) => {
    if (!part) return []
    return at % 3
      ? [h('code', { class: NAMED }, part)]
      : [part]
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
    'class'      : 'grid animate-unfold gap-2 rounded-[5px] border border-rule bg-raised px-3 pt-2.5 pb-3',
    'id'         : SLIP,
    'role'       : 'region'
  }, [
    h('b', { class: 'font-display text-[1rem]/[1.25] font-normal text-run' }, check),
    h('code', {
      class: 'bg-transparent! bg-none! p-0! font-code text-[0.82rem]/[1.5]! font-medium wrap-anywhere '
           + 'text-alert! [font-variant-ligatures:none]'
    }, message),
    h('dl', {
      class: 'm-0 grid grid-cols-[minmax(0,1fr)] gap-2.5 p-0 '
           + '@min-[34rem]:grid-cols-[repeat(2,minmax(0,1fr))] @min-[34rem]:gap-5'
    }, ([['When', when], ['Clears it', clears]] as const).map(([term, text]) => h('div', [
      h('dt', { class: LABEL }, term),
      h('dd', { class: 'mx-0 mt-0.5 mb-0 p-0 font-body text-[0.875rem]/[1.45] font-normal' }, coded(text))
    ])))
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

    return (): VNode => h('div', { class: '@container grid gap-3.5 text-ink' }, [
      h('p', { class: 'm-0! p-0 font-body text-[1.0625rem]/[1.9]! font-normal' }, [
        'A match refuses a file that ',
        ...refused.flatMap(({ phrase }, at) => [
          h('span', { class: 'whitespace-nowrap' }, [
            h('button', {
              'aria-controls' : SLIP,
              'aria-expanded' : String(open.value === at),
              'class'         : TERM,
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
