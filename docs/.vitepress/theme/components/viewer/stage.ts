import { type PropType, type VNode, defineComponent, h } from 'vue'

import type { Parts }                       from '../../../lib/viewer/drive.ts'
import type { Guess, Offer, Verdict }       from '../../../lib/viewer/guesses.ts'
import type { Loaded, Party, Status }       from '../../../lib/viewer/loaded.ts'
import type { Facing }                      from '../../../lib/viewer/trail.ts'
import { GameFigure }                       from './board.ts'
import { Controls }                         from './controls.ts'
import { GuessEntry }                       from './guess.ts'
import { Ledger }                           from './ledger.ts'
import { Track }                            from './track.ts'

/**
 * Draws the status line under the controls, the count of the squares the boards
 * differ on following it as a button that shows those squares while the pointer
 * rests on it or it holds focus, the button hidden where no square differs. A
 * verdict on the move a step just showed takes the line's text in its place.
 */
function statusLine(status: Status, show: (on: boolean) => void, verdict?: Verdict): VNode {
  const short = verdict?.line ?? status.short
  return h('p', { 'class': 'sc-viewer-status', 'data-verdict': verdict ? '' : undefined }, [
    status.count ? `${short} · ` : short,
    h('button', {
      class          : 'sc-viewer-differing',
      hidden         : !status.count,
      onBlur         : () => show(false),
      onFocus        : () => show(true),
      onPointerenter : () => show(true),
      onPointerleave : () => show(false),
      title          : 'Show the squares the boards differ on',
      type           : 'button'
    }, status.count)
  ])
}

/**
 * The stage under the band: the two boards at either side of both games' moves
 * bound row by row, the controls on a pill set over the surface's edge with the
 * status line under them, and the track of every position beneath, each part
 * binding the ref the Viewer reaches it through. The count of the squares the
 * boards differ on reaches the Viewer through `show`. The field taking a move
 * in SAN sits under the status line, shown while the stored game is covered,
 * and a move made on the stored board or typed there reaches the Viewer as
 * `offer`.
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

  setup: (props, { emit }) => {
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
        h('div', { class: 'sc-viewer-flank' }, [
          figure('submitted'),
          h('div', { class: 'sc-viewer-spine' }, [h(Ledger, { loaded, onGo: go, ref: parts.ledger })]),
          figure('stored')
        ]),
        h('div', { class: 'sc-viewer-foot' }, [
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
        h('div', { class: 'sc-viewer-under' }, [
          h(Track, { cursor, facing, loaded, onGo: go, ref: parts.track, status: props.status })
        ])
      ]
    }
  }
})
