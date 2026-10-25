import { type PropType, type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import { EXAMPLES, type Match, SAMPLES, type Sample } from '../../../lib/viewer/examples.ts'
import { movesOf }                                    from '../../../lib/viewer/pgn.ts'
import { ICONS }                                      from './icons.ts'

/**
 * The line the PGN entry shows in place of a game, the opening of the example
 * match's own moves as its move text writes them.
 */
const placeholder = `${movesOf(0, EXAMPLES.match.submitted).slice(0, 10).join(' ')} …`

/**
 * Draws the PGN entry, disabled and marked as arriving with in-browser
 * matching.
 */
function entry(id: string): VNode {
  return h('div', { class: 'sc-viewer-pgn' }, [
    h('label', { class: 'sc-viewer-kicker', for: `${id}-pgn` }, [
      h('span', { innerHTML: ICONS.paste }),
      h('span', 'Paste or drop a game in PGN')
    ]),
    h('div', { class: 'sc-viewer-pgn-box' }, [
      h('input', {
        'aria-describedby' : `${id}-soon`,
        'class'            : 'sc-viewer-pgn-field',
        'disabled'         : true,
        'id'               : `${id}-pgn`,
        'placeholder'      : placeholder,
        'spellcheck'       : 'false',
        'type'             : 'text'
      }),
      h('span', { class: 'sc-viewer-soon', id: `${id}-soon` }, 'Arrives with in-browser matching')
    ])
  ])
}

/**
 * The intake at the band's right: the PGN entry, the two examples, and a picker
 * for a match file, beside the line naming the first thing a picked or dropped
 * file lacks. A picked file reaches the band through `file`, which reads it as
 * it reads a dropped one.
 */
export const Intake = defineComponent({
  name: 'ScotchIntake',

  props: {
    problem : { required: true, type: String },
    sample  : { default: undefined, type: String as PropType<Sample> }
  },

  emits: {
    file : (file: File) => !!file,
    load : (match: Match, source: string, sample?: Sample) => !!match && !!source && sample !== null
  },

  setup: (props, { emit }) => {
    const id    = useId()
    const input = shallowRef<HTMLInputElement | null>(null)

    return () => h('div', { class: 'sc-viewer-intake' }, [
      entry(id),
      h('div', { class: 'sc-viewer-actions' }, [
        h('div', { 'aria-label': 'Examples', 'class': 'sc-viewer-examples', 'role': 'group' }, SAMPLES.map(
          sample => h('button', {
            'aria-pressed' : String(props.sample === sample.name),
            'class'        : 'sc-viewer-chip',
            'onClick'      : () => emit('load', EXAMPLES[sample.name], sample.source, sample.name),
            'type'         : 'button'
          }, sample.label)
        )),
        h('button', { class: 'sc-viewer-chip', onClick: () => input.value!.click(), type: 'button' }, [
          h('span', { innerHTML: ICONS.file }),
          h('span', 'Open a match file')
        ]),
        h('span', { class: 'sc-viewer-drop' }, 'or drop one here')
      ]),
      h('p', { class: 'sc-viewer-problem', role: 'alert' }, props.problem),
      h('input', {
        'accept'      : '.json,application/json',
        'aria-hidden' : 'true',
        'class'       : 'sc-viewer-hidden',
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
