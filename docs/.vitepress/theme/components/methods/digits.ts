import { type VNode, h } from 'vue'

import { grouped } from '../../../lib/methods/keys.ts'

/**
 * A digit's cell in the sum.
 */
const CELL = 'block h-[22px] w-[1.05em] rounded-[3px] text-center font-code text-[0.82rem]/[22px] '
           + 'font-medium text-ink tabular-nums lg:w-[9px] lg:@min-[680px]:w-[11px]'
/**
 * A key's four groups of digits on one line, closing up with their cells.
 */
const GROUPS = 'inline-flex gap-x-2.5 lg:gap-x-[5px] lg:@min-[680px]:gap-x-[7px]'
/**
 * The sixteen hexadecimal digits in order, the strip each reel rolls along.
 */
const HEXES = '0123456789ABCDEF'
/**
 * The height in pixels each reel steps by from one digit to the next, the
 * height of a cell.
 */
const STEP = 22

/**
 * Draws a key as its sixteen hexadecimal digits in four groups, each digit
 * `turned` names washed.
 */
export function cells(key: string, turned: (index: number) => boolean = () => false): VNode {
  return h('span', { 'aria-label': grouped(key), 'class': GROUPS, 'role': 'img' },
    [0, 4, 8, 12].map(group => h('span', { 'aria-hidden': 'true', 'class': 'inline-flex gap-px' },
      [...key.slice(group, group + 4).toUpperCase()].map((digit, at) => h('span', {
        class: [CELL, 'transition-colors duration-glide', turned(group + at) ? 'bg-run/35' : 'bg-raised']
      }, digit)))))
}

/**
 * Draws a key as sixteen reels, one for each hexadecimal digit, each rolling
 * to its digit as the key changes, the reels a move turns rolling in turn and
 * washed.
 */
export function reels(key: string, before: string | undefined, moving: boolean): VNode {
  let turned = 0
  return h('span', { 'aria-label': grouped(key), 'class': GROUPS, 'role': 'img' },
    [0, 4, 8, 12].map(group => h('span', { 'aria-hidden': 'true', 'class': 'inline-flex gap-px' },
      [...key.slice(group, group + 4).toUpperCase()].map((digit, at) => {
        const rolls = before !== undefined && before[group + at] !== key[group + at]
        const order = rolls ? turned++ : 0
        return h('span', {
          class: [CELL, 'relative overflow-hidden transition-colors duration-glide', rolls ? 'bg-run/22' : 'bg-raised']
        }, h('span', {
          class : ['absolute inset-x-0 top-0 grid', moving ? 'transition-transform duration-glide ease-glide' : ''],
          style : {
            transform       : `translateY(${-HEXES.indexOf(digit) * STEP}px)`,
            transitionDelay : moving ? `${order * 22}ms` : '0ms'
          }
        }, [...HEXES].map(each => h('span', { class: 'block h-[22px]' }, each))))
      }))))
}
