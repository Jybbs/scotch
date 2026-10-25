import { useTimeoutFn }                                  from '@vueuse/core'
import { type PropType, defineComponent, h, shallowRef } from 'vue'

import { ICONS } from './icons.ts'

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

    return () => h('div', { class: 'sc-viewer-seat' }, [
      h('button', { class: 'sc-viewer-chip', onClick: copy, title: props.title, type: 'button' }, [
        h('span', { innerHTML: copied.value ? ICONS.done : ICONS[props.icon] }),
        h('span', copied.value ? props.done : props.label)
      ]),
      h('span', { 'aria-live': 'polite', 'class': 'sc-viewer-hidden', 'role': 'status' }, note.value),
      h('div', { class: 'sc-viewer-copy', popover: 'auto', ref: panel }, [
        h('p', { class: 'sc-viewer-kicker' }, props.title),
        h('textarea', {
          'aria-label' : props.title,
          'class'      : 'sc-viewer-copy-field',
          'readonly'   : true,
          'ref'        : field,
          'rows'       : props.icon === 'pgn' ? 8 : 2
        })
      ])
    ])
  }
})
