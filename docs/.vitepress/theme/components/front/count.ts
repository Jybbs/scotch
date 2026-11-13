import { type VNode, defineComponent, h } from 'vue'

/**
 * The ten digits a place's reel stacks, top to bottom.
 */
const DIGITS = [...'0123456789']

/**
 * Draws one character of a figure, a digit as a reel of the ten digits rolled
 * to it and any other character as itself, keyed by `from`, its place counted
 * from the right, so the units digit keeps its reel as the figure widens.
 */
function place(char: string, from: number): VNode {
  return /\d/u.test(char)
    ? h('span', { class: 'sc-front-place', key: `digit-${from}` },
        h('span', { class: 'sc-front-reel', style: { '--sc-front-digit': char } },
          DIGITS.map(digit => h('span', digit))))
    : h('span', { key: `mark-${from}` }, char)
}

/**
 * The count a front page widget opens on, in the display face, each digit
 * place a reel that rolls to its new digit as the figure changes, and a
 * pulsing bar in the section's color while the figure is empty. A screen
 * reader reads the figure from a hidden copy rather than from the reels.
 */
export const Count = defineComponent({
  name: 'ScotchFrontCount',

  props: {
    figure: { required: true, type: String }
  },

  setup: props => (): VNode => {
    if (!props.figure) return h('span', { class: 'sc-front-count' }, h('span', { class: 'sc-front-wait' }))
    const chars  = [...props.figure]
    const places = chars.map((char, index) => place(char, chars.length - index))
    return h('span', { class: 'sc-front-count' }, [
      h('span', { 'aria-hidden': 'true', 'class': 'sc-front-reels' }, places),
      h('span', { class: 'sc-front-spoken' }, props.figure)
    ])
  }
})
