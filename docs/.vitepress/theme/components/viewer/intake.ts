import { type PropType, type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import { EXAMPLES, type Match, SAMPLES, type Sample } from '../../../lib/viewer/examples.ts'
import { movesOf }                                    from '../../../lib/viewer/pgn.ts'
import { ICONS }                                      from './icons.ts'
import { CHIP, KICKER }                               from './parts.ts'

/**
 * The PGN entry, one dashed line of the code face that turns solid in the
 * run's color while it holds focus.
 */
const FIELD = [
  'm-0 block h-10 w-full resize-none overflow-hidden rounded-lg border border-dashed border-rule bg-page',
  'px-3.5 py-0 font-code text-[0.78rem]/[38px] font-normal text-ellipsis whitespace-nowrap text-ink',
  'placeholder:text-[color-mix(in_srgb,var(--sc-quiet)_70%,transparent)]',
  'focus-visible:border-solid focus-visible:border-run focus-visible:outline-none'
]
/**
 * The checks on what the intake and the band around it emit: a file picked or
 * dropped, and a match loaded.
 */
export const TAKES = {
  file : (file: File) => !!file,
  load : (match: Match, source: string, sample?: Sample) => !!match && !!source && sample !== null
}
/**
 * The line the PGN entry shows in place of a game, the opening of the example
 * match's own moves as its move text writes them.
 */
const placeholder = `${movesOf(0, EXAMPLES.match.submitted).slice(0, 10).join(' ')} …`

/**
 * Draws the PGN entry, which submits the game pasted into it, a paste replacing
 * whatever the entry holds, or typed and sent with Enter, Shift and Enter
 * breaking the line instead and Enter inside a composition ending the
 * composition.
 */
function entry(id: string, submit: (text: string) => void): VNode {
  const send = (field: HTMLTextAreaElement): void => {
    if (field.value.trim()) submit(field.value)
  }
  return h('div', { class: 'grid min-w-0 gap-[7px]' }, [
    h('label', { class: KICKER, for: `${id}-pgn` }, [
      h('span', { innerHTML: ICONS.paste }),
      h('span', 'Paste or drop a game in PGN')
    ]),
    h('div', { class: 'relative min-w-0' }, [
      h('textarea', {
        'class'       : FIELD,
        'id'          : `${id}-pgn`,
        'placeholder' : placeholder,
        'rows'        : 1,
        'spellcheck'  : 'false',

        'onKeydown': (event: KeyboardEvent) => {
          if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
          event.preventDefault()
          send(event.target as HTMLTextAreaElement)
        },

        'onInput': (event: InputEvent) => {
          if (event.inputType === 'insertFromPaste') send(event.target as HTMLTextAreaElement)
        },

        'onPaste': (event: ClipboardEvent) => {
          (event.target as HTMLTextAreaElement).select()
        }
      })
    ])
  ])
}

/**
 * The intake at the band's right: the PGN entry, the two examples, and a picker
 * for a match file or a PGN file, beside the line naming the problem a file or
 * a submitted game carries. A picked file reaches the band through `file`, and
 * a pasted game through `pgn`.
 */
export const Intake = defineComponent({
  name: 'ScotchIntake',

  props: {
    problem : { required: true, type: String },
    sample  : { default: undefined, type: String as PropType<Sample> }
  },

  emits: {
    ...TAKES,
    pgn: (text: string) => !!text
  },

  setup: (props, { emit }) => {
    const id    = useId()
    const input = shallowRef<HTMLInputElement | null>(null)

    return () => h('div', {
      class: 'grid min-w-0 gap-2.5 border-l border-rule pl-10 max-lg:border-t max-lg:border-l-0 max-lg:pt-4 '
           + 'max-lg:pl-0'
    }, [
      entry(id, text => emit('pgn', text)),
      h('div', { class: 'flex flex-wrap items-center gap-2' }, [
        h('div', { 'aria-label': 'Examples', 'class': 'flex gap-1.5', 'role': 'group' }, SAMPLES.map(
          sample => h('button', {
            'aria-pressed' : String(props.sample === sample.name),
            'class'        : CHIP,
            'onClick'      : () => emit('load', EXAMPLES[sample.name], sample.source, sample.name),
            'type'         : 'button'
          }, sample.label)
        )),
        h('button', { class: CHIP, onClick: () => input.value!.click(), type: 'button' }, [
          h('span', { innerHTML: ICONS.file }),
          h('span', 'Open a match or a game')
        ]),
        h('span', {
          class: 'font-body text-[0.86rem]/[20px] font-normal whitespace-nowrap text-quiet italic'
        }, 'or drop one here')
      ]),
      h('p', {
        class : 'font-code text-[0.7rem]/[18px] font-medium whitespace-pre-line text-alert empty:hidden',
        role  : 'alert'
      }, props.problem),
      h('input', {
        'accept'      : '.json,.pgn,application/json,application/x-chess-pgn',
        'aria-hidden' : 'true',
        'class'       : 'sr-only',
        'onChange'    : () => {
          const file = input.value!.files?.[0]
          if (file) emit('file', file)
          input.value!.value = ''
        },
        'ref'         : input,
        'tabindex'    : '-1',
        'type'        : 'file'
      })
    ])
  }
})
