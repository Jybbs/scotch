import { useData }                                                from 'vitepress'
import { type Ref, type VNode, computed, defineComponent, h, ref } from 'vue'

import type * as chrome  from '../../lib/config/chrome.ts'
import { ringed, svgOf } from '../../lib/site/pieces.ts'

/**
 * Which well a pointer rests on and which piece the keyboard or a press last
 * chose, beside the one piece the arrow keys stop on.
 */
interface Choice {
  focus : Ref<number | null>
  hover : Ref<number | null>
  stop  : Ref<number>
}

/**
 * Where each key moving between the pieces sends the keyboard's focus, from
 * the piece it stops on among the count the set holds.
 */
const STEPS: Readonly<Record<string, (at: number, count: number) => number>> = {
  ArrowDown  : at => at + 1,
  ArrowLeft  : at => at - 1,
  ArrowRight : at => at + 1,
  ArrowUp    : at => at - 1,
  End        : (_, count) => count - 1,
  Home       : () => 0
}

/**
 * Moves the keyboard's focus between the pieces on the arrow keys, Home, and
 * End, wrapping at either end, so the set takes one stop on Tab.
 */
function roved(event: KeyboardEvent, choice: Choice, count: number): void {
  const to = STEPS[event.key]?.(choice.stop.value, count)
  if (to === undefined) return
  event.preventDefault()
  choice.stop.value = (to + count) % count
  const tray = (event.currentTarget as HTMLElement).querySelectorAll('button')
  tray[choice.stop.value]?.focus()
}

/**
 * Sets one run of a line, linking its address where it names one.
 */
function runOf(run: chrome.Run): string | VNode {
  if (typeof run === 'string') return run
  const text = run.code ? h('code', run.text) : run.italic ? h('i', run.text) : run.text
  return run.href === undefined ? text : h('a', { href: run.href }, [text])
}

/**
 * Lets a fact in short break after each slash, as a repository's owner and
 * name do in a narrow well.
 */
function slashed(short: string): (string | VNode)[] {
  return short.split('/').flatMap((part, i) => i === 0 ? [part] : ['/', h('wbr'), part])
}

/**
 * Draws one well of the tray, its piece a button over the fact's label and the
 * fact in short, lit while it is the one the line beneath spells out.
 */
function wellOf(credit: chrome.Credit, index: number, choice: Choice, shown: number | null): VNode {
  const choose = (): void => {
    choice.focus.value = index
    choice.stop.value  = index
  }
  return h('div', {
    class          : ['sc-colophon-well', { 'is-shown': shown === index }],
    onPointerenter : () => { choice.hover.value = index },
    onPointerleave : () => { choice.hover.value = null }
  }, [
    h('button', {
      'aria-label' : `${credit.name}, ${credit.part.toLowerCase()}, ${credit.short}`,
      'class'      : 'sc-colophon-piece',
      'innerHTML'  : svgOf(ringed(credit.piece, '')),
      'onClick'    : choose,
      'onFocus'    : choose,
      'tabindex'   : choice.stop.value === index ? 0 : -1,
      'type'       : 'button'
    }),
    h('span', { class: 'sc-colophon-part' }, credit.part),
    h('b', { class: 'sc-colophon-short' }, slashed(credit.short))
  ])
}

/**
 * The colophon closing every page: a tray of white pieces, each standing over
 * one fact, and a line beneath naming the version and the license the code
 * carries until a piece is chosen. Resting a pointer on a well or moving the
 * keyboard's focus to its piece lifts the piece and spells its fact out in full
 * on the line, which holds while the focus moves on into that line's links and
 * clears once it leaves the colophon.
 */
export const Colophon = defineComponent({
  name  : 'SiteColophon',
  setup : () => {
    const { theme }      = useData<chrome.SiteTheme>()
    const choice: Choice = { focus: ref(null), hover: ref(null), stop: ref(0) }
    const shown          = computed(() => choice.hover.value ?? choice.focus.value)
    const left           = (event: FocusEvent): void => {
      const into   = event.relatedTarget
      const within = into instanceof Node && (event.currentTarget as HTMLElement).contains(into)
      if (!within) choice.focus.value = null
    }

    return (): VNode => {
      const { credits, rest } = theme.value.colophon
      const line              = credits[shown.value ?? -1]?.full ?? rest
      return h('footer', { class: 'sc-colophon', onFocusout: left }, [
        h('div', {
          'aria-label' : 'The set, each piece over one fact',
          'class'      : 'sc-colophon-tray',
          'onKeydown'  : (event: KeyboardEvent) => { roved(event, choice, credits.length) },
          'role'       : 'group'
        }, credits.map((credit, index) => wellOf(credit, index, choice, shown.value))),
        h('p', { 'aria-live': 'polite', 'class': 'sc-colophon-line' }, line.map(run => runOf(run)))
      ])
    }
  }
})
