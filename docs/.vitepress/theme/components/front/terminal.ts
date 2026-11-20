import { type VNode, h } from 'vue'

/**
 * The dark screen every terminal on the front page and in the Guide draws,
 * translucent over the front page's layer wherever the reader allows
 * transparency.
 */
export const SCREEN = [
  'grid overflow-hidden rounded-[9px] bg-dark text-ground [box-shadow:0_0_0_1px_var(--sc-rule)]',
  'in-[.VPHome]:bg-[color-mix(in_srgb,var(--sc-dark)_88%,transparent)]',
  'in-[.VPHome]:[backdrop-filter:blur(2px)]',
  'in-[.VPHome]:opaque:bg-dark in-[.VPHome]:opaque:[backdrop-filter:none]'
]

/**
 * The printed text of a terminal, in the code face.
 */
export const PRINTED = 'm-0 overflow-hidden px-4 py-3.5 font-code text-[0.875rem]/[1.75] font-normal '
                     + 'whitespace-pre-wrap'

/**
 * A line a command printed, set in from the prompt and dimmed beside it.
 */
export const OUT = 'pl-[2ch] text-[color-mix(in_oklab,var(--sc-ground)_70%,var(--sc-dark))]'

/**
 * Draws the prompt a command is typed behind, in bold where `bold` is set.
 */
export function prompt(text: string, bold = false): VNode {
  return h('span', { class: bold ? 'font-bold text-series-4' : 'text-series-4' }, text)
}

/**
 * Draws the block cursor, blinking while the drawings move.
 */
export function cursor(): VNode {
  return h('span', {
    'data-cursor' : '',
    'class'       : 'inline-block h-[1.05em] w-[0.55em] bg-ground align-[-0.18em] playing:animate-blink'
  })
}

/**
 * Draws one light of a window's title bar.
 */
function light(): VNode {
  return h('i', {
    class: 'size-[9px] rounded-[50%] bg-[color-mix(in_oklab,var(--sc-ground)_22%,var(--sc-dark))]'
  })
}

/**
 * Draws the three lights of a window's title bar beside the folder it is
 * open in.
 */
export function lights(): VNode[] {
  return [light(), light(), light(), h('span', { class: 'mx-auto' }, '~/scotch')]
}

/**
 * Draws a terminal's title bar over its contents, the bar's items laid out
 * by `layout`, hidden from a screen reader unless `hidden` is cleared for a
 * bar holding a control.
 */
export function bar(items: (VNode | null)[], hidden = true, layout = ''): VNode {
  return h('header', {
    'aria-hidden' : hidden ? 'true' : undefined,
    'class'       : [
      'flex items-center gap-[7px] px-3 font-code text-[0.65rem]/none font-medium tracking-[0.06em]',
      'bg-[color-mix(in_oklab,var(--sc-ground)_10%,var(--sc-dark))]',
      'text-[color-mix(in_oklab,var(--sc-ground)_62%,var(--sc-dark))]',
      'in-[.VPHome]:bg-[color-mix(in_srgb,var(--sc-ground)_8%,transparent)]',
      layout
    ]
  }, items)
}
