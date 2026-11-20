import { type VNode, h } from 'vue'

/**
 * Sets the starting position where a move would otherwise stand: the bar and
 * triangle of the control a chess program steps back to the first position
 * with, at the size of the text beside it, then Start in mono capitals, both in
 * the color of the text around them.
 */
export function startMark(): VNode {
  return h('span', { 'class': 'inline-flex items-center gap-[0.3em] whitespace-nowrap', 'data-start': '' }, [
    h('svg', {
      'aria-hidden' : 'true',
      'class'       : 'size-[1.15em] flex-none fill-current',
      'viewBox'     : '0 0 16 16'
    }, [
      h('rect', { height: 10, rx: 0.5, width: 1.8, x: 2.5, y: 3 }),
      h('path', { d: 'M13.5 3.4v9.2L5.6 8z' })
    ]),
    h('span', {
      class: 'font-code text-[0.82em]/none font-semibold tracking-[0.1em] normal-nums uppercase'
    }, 'Start')
  ])
}
