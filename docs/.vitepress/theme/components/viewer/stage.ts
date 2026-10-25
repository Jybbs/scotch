import { type PropType, type VNode, defineComponent, h } from 'vue'

import type { Parts }                 from '../../../lib/viewer/drive.ts'
import type { Loaded, Party, Status } from '../../../lib/viewer/loaded.ts'
import type { Facing }                from '../../../lib/viewer/trail.ts'
import { GameFigure }                 from './board.ts'
import { Controls }                   from './controls.ts'
import { Ledger }                     from './ledger.ts'
import { Track }                      from './track.ts'

/**
 * Draws the status line under the controls, the count of the squares the boards
 * differ on following it as a button that shows those squares while the pointer
 * rests on it or it holds focus, the button hidden where no square differs.
 */
function statusLine(status: Status, show: (on: boolean) => void): VNode {
  return h('p', { class: 'sc-viewer-status' }, [
    status.count ? `${status.short} · ` : status.short,
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
 * boards differ on reaches the Viewer through `show`.
 */
export const Stage = defineComponent({
  name: 'ScotchStage',

  props: {
    cursor : { required: true, type: Number },
    facing : { required: true, type: String as PropType<Facing> },
    loaded : { required: true, type: Object as PropType<Loaded> },
    parts  : { required: true, type: Object as PropType<Parts> },
    status : { required: true, type: Object as PropType<Status> }
  },

  emits: {
    go   : (to: number | undefined) => to === undefined || Number.isFinite(to),
    show : (on: boolean) => typeof on === 'boolean',
    turn : (facing: Facing) => facing === 'black' || facing === 'white'
  },

  setup: (props, { emit }) => {
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
      const { cursor, facing, loaded, parts } = props
      const figure                            = (party: Party): VNode =>
        h(GameFigure, { cursor, facing, loaded, party, ref: parts[party] })
      return [
        h('div', { class: 'sc-viewer-flank' }, [
          figure('submitted'),
          h('div', { class: 'sc-viewer-spine' }, [h(Ledger, { loaded, onGo: go, ref: parts.ledger })]),
          figure('stored')
        ]),
        h('div', { class: 'sc-viewer-foot' }, [
          h(Controls, { cursor, facing, loaded, onGo: go, onTurn: turn }),
          statusLine(props.status, show)
        ]),
        h('div', { class: 'sc-viewer-under' }, [
          h(Track, { cursor, facing, loaded, onGo: go, ref: parts.track, status: props.status })
        ])
      ]
    }
  }
})
