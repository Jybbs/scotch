import { type PropType, type VNode, defineComponent, h } from 'vue'

import type { Parts }                       from '../../../lib/viewer/drive.ts'
import type { Guess, Offer, Verdict }       from '../../../lib/viewer/guesses.ts'
import type { Loaded, Party, Status }       from '../../../lib/viewer/loaded.ts'
import type { Facing }                      from '../../../lib/viewer/trail.ts'
import { GameFigure }                       from './board.ts'
import { Controls, statusLine }             from './controls.ts'
import { GuessEntry }                       from './guess.ts'
import { Ledger }                           from './ledger.ts'
import { Track }                            from './track.ts'

/**
 * The raised surface setting the two boards at either side of the sheets, each
 * board as wide as the room left beside the sheets allows in whole rows, no
 * taller than the window leaves under the band, and the three parts set
 * straight into the stage's grid on a narrow screen.
 */
const FLANK = [
  '[--sc-viewer-led:20rem] [--sc-viewer-gap:24px] [--sc-viewer-cap:max(13rem,calc(100dvh_-_26rem))]',
  '[--sc-viewer-fit:min(var(--sc-viewer-cap),calc((100%_-_var(--sc-viewer-led)_-_2_*_var(--sc-viewer-gap))_/_2))]',
  '[--sc-viewer-side:calc(round(down,var(--sc-viewer-fit)_-_2px,var(--sc-viewer-pitch))_+_2px)]',
  'grid grid-cols-[var(--sc-viewer-side)_var(--sc-viewer-led)_var(--sc-viewer-side)] items-stretch',
  'justify-center gap-(--sc-viewer-gap) rounded-[14px] bg-raised px-5 pt-[18px] pb-9',
  '[box-shadow:0_0_0_1px_var(--sc-rule),0_24px_48px_-30px_var(--sc-viewer-shade)] max-lg:contents'
]
/**
 * The pill of controls set over the surface's lower edge with the status line
 * and the field taking a move under it, in its own row on a narrow screen,
 * which takes the focus a control inside it loses.
 */
const FOOT = 'relative z-2 -mt-[45px] grid justify-items-center gap-2.5 outline-none max-lg:col-span-full '
           + 'max-lg:row-3 max-lg:mt-0'
/**
 * The column holding the sheets, sized by the boards beside it, and on a
 * narrow screen a band of its own under the track, a set count of rows tall.
 */
const SPINE = [
  'grid min-h-0 [contain:size] max-lg:[grid-area:5/1/auto/-1] max-lg:[contain:none]',
  'max-lg:[--sc-viewer-rows:12]',
  'max-lg:h-[calc(var(--sc-viewer-rows)_*_var(--sc-viewer-pitch)_+_2px_+_var(--sc-viewer-caption)_+_10px)]',
  'max-sm:[--sc-viewer-rows:11]'
]
/**
 * The legend and the track under the stage's surface, over a rule.
 */
const UNDER = 'min-w-0 border-t border-rule pt-1.5 max-lg:col-span-full max-lg:row-4'

/**
 * The stage under the band: the two boards at either side of both games' moves
 * bound row by row, the controls on a pill set over the surface's edge with the
 * status line under them, and the track of every position beneath, each part
 * binding the ref the Viewer reaches it through. The count of the squares the
 * boards differ on reaches the Viewer through `show`. The field taking a move
 * in SAN sits under the status line, shown while the stored game is covered,
 * and a move made on the stored board or typed there reaches the Viewer as
 * `offer`. The default slot sits over the track.
 */
export const Stage = defineComponent({
  name: 'ScotchStage',

  props: {
    covered  : { required: true, type: Boolean },
    cursor   : { required: true, type: Number },
    facing   : { required: true, type: String as PropType<Facing> },
    guesses  : { required: true, type: Object as PropType<ReadonlyMap<number, Guess>> },
    loaded   : { required: true, type: Object as PropType<Loaded> },
    parts    : { required: true, type: Object as PropType<Parts> },
    status   : { required: true, type: Object as PropType<Status> },
    taking   : { required: true, type: Boolean },
    verdict  : { default: undefined, type: Object as PropType<Verdict> }
  },

  emits: {
    cover : (on: boolean) => typeof on === 'boolean',
    go    : (to: number | undefined) => to === undefined || Number.isFinite(to),
    offer : (offer: Offer) => !!offer.hop || typeof offer.typed === 'string',
    show  : (on: boolean) => typeof on === 'boolean',
    turn  : (facing: Facing) => facing === 'black' || facing === 'white'
  },

  setup: (props, { emit, slots }) => {
    const cover = (on: boolean): void => {
      emit('cover', on)
    }
    const go = (to: number | undefined): void => {
      emit('go', to)
    }
    const show = (on: boolean): void => {
      emit('show', on)
    }
    const turn = (facing: Facing): void => {
      emit('turn', facing)
    }

    return (): VNode[] => {
      const { covered, cursor, facing, loaded, parts, taking } = props
      const figure = (party: Party): VNode => h(GameFigure, {
        cursor  : cursor,
        facing  : facing,
        loaded  : loaded,
        onOffer : (hop: NonNullable<Offer['hop']>) => emit('offer', { hop }),
        party   : party,
        ref     : parts[party],
        taking  : party === 'stored' && taking
      })
      return [
        h('div', { class: FLANK }, [
          figure('submitted'),
          h('div', { class: SPINE }, [h(Ledger, { loaded, onGo: go, ref: parts.ledger })]),
          figure('stored')
        ]),
        h('div', { class: FOOT, tabindex: '-1' }, [
          h(Controls, { covered, cursor, facing, loaded, onCover: cover, onGo: go, onTurn: turn }),
          statusLine(props.status, show, props.verdict),
          h(GuessEntry, {
            covered : covered,
            guesses : props.guesses,
            onOffer : (typed: string) => emit('offer', { typed }),
            ref     : parts.guess,
            taking  : taking
          })
        ]),
        h('div', { class: UNDER }, [
          slots.default?.(),
          h(Track, { cursor, facing, loaded, onGo: go, ref: parts.track, status: props.status })
        ])
      ]
    }
  }
})
