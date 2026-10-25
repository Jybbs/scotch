import type { PropType, ShallowRef, VNode }                                     from 'vue'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, shallowRef } from 'vue'

import { type Loaded, NOTHING, PARTIES, type Pair, type Party } from '../../../lib/viewer/loaded.ts'
import { SheetMarker } from '../../../lib/viewer/marker.ts'
import * as sheets     from '../../../lib/viewer/sheet.ts'

/**
 * What the sheets are drawn at: the cursor they open on, the call moving the
 * cursor to a move pressed, and the pair the move reaching that cursor belongs
 * to where the two games played it in another order.
 */
interface Opening {
  at    : number
  go    : (to: number) => void
  twin? : Pair
}

/**
 * Draws one move as a button moving the cursor to it, marked as the move the
 * cursor stands on where it reaches the cursor the sheets open on, and outlined
 * where it belongs to the pair the sheets open on.
 */
function cell(opening: Opening, party: Party, move?: sheets.Cell): VNode {
  const { at, go, twin } = opening
  return h('span', { class: 'sc-viewer-cell', role: 'gridcell' }, move ? [h('button', {
    'aria-current' : move.reach === at ? 'step' : undefined,
    'class'        : 'sc-viewer-move',
    'data-party'   : party,
    'data-run'     : move.run ? '' : undefined,
    'data-tag'     : move.tag,
    'data-twin'    : twin?.[party] === move.reach ? '' : undefined,
    'onClick'      : () => go(move.reach),
    'tabindex'     : move.reach === at ? '0' : '-1',
    'type'         : 'button'
  }, [
    h('span', { class: 'sc-viewer-san' }, move.san),
    move.tag ? h('span', { class: 'sc-viewer-tag' }, move.tag) : null
  ])] : [])
}

function half(opening: Opening, party: Party, { black, no, white }: sheets.Half): VNode[] {
  return [
    h('span', { class: 'sc-viewer-no', role: 'rowheader' }, no ?? ''),
    cell(opening, party, white),
    cell(opening, party, black)
  ]
}

function row(lit: boolean, opening: Opening, sheetRow: sheets.SheetRow): VNode {
  return h('div', {
    'class'    : 'sc-viewer-row',
    'data-at'  : lit ? '' : undefined,
    'data-run' : sheetRow.run ? '' : undefined,
    'role'     : 'row'
  }, [
    ...half(opening, 'submitted', sheetRow.submitted),
    h('span', { 'aria-hidden': 'true', 'class': 'sc-viewer-gutter' }),
    ...half(opening, 'stored', sheetRow.stored)
  ])
}

/**
 * The sign beneath the sheets, an equals sign in the run's color while the two
 * boards show one position, crossed through while they differ.
 */
function sign(): VNode {
  return h('div', { 'aria-hidden': 'true', 'class': 'sc-viewer-sign' }, [
    h('svg', { viewBox: '0 0 28 28' }, [
      h('path', { d: 'M7 11h14M7 17h14' }),
      h('path', { class: 'sc-viewer-differ', d: 'M17.5 6.5l-7 15' })
    ])
  ])
}

/**
 * The picture over the gutter between the sheets: each game's thread, the run's
 * band, and each game's ring, which the marker lays out once the rows are
 * drawn.
 */
function threads(svg: ShallowRef<SVGSVGElement | null>): VNode {
  return h('svg', { 'aria-hidden': 'true', 'class': 'sc-viewer-threads', 'ref': svg }, [
    ...PARTIES.map(party => h('path', { 'class': 'sc-viewer-thread', 'data-game': party })),
    h('rect', { class: 'sc-viewer-bar' }),
    h('g', { class: 'sc-viewer-rings' }, PARTIES.map(party =>
      h('g', { 'class': 'sc-viewer-ring-at', 'data-game': party }, [h('circle', { r: 5 })])))
  ])
}

/**
 * The two games' score sheets bound row by row, the stored game's moves shifted
 * by the run's offset so each row holds the plies the cursor reaches together,
 * each move a button moving the cursor to it, beside the threads drawn down the
 * gutter between them that join into the run's band, and the sign beneath. The
 * Viewer reaches it through `load` once a match's rows are drawn and through
 * `paint` on each step, which marks the moves at the cursor, lights its row,
 * scrolls the row a third of the way down, and moves the two rings.
 */
export const Ledger = defineComponent({
  name: 'ScotchLedger',

  props: {
    loaded: { required: true, type: Object as PropType<Loaded> }
  },

  emits: { go: (to: number) => Number.isFinite(to) },

  setup: (props, { emit, expose }) => {
    const box   = shallowRef<HTMLElement | null>(null)
    const rows  = shallowRef<HTMLElement | null>(null)
    const svg   = shallowRef<SVGSVGElement | null>(null)
    const sheet = computed(() => sheets.sheetOf(props.loaded))
    const go    = (to: number): void => {
      emit('go', to)
    }
    let marker: SheetMarker | undefined

    onMounted(() => {
      marker = new SheetMarker({ box: box.value!, rows: rows.value!, svg: svg.value! })
    })
    onBeforeUnmount(() => {
      marker?.dispose()
    })

    expose({
      load: () => {
        marker?.load(props.loaded, sheet.value)
      },
      paint: (cursor: number, glide: boolean) => {
        marker?.paint(cursor, glide)
      }
    })

    return () => {
      const at      = props.loaded.shared?.meet ?? 0
      const opening = { at, go, twin: sheets.pairAt(props.loaded, at) }
      const lit     = sheets.rowAt(at, sheet.value.first)
      return h('div', { class: 'sc-viewer-ledger' }, [
        h('div', { class: 'sc-viewer-ledger-box', ref: box }, [
          h('div', {
            'aria-label' : 'Both games’ moves, row by row',
            'class'      : 'sc-viewer-rows',
            'ref'        : rows,
            'role'       : 'grid'
          }, sheet.value.rows.map(each => row(each.index === lit, opening, each))),
          props.loaded.match.stored
            ? null
            : h('p', { class: 'sc-viewer-none' }, `${NOTHING}.`),
          threads(svg)
        ]),
        sign()
      ])
    }
  }
})
