import type { PropType, ShallowRef, VNode }                                     from 'vue'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, shallowRef } from 'vue'

import { type Loaded, NOTHING, PARTIES, type Pair, type Party } from '../../../lib/viewer/loaded.ts'
import { SheetMarker } from '../../../lib/viewer/marker.ts'
import * as sheets     from '../../../lib/viewer/sheet.ts'
import { startMark }   from '../start.ts'

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
 * The box the rows scroll in under a rule in the ink.
 */
const BOX = 'relative min-h-0 overflow-y-auto overscroll-contain border-t-2 border-ink [scrollbar-width:thin]'
/**
 * The sheets over the sign, the sign above them on a narrow screen, with the
 * width of the gutter between the two games.
 */
const LEDGER = 'grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_var(--sc-viewer-caption)] gap-2.5 '
             + '[--sc-viewer-gut:40px] max-lg:grid-rows-[var(--sc-viewer-caption)_minmax(0,1fr)]'
/**
 * One move as a button filling its cell, lit in the ink where it reaches the
 * cursor, outlined in a dashed ring where it belongs to the pair played in
 * another order, and hatched with its text hidden while the stored game is
 * covered past it.
 */
const MOVE = [
  'focus-ring',
  'relative flex h-[calc(var(--sc-viewer-pitch)_-_1px)] w-full cursor-pointer items-center justify-between',
  'gap-1.5 border-0 bg-transparent px-1.5 py-0 text-left font-code text-[0.8rem]/none font-medium text-ink',
  'transition-[background-color] hover:bg-tint aria-[current=step]:bg-ink aria-[current=step]:text-page',
  'data-twin:outline-[1.5px] data-twin:-outline-offset-3 data-twin:outline-run data-twin:outline-dashed',
  'aria-[current=step]:data-twin:outline-page data-covered:cursor-default data-covered:*:invisible',
  'data-covered:bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--sc-rule)_5px_6px)]',
  'max-sm:px-1 max-sm:text-[0.7rem]'
]
/**
 * The line under the submitted game's sheet saying no stored game matched.
 */
const NONE = 'm-0 mt-3.5 max-w-none pl-[calc(50%_+_12px)] font-body text-[0.9rem]/[20px] font-normal '
           + 'text-quiet italic'
/**
 * The number heading one game's half of a row, in the code face's figures.
 */
const NUMBER = 'px-1 text-right font-code text-[0.7rem]/[calc(var(--sc-viewer-pitch)_-_1px)] font-medium '
             + 'tabular-nums text-quiet max-sm:px-0.5 max-sm:text-[0.6rem]'
/**
 * One row of both games' moves, a number and two moves each side of the
 * gutter, lit in the run's tint where the cursor stands.
 */
const ROW = [
  'grid h-(--sc-viewer-pitch) border-b border-[color-mix(in_srgb,var(--sc-rule)_70%,transparent)]',
  'grid-cols-[2.1rem_minmax(0,1fr)_minmax(0,1fr)_var(--sc-viewer-gut)_2.1rem_minmax(0,1fr)_minmax(0,1fr)]',
  'max-sm:grid-cols-[1.7rem_minmax(0,1fr)_minmax(0,1fr)_var(--sc-viewer-gut)_1.7rem_minmax(0,1fr)_minmax(0,1fr)]',
  'data-at:bg-[color-mix(in_srgb,var(--sc-run)_18%,var(--sc-page))]',
  'data-at:[box-shadow:inset_2px_0_0_var(--sc-ink)]'
]

/**
 * Draws one move as a button moving the cursor to it, marked as the move the
 * cursor stands on where it reaches the cursor the sheets open on, and outlined
 * where it belongs to the pair the sheets open on.
 */
function cell(opening: Opening, party: Party, move?: sheets.Cell): VNode {
  const { at, go, twin } = opening
  return h('span', { class: 'min-w-0', role: 'gridcell' }, move ? [h('button', {
    'aria-current' : move.reach === at ? 'step' : undefined,
    'class'        : MOVE,
    'data-party'   : party,
    'data-run'     : move.run ? '' : undefined,
    'data-tag'     : move.tag,
    'data-twin'    : twin?.[party] === move.reach ? '' : undefined,
    'onClick'      : () => go(move.reach),
    'tabindex'     : move.reach === at ? '0' : '-1',
    'type'         : 'button'
  }, [
    h('span', { class: 'min-w-0 overflow-hidden' }, move.san),
    move.tag
      ? h('span', {
          class: 'size-[7px] flex-none rotate-45 rounded-[1px] bg-run text-[length:0] '
               + 'in-aria-[current=step]:bg-page'
        }, move.tag)
      : null
  ])] : [])
}

