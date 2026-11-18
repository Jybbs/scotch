import type { PropType, Ref, VNode }                                         from 'vue'
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

import { useDark }                           from '../../../lib/identity/scheme.ts'
import { type Loaded, PARTIES, type Status } from '../../../lib/viewer/loaded.ts'
import { type TrackParts, TrackStrip }       from '../../../lib/viewer/strip.ts'
import * as track                            from '../../../lib/viewer/track.ts'
import type { Facing }                       from '../../../lib/viewer/trail.ts'
import { FOCUS }                             from './parts.ts'

/**
 * The refs each drawn part of the track binds to.
 */
type Refs = { [Part in keyof TrackParts]: Ref<TrackParts[Part] | null> }

/**
 * The frame standing at the cursor's column, gliding at the step's pace while
 * it glides.
 */
const HEAD = 'pointer-events-none absolute left-0 rounded-[5px] [box-shadow:0_0_0_2px_var(--sc-ink)] '
           + 'will-change-transform data-gliding:transition-transform '
           + 'data-gliding:duration-[var(--sc-viewer-step,var(--sc-duration-glide))]'
/**
 * The box the canvas scrolls in sideways, its two ends fading out.
 */
const SCROLL = [
  'relative min-w-0 overflow-x-auto overflow-y-hidden overscroll-contain [scrollbar-width:thin]',
  '[mask-image:linear-gradient(90deg,transparent,var(--sc-ink)_20px,var(--sc-ink)_calc(100%_-_20px),transparent)]'
]
/**
 * The swatch naming one game's row at its middle, in the game's color.
 */
const SWATCH = 'absolute top-[calc(var(--sc-viewer-middle)_-_4px)] right-0 flex before:size-[9px] '
             + 'before:flex-none before:rounded-[2px] before:bg-(--sc-viewer-game)'
/**
 * The slider, the swatches beside the scrolling box, the swatches dropped on
 * a narrow screen.
 */
const TRACK = `${FOCUS} grid min-w-0 cursor-pointer touch-pan-x grid-cols-[9px_minmax(0,1fr)] gap-x-2.5 `
            + 'rounded-md max-sm:grid-cols-[minmax(0,1fr)]'

/**
 * Draws the track as a slider over the plies of both games: the swatches naming
 * each game's row at its middle, and the canvas and the head inside the box it
 * scrolls in, the head standing at the cursor's column.
 *
 * Args:
 *   cursor : The ply of the submitted game the boards show.
 *   loaded : The loaded match.
 *   refs   : The refs each drawn part binds to.
 *   status : The status line the slider reads its value as.
 */
function drawSlider(cursor: number, loaded: Loaded, refs: Refs, status: Status): VNode {
  const size = { height: `${track.TRACK_HEIGHT}px`, width: `${track.trackWidth(loaded)}px` }
  const box  = track.headOf(loaded)
  const head = {
    height    : `${box.height}px`,
    top       : `${box.top}px`,
    transform : `translate(${track.columnOf(cursor, loaded)}px, 0px)`,
    width     : `${box.width}px`
  }
  return h('div', {
    'aria-label'     : 'Plies of the two games',
    'aria-valuemax'  : loaded.last,
    'aria-valuemin'  : loaded.first,
    'aria-valuenow'  : cursor,
    'aria-valuetext' : status.line,
    'class'          : TRACK,
    'ref'            : refs.slider,
    'role'           : 'slider',
    'tabindex'       : '0'
  }, [
    h('div', { 'aria-hidden': 'true', 'class': 'relative max-sm:hidden' }, PARTIES.map(party => h('span', {
      'class'     : [SWATCH, party === 'stored' ? 'in-data-[matched=no]:hidden' : ''],
      'data-game' : party,
      'style'     : { '--sc-viewer-middle': `${track.ROWS[party] + track.GLYPH / 2}px` }
    }))),
    h('div', { class: SCROLL, ref: refs.scroll }, [
      h('div', { class: 'relative', ref: refs.area, style: size }, [
        h('canvas', {
          'aria-hidden' : 'true',
          'class'       : 'block',
          'ref'         : refs.canvas,
          'style'       : size
        }),
        h('span', { 'aria-hidden': 'true', 'class': HEAD, 'ref': refs.head, 'style': head })
      ])
    ])
  ])
}

/**
 * The track of every position of both games beneath the boards, a glyph of each
 * position in a column per ply, the stored game's row shifted by the run's
 * offset so its positions line up with the submitted game's, and each position
 * the two share drawn once between the two rows. It follows the ARIA slider
 * pattern: Up and Down step it one ply, Page Up and Page Down ten, the Viewer's
 * own keys take it back, on, or to either end, and a press or a drag moves the
 * cursor to the ply under the pointer, while the track scrolls to keep the
 * cursor a third of the way in.
 */
export const Track = defineComponent({
  name: 'ScotchTrack',

  props: {
    cursor : { required: true, type: Number },
    facing : { required: true, type: String as PropType<Facing> },
    loaded : { required: true, type: Object as PropType<Loaded> },
    status : { required: true, type: Object as PropType<Status> }
  },

  emits: { go: (to: number) => Number.isFinite(to) },

  setup: (props, { emit, expose }) => {
    const dark       = useDark()
    const refs: Refs = {
      area   : shallowRef(null),
      canvas : shallowRef(null),
      head   : shallowRef(null),
      scroll : shallowRef(null),
      slider : shallowRef(null)
    }
    let strip: TrackStrip | undefined

    onMounted(() => {
      strip = new TrackStrip({
        area   : refs.area.value!,
        canvas : refs.canvas.value!,
        head   : refs.head.value!,
        scroll : refs.scroll.value!,
        slider : refs.slider.value!
      }, to => {
        emit('go', to)
      })
    })
    onBeforeUnmount(() => {
      strip?.dispose()
    })
    watch([dark, () => props.facing], () => {
      requestAnimationFrame(() => {
        strip?.draw(props.facing)
      })
    })

    expose({
      cover: (cursor?: number) => {
        strip?.cover(cursor)
      },
      load: () => {
        strip?.load(props.loaded, props.facing)
      },
      paint: (cursor: number, glide: boolean) => {
        strip?.paint(cursor, glide)
      }
    })

    return () => drawSlider(props.cursor, props.loaded, refs, props.status)
  }
})
