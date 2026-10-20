import { usePreferredReducedMotion } from '@vueuse/core'
import { type PropType, type Ref, type VNode, defineComponent, h, shallowRef, useId, watch } from 'vue'

import * as example                   from '../../../lib/methods/example.ts'
import * as motion                    from '../../../lib/methods/motion.ts'
import { type Stepping, useStepping } from '../../../lib/methods/stepping.ts'
import { RunBoard }                   from './board.ts'

interface Drawn {
  example  : example.Example
  id       : string
  last     : number
  stepping : Stepping
}

/**
 * The sentence next to the key naming where the two games' names sit.
 */
const NOTE = 'The lanes carry their names beside the timeline, and the list names its two columns '
           + 'above the bars beside each move.'

/**
 * Draws one cell of the timeline in the column of its ply, across the lanes it
 * spans.
 */
function cell(kind: string, ply: number, rows: string): VNode {
  return h('i', {
    'class'     : 'sc-run-cell',
    'data-cell' : kind,
    'style'     : { gridColumn: String(ply + 1), gridRow: rows }
  })
}

function cells(drawn: Drawn, head: Ref<HTMLElement | null>, headStyle: Record<string, string>): VNode {
  return h('div', { 'aria-hidden': 'true', 'class': 'sc-run-cells' }, [
    ...drawn.example.submitted.flatMap((_, ply) => {
      const kind = example.cellOf(drawn.example, ply)
      if (kind !== 'apart') return [cell(kind, ply, '1 / -1')]
      return [cell('submitted', ply, '1'), cell('stored', ply, '2')]
    }),
    h('span', { class: 'sc-run-head', ref: head, style: headStyle })
  ])
}

/**
 * Centers a ply's row in the list of plies, scrolling the list alone rather
 * than the page around it.
 */
function centerRow(how: motion.How | undefined, list: HTMLElement, ply: number): void {
  const row = list.children[ply] as HTMLElement
  const top = row.offsetTop - (list.clientHeight - row.offsetHeight) / 2
  list.scrollTo({ behavior: how ? 'smooth' : 'auto', top })
}

function controls({ last, stepping }: Drawn): VNode {
  const { go, play, playing, ply } = stepping
  return h('div', { class: 'sc-run-controls' }, [
    h('button', {
      class    : 'sc-run-button',
      disabled : ply.value === 0,
      onClick  : () => go(ply.value - 1),
      type     : 'button'
    }, 'Previous'),
    h('button', {
      class    : 'sc-run-button',
      disabled : ply.value === last,
      onClick  : () => go(ply.value + 1),
      type     : 'button'
    }, 'Next'),
    h('button', {
      'aria-pressed' : String(playing.value),
      'class'        : 'sc-run-button',
      'onClick'      : play,
      'type'         : 'button'
    }, 'Play')
  ])
}

function option(drawn: Drawn, ply: number): VNode {
  const submitted = drawn.example.submitted[ply]!.san ?? 'Start'
  const stored    = drawn.example.stored[ply]!.san ?? 'Start'
  const mark      = { [drawn.example.run.start]: 'meets', [example.partOf(drawn.example)]: 'parts' }[ply]
  const at        = ply === drawn.stepping.ply.value
  const label     = ply
                  ? `Ply ${ply}, ${submitted} in the line and ${stored} in the stored game`
                  : 'The starting position'
  return h('div', {
    'aria-label'    : label,
    'aria-selected' : String(at),
    'class'         : 'sc-run-option',
    'data-at'       : at ? '' : undefined,
    'data-cell'     : example.cellOf(drawn.example, ply),
    'id'            : `${drawn.id}-ply-${ply}`,
    'onClick'       : () => drawn.stepping.go(ply),
    'role'          : 'option'
  }, [
    h('span', { class: 'sc-run-ply' }, String(ply)),
    h('span', { 'class': 'sc-run-move', 'data-game': 'submitted' }, [
      submitted,
      mark ? h('span', { class: 'sc-run-mark' }, mark) : null
    ]),
    h('span', { 'class': 'sc-run-move', 'data-game': 'stored' }, stored)
  ])
}

