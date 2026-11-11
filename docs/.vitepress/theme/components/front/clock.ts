import { clamp }                                          from '@vueuse/core'
import { type PropType, type VNode, defineComponent, h } from 'vue'

/**
 * The keys the clock line answers, each naming the step it moves to from the
 * step in view and the last step, following the slider pattern's arrows,
 * Home, and End.
 */
const CLOCK_KEYS: Readonly<Record<string, (at: number, last: number) => number>> = {
  ArrowDown  : at => at - 1,
  ArrowLeft  : at => at - 1,
  ArrowRight : at => at + 1,
  ArrowUp    : at => at + 1,
  End        : (_, last) => last,
  Home       : () => 0
}

/**
 * Reads the step under a pointer along the clock line.
 */
function stepUnder(event: PointerEvent, last: number): number {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return Math.round(clamp((event.clientX - box.left) / (box.width || 1), 0, 1) * last)
}

/**
 * The clock line beneath a front page widget, a tick per step, the stretch
 * played so far in the section's color, and a chip naming the step in view,
 * which a press or a drag along the line or an arrow key moves, as the ARIA
 * slider pattern sets out.
 */
export const Clock = defineComponent({
  name: 'ScotchFrontClock',

  props: {
    at    : { required: true, type: Number },
    label : { required: true, type: String },
    names : { required: true, type: Array as PropType<readonly string[]> },
    pick  : { required: true, type: Function as PropType<(step: number) => void> }
  },

  setup: props => {
    let dragging = false
    return (): VNode => {
      const last  = props.names.length - 1
      const share = `${last ? props.at / last * 100 : 100}%`
      return h('div', {
        'aria-label'     : props.label,
        'aria-valuemax'  : String(last + 1),
        'aria-valuemin'  : '1',
        'aria-valuenow'  : String(props.at + 1),
        'aria-valuetext' : props.names[props.at],
        'class'          : 'sc-front-clock',
        'role'           : 'slider',
        'style'          : { '--sc-front-clock': share },
        'tabindex'       : '0',

        'onKeydown': (event: KeyboardEvent) => {
          const step = CLOCK_KEYS[event.key]
          if (!step) return
          event.preventDefault()
          props.pick(clamp(step(props.at, last), 0, last))
        },

        'onPointerdown': (event: PointerEvent) => {
          const line = event.currentTarget as HTMLElement
          dragging   = true
          line.setPointerCapture(event.pointerId)
          props.pick(stepUnder(event, last))
        },

        'onPointermove': (event: PointerEvent) => {
          if (dragging) props.pick(stepUnder(event, last))
        },

        'onPointerup': () => {
          dragging = false
        }
      }, [
        ...props.names.map((_, step) => h('i', {
          'data-on' : step <= props.at ? '' : undefined,
          'style'   : { left: `${last ? step / last * 100 : 0}%` }
        })),
        h('b'),
        h('span', props.names[props.at])
      ])
    }
  }
})
