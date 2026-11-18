import { useResizeObserver }                                         from '@vueuse/core'
import { type PropType, type VNode, defineComponent, h, shallowRef } from 'vue'

import * as controls           from '../../../lib/viewer/controls.ts'
import type { Verdict }        from '../../../lib/viewer/guesses.ts'
import type { Loaded, Status } from '../../../lib/viewer/loaded.ts'
import { snapRow }             from '../../../lib/viewer/pixel.ts'
import type { Facing }         from '../../../lib/viewer/trail.ts'
import { FOCUS }               from './parts.ts'

/**
 * One control, a raised pill naming its step in the run's color, its rim
 * mixed toward the run's color in the run's group even while pressed,
 * quieted while it goes nowhere, and spread across its row on a narrow
 * screen.
 */
const CONTROL = [
  FOCUS,
  'inline-flex h-[34px] cursor-pointer items-center gap-[7px] rounded-[999px] border border-rule bg-raised',
  'py-0 pr-[7px] pl-[13px] font-code text-[0.64rem]/none font-semibold tracking-[0.1em] text-run uppercase',
  'transition-[border-color,color]',
  'in-data-[group=run]:border-[color-mix(in_srgb,var(--sc-run)_45%,var(--sc-rule))]',
  'hover:not-disabled:border-run disabled:cursor-default disabled:text-quiet disabled:opacity-70',
  'aria-pressed:bg-tint not-in-data-[group=run]:aria-pressed:border-run',
  'max-sm:flex-auto max-sm:justify-between max-sm:gap-1.5 max-sm:pr-1 max-sm:pl-2'
]
/**
 * The cap of a control's first key, hidden on a narrow screen.
 */
const KEY = [
  'inline-grid h-5 min-w-[22px] place-items-center rounded-sm bg-side px-[5px] font-code text-[0.64rem]/none',
  'font-medium tracking-normal text-ink normal-case',
  '[box-shadow:inset_0_0_0_1px_var(--sc-rule),inset_0_-1px_0_var(--sc-rule)] max-sm:hidden'
]

/**
 * Draws one control as a button naming its step beside the cap of its first
 * key and listing every key that takes it, `state` setting whether it goes
 * nowhere or presses.
 */
function drawControl(
  control : controls.Key,
  state   : Record<string, boolean | string>,
  onClick : () => void
): VNode {
  return h('button', {
    'aria-keyshortcuts' : control.keys.map(key => key.length === 1 ? key.toUpperCase() : key).join(' '),
    'class'             : CONTROL,
    'data-control'      : control.name,
    'onClick'           : onClick,
    'title'             : control.title,
    'type'              : 'button',
    ...state
  }, [h('span', control.label), h('kbd', { 'aria-hidden': 'true', 'class': KEY }, control.cap)])
}

/**
 * Draws the status line under the controls, the count of the squares the boards
 * differ on following it as a button that shows those squares while the pointer
 * rests on it or it holds focus, the button hidden where no square differs. A
 * verdict on the move a step just showed takes the line's text in its place.
 */
export function statusLine(status: Status, show: (on: boolean) => void, verdict?: Verdict): VNode {
  const short = verdict?.line ?? status.short
  return h('p', {
    'class'        : 'm-0 max-w-none text-center font-code text-[0.64rem]/[16px] font-medium '
                   + 'tracking-[0.1em] whitespace-nowrap text-quiet uppercase in-data-[shared=yes]:text-run',
    'data-verdict' : verdict ? '' : undefined
  }, [
    status.count ? `${short} · ` : short,
    h('button', {
      class          : [
        FOCUS,
        'cursor-help border-0 border-b border-dashed border-current bg-transparent px-px py-0 text-inherit',
        '[font:inherit] tracking-[inherit] [text-transform:inherit]'
      ],
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
 * The controls on a pill, the four steps in one group and the two the shared
 * run gives in another beside the cover and the flip, each a button naming its
 * step beside the cap of its first key and listing every key that takes it, a
 * control that goes nowhere from the cursor disabled, the cover pressed while
 * the stored game is covered past the cursor, and the flip pressed while the
 * boards face Black's side, the whole row kept on whole device pixels as it and
 * its column resize.
 */
export const Controls = defineComponent({
  name: 'ScotchControls',

  props: {
    covered : { required: true, type: Boolean },
    cursor  : { required: true, type: Number },
    facing  : { required: true, type: String as PropType<Facing> },
    loaded  : { required: true, type: Object as PropType<Loaded> }
  },

  emits: {
    cover : (on: boolean) => typeof on === 'boolean',
    go    : (to: number | undefined) => to === undefined || Number.isFinite(to),
    turn  : (facing: Facing) => facing === 'black' || facing === 'white'
  },

  setup: (props, { emit }) => {
    const row = shallowRef<HTMLElement | null>(null)

    useResizeObserver([row, () => row.value?.parentElement], () => {
      if (row.value) snapRow(row.value, window.devicePixelRatio || 1)
    })

    const button = (control: controls.Control): VNode => drawControl(control, {
      disabled: controls.idle(control, props.cursor, props.loaded)
    }, () => {
      emit('go', control.to(props.loaded, props.cursor))
    })

    const cover = (): VNode => drawControl(controls.COVER, {
      'aria-pressed' : String(props.covered),
      'disabled'     : !props.loaded.match.stored
    }, () => {
      emit('cover', !props.covered)
    })

    const flip = (): VNode => drawControl(controls.FLIP, {
      'aria-pressed': String(props.facing === 'black')
    }, () => {
      emit('turn', props.facing === 'white' ? 'black' : 'white')
    })

    const grouped = (group: string): VNode[] => [
      ...controls.CONTROLS.filter(control => control.group === group).map(control => button(control)),
      ...group === 'run' ? [cover(), flip()] : []
    ]

    return () => h('div', {
      'aria-label' : 'Step through the match',
      'class'      : [
        'flex flex-wrap justify-center gap-x-3.5 gap-y-2 rounded-[999px] bg-page p-1.5',
        '[box-shadow:0_0_0_1px_var(--sc-rule),0_12px_28px_-18px_var(--sc-viewer-shade)]',
        'max-sm:grid max-sm:w-full max-sm:gap-1.5 max-sm:rounded-3xl max-sm:p-1'
      ],
      'ref'        : row,
      'role'       : 'group'
    }, Object.entries(controls.GROUPS).map(([group, label]) => h('div', {
      'aria-label' : label,
      'class'      : 'flex gap-1.5 max-sm:gap-1',
      'data-group' : group,
      'role'       : 'group'
    }, grouped(group))))
  }
})
