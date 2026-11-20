import { type VNode, defineComponent, h } from 'vue'

/**
 * The ten digits a place's reel stacks, top to bottom.
 */
const DIGITS = [...'0123456789']

/**
 * The count's face, its line height the height of one digit of a reel.
 */
const COUNT = [
  '[--sc-front-line:36px] inline-block whitespace-nowrap',
  'font-display text-[2.25rem]/(--sc-front-line) font-normal lining-nums tabular-nums'
]

/**
 * Draws one character of a figure, a digit as a reel of the ten digits rolled
 * to it and any other character as itself, keyed by `from`, its place counted
 * from the right, so the units digit keeps its reel as the figure widens.
 */
function place(char: string, from: number): VNode {
  return /\d/u.test(char)
    ? h('span', { class: 'inline-block h-(--sc-front-line) [clip-path:inset(0)]', key: `digit-${from}` },
        h('span', {
          'data-reel' : '',
          'style'     : { '--sc-front-digit': char },
          'class'     : [
            'flex flex-col *:text-center starting:translate-y-0',
            'translate-y-[calc(var(--sc-front-digit)*var(--sc-front-line)*-1)] transition-[translate]',
            'duration-settle'
          ]
        }, DIGITS.map(digit => h('span', digit))))
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
    if (!props.figure) return h('span', { class: COUNT }, h('span', {
      'data-wait' : '',
      'class'     : 'inline-block h-[3px] w-[0.9em] rounded-[2px] bg-(--sc-entry) align-[0.32em] '
                  + 'playing:animate-wait'
    }))
    const chars  = [...props.figure]
    const places = chars.map((char, index) => place(char, chars.length - index))
    return h('span', { class: COUNT }, [
      h('span', { 'aria-hidden': 'true', 'class': 'inline-flex' }, places),
      h('span', { 'class': 'sr-only', 'data-spoken': '' }, props.figure)
    ])
  }
})
