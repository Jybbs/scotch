import { type VNode, h } from 'vue'

import type { Player } from '../../../lib/methods/stepping.ts'

/**
 * A step button, a pill in the run's color, filled while it plays and quieted
 * while it goes nowhere.
 */
export const BUTTON = [
  'h-[26px] cursor-pointer rounded-[999px] border border-rule bg-raised px-3 py-0 font-code',
  'text-[0.6rem]/[24px] font-semibold tracking-[0.1em] text-run uppercase duration-move ease-glide',
  'transition-[border-color,background-color,color] hover:border-run disabled:cursor-default',
  'disabled:border-rule disabled:text-quiet aria-pressed:border-run aria-pressed:bg-run',
  'aria-pressed:text-page focus-ring'
]
/**
 * A label in mono capitals, as the widgets set their status lines and heads.
 */
export const CAPS = 'font-code text-[0.6rem]/[16px] font-semibold tracking-[0.1em] uppercase'
/**
 * The widgets' card, ruled and set on the page's ground.
 */
export const CARD = 'grid items-start gap-y-4 rounded-md border border-rule bg-page p-4'
/**
 * The text of each game in its own color, mixed with the ink so it reads on
 * either ground.
 */
export const GAME_TEXT = {
  stored    : 'text-[color-mix(in_oklab,var(--sc-stored)_60%,var(--sc-ink))]',
  submitted : 'text-[color-mix(in_oklab,var(--sc-submitted)_60%,var(--sc-ink))]'
} as const
/**
 * A sentence beside a drawing, set small and quiet.
 */
export const NOTE = 'm-0! font-body text-[0.8125rem]/[19px]! text-quiet'

/**
 * Draws the button stepping a widget a ply back or on, quieted where it would
 * step past either end.
 */
function stepper(player: Player, by: -1 | 1, stuck: boolean): VNode {
  return h('button', {
    class    : BUTTON,
    disabled : stuck,
    onClick  : () => player.step(by),
    type     : 'button'
  }, by < 0 ? 'Back' : 'Next')
}

/**
 * Draws the buttons a widget steps with: play or pause, the ply before, and
 * the ply after.
 */
export function controls(player: Player, last: number): VNode {
  return h('div', { class: 'flex flex-wrap items-center gap-2' }, [
    h('button', {
      'aria-pressed' : String(player.playing.value),
      'class'        : BUTTON,
      'onClick'      : player.toggle,
      'type'         : 'button'
    }, player.playing.value ? 'Pause' : 'Play'),
    stepper(player, -1, player.ply.value === 0),
    stepper(player, 1, player.ply.value === last)
  ])
}

/**
 * Sets each layer in one cell and shows only the one at `shown`, so the cell
 * keeps the height of its tallest layer whichever is in view.
 */
export function stacked(shown: number, layers: readonly VNode[], place = ''): VNode {
  return h('div', { class: ['grid', place] }, layers.map((layer, at) => h('div', {
    'aria-hidden' : at === shown ? undefined : 'true',
    'class'       : ['min-w-0 [grid-area:1/1]', at === shown ? '' : 'invisible']
  }, [layer])))
}
