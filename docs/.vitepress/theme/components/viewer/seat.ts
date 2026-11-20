import { useTimeoutFn }                                  from '@vueuse/core'
import { type PropType, defineComponent, h, shallowRef } from 'vue'

import { ICONS }        from './icons.ts'
import { CHIP, KICKER } from './parts.ts'

/**
 * The field laying out the text to copy by hand, opening in the top layer
 * under the seat's chip.
 */
const PANEL = [
  'fixed inset-auto m-0 w-[min(30rem,calc(100vw_-_32px))] rounded-xl border-0 bg-raised px-4 pt-3.5 pb-4',
  'text-ink open:grid open:gap-2.5',
  '[box-shadow:0_0_0_1px_var(--sc-rule),0_18px_40px_-20px_var(--sc-viewer-shade)]'
]
/**
 * The milliseconds the seat names a finished copy before it reads as copying
 * again.
 */
const SHOWN = 2400

/**
 * One action copying text the loaded match gives, a link carrying it or the
 * submitted game as PGN, naming the copy in its label and a live region, and
 * laying the text out in a field selected to copy by hand where the page may
 * not write the clipboard, the field opening in the top layer so nothing on the
 * page moves.
 */
export const Seat = defineComponent({
  name: 'ScotchSeat',

  props: {
    done  : { required: true, type: String },
    icon  : { required: true, type: String as PropType<'link' | 'pgn'> },
    label : { required: true, type: String },
    make  : { required: true, type: Function as PropType<() => Promise<string> | string> },
    title : { required: true, type: String }
  },

  setup: props => {
    const copied = shallowRef(false)
    const field  = shallowRef<HTMLTextAreaElement | null>(null)
    const note   = shallowRef('')
    const panel  = shallowRef<HTMLElement | null>(null)
    const reset  = useTimeoutFn(() => {
      copied.value = false
    }, SHOWN, { immediate: false })

    const copy = async (event: MouseEvent): Promise<void> => {
      const button = event.currentTarget as HTMLElement
      const text   = await props.make()
      try {
        await navigator.clipboard.writeText(text)
        copied.value = true
        note.value   = props.done
        reset.start()
      } catch {
        const { bottom, right } = button.getBoundingClientRect()
        field.value!.value      = text
        panel.value!.showPopover()
        const left = Math.max(16, right - panel.value!.offsetWidth)
        Object.assign(panel.value!.style, { left: `${left}px`, top: `${bottom + 8}px` })
        field.value!.select()
        note.value = 'The text is selected to copy'
      }
    }

    return () => h('div', [
      h('button', { class: CHIP, onClick: copy, title: props.title, type: 'button' }, [
        h('span', { innerHTML: copied.value ? ICONS.done : ICONS[props.icon] }),
        h('span', copied.value ? props.done : props.label)
      ]),
      h('span', { 'aria-live': 'polite', 'class': 'sr-only', 'role': 'status' }, note.value),
      h('div', { class: PANEL, popover: 'auto', ref: panel }, [
        h('p', { class: KICKER }, props.title),
        h('textarea', {
          'aria-label' : props.title,
          'class'      : [
            'focus-ring',
            'w-full resize-y rounded-md border border-rule bg-page px-2.5 py-2 font-code',
            'text-[0.74rem]/[18px] font-normal whitespace-pre text-ink'
          ],
          'readonly'   : true,
          'ref'        : field,
          'rows'       : props.icon === 'pgn' ? 8 : 2
        })
      ])
    ])
  }
})