/**
 * Draws the grid of rows, the row holding the starting position first, lit
 * where the cursor the sheets open on stands.
 */
function grid(
  loaded  : Loaded,
  opening : Opening,
  rows    : ShallowRef<HTMLElement | null>,
  sheet   : sheets.Sheet
): VNode {
  const lit    = sheets.rowAt(opening.at, sheet.first)
  const starts = { stored: start(loaded, 'stored'), submitted: start(loaded, 'submitted') }
  return h('div', {
    'aria-label' : 'Both games’ moves, row by row',
    'class'      : 'relative',
    'ref'        : rows,
    'role'       : 'grid'
  }, [
    row(sheet.start === lit, false, starts),
    ...sheet.rows.map(each => row(each.index === lit, each.run, {
      stored    : moves(opening, 'stored', each.stored),
      submitted : moves(opening, 'submitted', each.submitted)
    }))
  ])
}

function moves(opening: Opening, party: Party, { black, no, white }: sheets.Half): VNode[] {
  return [
    h('span', { class: NUMBER, role: 'rowheader' }, no ?? ''),
    cell(opening, party, white),
    cell(opening, party, black)
  ]
}

function row(lit: boolean, run: boolean, halves: Record<Party, VNode[]>): VNode {
  return h('div', {
    'class'    : ROW,
    'data-at'  : lit ? '' : undefined,
    'data-run' : run ? '' : undefined,
    'role'     : 'row'
  }, [
    ...halves.submitted,
    h('span', { 'aria-hidden': 'true', 'data-gutter': '' }),
    ...halves.stored
  ])
}

/**
 * The sign beneath the sheets, an equals sign in the run's color while the two
 * boards show one position, crossed through while they differ.
 */
function sign(): VNode {
  return h('div', {
    'aria-hidden' : 'true',
    'class'       : 'grid place-items-center text-quiet in-data-[matched=no]:invisible '
                  + 'in-data-[shared=yes]:text-run max-lg:-order-1'
  }, [
    h('svg', {
      class   : 'block size-5 fill-none stroke-current stroke-[2.2] [stroke-linecap:round] '
              + 'max-sm:size-[22px]',
      viewBox : '0 0 28 28'
    }, [
      h('path', { d: 'M7 11h14M7 17h14' }),
      h('path', {
        class : 'origin-[14px_14px] transition-[opacity,scale] duration-settle '
              + 'in-data-[shared=yes]:opacity-0 in-data-[shared=yes]:[scale:0.4]',
        d     : 'M17.5 6.5l-7 15'
      })
    ])
  ])
}

/**
 * Sets the start mark across one game's two columns of the row holding the
 * starting position, in the game's color, or leaves them empty where no game
 * stands on that side.
 */
function start(loaded: Loaded, party: Party): VNode[] {
  return [
    h('span', { class: NUMBER, role: 'rowheader' }),
    h('span', {
      'class'     : 'col-span-2 flex min-w-0 items-center px-1.5 text-[0.8rem] text-(--sc-viewer-game)',
      'data-game' : party,
      'role'      : 'gridcell'
    }, loaded.sideOf(party) ? [startMark()] : [])
  ]
}

/**
 * The picture over the gutter between the sheets: each game's thread, the run's
 * band, and each game's ring, which the marker lays out once the rows are
 * drawn.
 */
function threads(svg: ShallowRef<SVGSVGElement | null>): VNode {
  return h('svg', {
    'aria-hidden' : 'true',
    'class'       : 'pointer-events-none absolute top-0 left-0 z-1 overflow-visible',
    'ref'         : svg
  }, [
    ...PARTIES.map(party => h('path', {
      'class'     : 'fill-none stroke-(--sc-viewer-game) stroke-2 [stroke-linecap:round]',
      'data-game' : party
    })),
    h('rect', { 'class': 'fill-run', 'data-bar': '' }),
    h('g', { 'data-rings': '' }, PARTIES.map(party => h('g', {
      'class'     : [
        'transition-opacity will-change-transform in-data-gliding:transition-[transform,opacity]',
        'in-data-gliding:[transition-duration:var(--sc-viewer-step,var(--sc-duration-glide)),var(--sc-duration-fade)]'
      ],
      'data-game' : party
    }, [h('circle', { class: 'fill-raised stroke-ink stroke-2', r: 5 })])))
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
      cover: (cursor?: number) => {
        marker?.cover(cursor)
      },
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
      return h('div', { class: LEDGER }, [
        h('div', { class: BOX, ref: box }, [
          grid(props.loaded, opening, rows, sheet.value),
          props.loaded.match.stored
            ? null
            : h('p', { class: NONE }, `${NOTHING}.`),
          threads(svg)
        ]),
        sign()
      ])
    }
  }
})
