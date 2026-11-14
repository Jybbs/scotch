import { type VNode, h } from 'vue'

/**
 * Sets the starting position where a move would otherwise stand: the bar and
 * triangle of the control a chess program steps back to the first position
 * with, at the size of the text beside it, then Start in mono capitals, both in
 * the color of the text around them.
 */
export function startMark(): VNode {
  return h('span', { class: 'sc-start' }, [
    h('svg', { 'aria-hidden': 'true', 'class': 'sc-start-glyph', 'viewBox': '0 0 16 16' }, [
      h('rect', { height: 10, rx: 0.5, width: 1.8, x: 2.5, y: 3 }),
      h('path', { d: 'M13.5 3.4v9.2L5.6 8z' })
    ]),
    h('span', { class: 'sc-start-label' }, 'Start')
  ])
}
