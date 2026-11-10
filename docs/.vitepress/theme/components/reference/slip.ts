import { useEventListener }                                            from '@vueuse/core'
import { type VNode, defineComponent, h, nextTick, shallowRef, useId } from 'vue'

import { slipAt }                       from '../../../lib/reference/slip.ts'
import { type Term, addressOf, termOf } from '../../../lib/reference/terms.ts'

const TERM = '.sc-term'

function termAt(event: Event): HTMLElement | null {
  return event.target instanceof Element ? event.target.closest<HTMLElement>(TERM) : null
}

/**
 * Opens a slip on the term under the pointer or the keyboard's focus, and closes
 * it as either leaves, on Escape, on a click that may leave the page, and as the
 * page scrolls.
 */
function useTermEvents(
  open   : (link: HTMLElement) => void,
  close  : () => void,
  onSlip : (target: Node) => boolean
): void {
  useEventListener('click', (event: MouseEvent) => {
    if (termAt(event) || (event.target instanceof Node && onSlip(event.target))) close()
  })
  useEventListener('focusin', (event: FocusEvent) => {
    const link = termAt(event)
    if (link) open(link)
  })
  useEventListener('focusout', (event: FocusEvent) => {
    if (termAt(event)) close()
  })
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') close()
  })
  useEventListener('pointerover', (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    const link = termAt(event)
    if (link) open(link)
    else if (!(event.target instanceof Node && onSlip(event.target))) close()
  })
  useEventListener('scroll', close, { passive: true })
}

/**
 * The one slip every term's link on a page opens, under the pointer or the
 * keyboard's focus, holding the term's name, its one sentence, and the link to
 * the terms page, and gliding from term to term once it is open.
 */
export const Slip = defineComponent({
  name  : 'ReferenceSlip',
  setup : () => {
    const id     = useId()
    const held   = shallowRef<HTMLElement | null>(null)
    const place  = shallowRef({ x: 0, y: 0 })
    const slip   = shallowRef<HTMLElement | null>(null)
    const term   = shallowRef<Term | undefined>()

    const close = (): void => {
      held.value?.removeAttribute('aria-describedby')
      held.value = null
    }
    const open = (link: HTMLElement): void => {
      const [from, name] = [held.value, link.dataset.term]
      if (from === link) return
      from?.removeAttribute('aria-describedby')
      held.value = link
      term.value = termOf(name)
      link.setAttribute('aria-describedby', id)
      void nextTick(() => {
        const zoom              = slip.value!.currentCSSZoom ?? 1
        const box               = link.getClientRects()[0] ?? link.getBoundingClientRect()
        const { height, width } = slip.value!.getBoundingClientRect()
        const { x, y }          = slipAt(
          { bottom: box.bottom / zoom, left: box.left / zoom, top: box.top / zoom },
          { height: height / zoom, width: width / zoom },
          { height: window.innerHeight / zoom, width: document.documentElement.clientWidth / zoom }
        )
        place.value = { x: Math.round(x), y: Math.round(y) }
      })
    }

    useTermEvents(open, close, target => slip.value?.contains(target) ?? false)

    return (): VNode => h('div', {
      'class'     : 'sc-slip',
      'data-open' : held.value ? '' : undefined,
      'id'        : id,
      'ref'       : slip,
      'role'      : 'tooltip',
      'style'     : { transform: `translate(${place.value.x}px, ${place.value.y}px)` }
    }, term.value
      ? [
          h('b', term.value.name),
          h('span', term.value.sentence),
          h('a', { href: addressOf(term.value), tabindex: -1 }, 'On the terms page')
        ]
      : [])
  }
})
