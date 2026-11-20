import { type PropType, type VNode, defineComponent, h, shallowRef } from 'vue'

import { type Guess, tallyOf } from '../../../lib/viewer/guesses.ts'

/**
 * The field taking a move in SAN, rimmed in the ink while its text is no move.
 */
const FIELD = 'h-7 w-[7ch] rounded-md border border-rule bg-page px-2 py-0 font-code text-[0.8rem]/none '
            + 'font-medium text-ink aria-invalid:border-ink'
/**
 * The button offering the typed move, quieted while no move is taken.
 */
const OFFER = 'h-7 cursor-pointer rounded-[999px] border border-rule bg-raised px-3 py-0 font-code '
            + 'text-[0.64rem]/none font-semibold tracking-[0.1em] text-run uppercase disabled:cursor-default '
            + 'disabled:text-quiet'

/**
 * The field a player types a move in SAN into at a covered ply, beside the
 * button offering it and the count of the moves offered so far that match the
 * stored game's, the field marked invalid with a line saying so where the text
 * is no move in SAN. The field stays in place and disabled where the stored
 * game plays no move from the cursor or a step on already showed that move, and
 * the whole form keeps its place hidden and inert while the stored game is
 * shown, so covering it moves nothing around it.
 */
export const GuessEntry = defineComponent({
  name: 'ScotchGuessEntry',

  props: {
    covered : { required: true, type: Boolean },
    guesses : { required: true, type: Object as PropType<ReadonlyMap<number, Guess>> },
    taking  : { required: true, type: Boolean }
  },

  emits: {
    offer: (typed: string) => typeof typed === 'string'
  },

  setup: (props, { emit, expose }) => {
    const text    = shallowRef('')
    const invalid = shallowRef(false)
    const submit  = (event: Event): void => {
      event.preventDefault()
      emit('offer', text.value.trim())
    }

    expose({
      settle: (taken: boolean) => {
        invalid.value = !taken
        if (taken) text.value = ''
      }
    })

    return (): VNode => {
      const { matched, offered } = tallyOf(props.guesses)
      return h('form', {
        class    : 'flex items-center gap-2 font-code text-[0.64rem]/none font-medium inert:invisible',
        inert    : !props.covered,
        onSubmit : submit
      }, [
        h('label', {
          class : 'tracking-[0.1em] text-quiet uppercase',
          for   : 'sc-viewer-guess-field'
        }, 'Your move'),
        h('input', {
          'aria-describedby' : 'sc-viewer-guess-note',
          'aria-invalid'     : String(invalid.value),
          'autocapitalize'   : 'off',
          'autocomplete'     : 'off',
          'class'            : FIELD,
          'disabled'         : !props.taking,
          'id'               : 'sc-viewer-guess-field',
          'placeholder'      : 'Nf3',
          'spellcheck'       : 'false',
          'value'            : text.value,
          'onInput'          : (event: Event) => {
            text.value    = (event.target as HTMLInputElement).value
            invalid.value = false
          }
        }),
        h('button', { class: OFFER, disabled: !props.taking, type: 'submit' }, 'Offer'),
        h('span', { class: 'min-w-[18ch] text-quiet', id: 'sc-viewer-guess-note' }, invalid.value
          ? 'Not a move in SAN'
          : `${matched} of ${offered} offered match`)
      ])
    }
  }
})