function plies(drawn: Drawn, list: Ref<HTMLElement | null>): VNode {
  return h('div', { class: 'sc-run-plies' }, [
    h('div', { 'aria-hidden': 'true', 'class': 'sc-run-heads' }, [
      h('span', 'Ply'),
      h('span', { 'data-game': 'submitted' }, 'Submitted'),
      h('span', { 'data-game': 'stored' }, 'Stored')
    ]),
    h('div', {
      'aria-activedescendant' : `${drawn.id}-ply-${drawn.stepping.ply.value}`,
      'aria-label'            : 'Plies of the two games',
      'class'                 : 'sc-run-list',
      'onKeydown'             : drawn.stepping.answer,
      'ref'                   : list,
      'role'                  : 'listbox',
      'tabindex'              : '0'
    }, drawn.example.submitted.map((_, ply) => option(drawn, ply)))
  ])
}

function ruler({ example: shown, last }: Drawn): VNode {
  return h('div', { 'aria-hidden': 'true', 'class': 'sc-run-ruler' }, [
    rulerMark(0, 'Start'),
    rulerMark(shown.run.start, 'Meets'),
    rulerMark(Math.min(example.partOf(shown), last), 'Parts', true)
  ])
}

/**
 * Writes one label of the timeline's ruler over the column of its ply, the last
 * label ending where its column ends.
 */
function rulerMark(ply: number, text: string, end = false): VNode {
  return h('span', { 'data-end': end ? '' : undefined, 'style': { gridColumn: String(ply + 1) } }, text)
}

/**
 * The widget the Methods pages step through a match with: a line built for the
 * page and the stored game it meets by another move order, drawn on one board
 * where each square the two differ on is washed in the color of the game
 * standing a piece there, beside a timeline of the plies in lanes that join
 * through the run and a list of both games' moves, a reader stepping with the
 * buttons, the list, or the keyboard, or playing the line through.
 */
export const Run = defineComponent({
  name: 'ScotchRun',

  props: {
    example : { default: () => example.exampleOf(), type: Object as PropType<example.Example> },
    tuning  : { default: () => example.RUN_TUNING, type: Object as PropType<example.Tuning> }
  },

  setup: props => {
    const last      = props.example.submitted.length - 1
    const opening   = example.openingOf(props.example)
    const board     = shallowRef<{ show: (ply: number, how?: motion.How) => void } | null>(null)
    const head      = shallowRef<HTMLElement | null>(null)
    const list      = shallowRef<HTMLElement | null>(null)
    const reduced   = usePreferredReducedMotion()
    const running   = [] as Animation[]
    const headStyle = { opacity: '1', transform: example.timelineAt(props.tuning.gap, opening) }
    const drawn     = {
      example  : props.example,
      id       : useId(),
      last     : last,
      stepping : useStepping(props.tuning.interval, last, opening)
    }

    watch(drawn.stepping.ply, (to, from) => {
      const how = motion.howOf(from, reduced.value === 'reduce', to)
      board.value?.show(to, how)
      motion.settleAll(running)
      motion.moveNode(head.value!, how, running, {
        opacity   : 1,
        transform : example.timelineAt(props.tuning.gap, to)
      })
      centerRow(how, list.value!, to)
    })

    return () => h('div', {
      class : 'sc-run',
      style : { '--sc-run-cells': String(last + 1), '--sc-run-gap': `${props.tuning.gap}px` }
    }, [
      controls(drawn),
      h('span', { class: 'sc-run-status', role: 'status' },
        example.statusAt(props.example, drawn.stepping.ply.value)),
      h('div', { 'aria-hidden': 'true', 'class': 'sc-run-lanes' }, [
        h('span', { 'data-game': 'submitted' }, 'Submitted'),
        h('span', { 'data-game': 'stored' }, 'Stored')
      ]),
      cells(drawn, head, headStyle),
      ruler(drawn),
      h(RunBoard, { example: props.example, opening, ref: board }),
      plies(drawn, list),
      h('p', { class: 'sc-run-note' }, NOTE)
    ])
  }
})
