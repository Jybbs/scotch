import { clamp }                                                                                   from '@vueuse/core'
import { type ComputedRef, type ShallowRef, type VNode, computed, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart }               from '../../../lib/data/chart.ts'
import { hexOf }                             from '../../../lib/identity/tokens.ts'
import { narrowAt, pickable }                from '../../../lib/reference/pick.ts'
import * as moves                            from '../../../lib/reference/pieces.ts'
import { type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { type Piece, ringed, svgOf }         from '../../../lib/site/pieces.ts'
import { BED, BESIDE, stage }               from './parts.ts'

/**
 * The piece on show, its square, and the squares it reaches, beside the call
 * that picks a piece from the tray.
 */
interface Standing {
  lit    : ComputedRef<Set<number>>
  pick   : (index: number) => void
  piece  : ShallowRef<Piece>
  square : ShallowRef<number>
}

const SQUARES = Array.from({ length: 64 }, (_, square) => square)
const STEP    = 1650
const LAG     = 55
const COLORS  = { dark: hexOf('primary'), light: hexOf('light') } as const
/**
 * What each arrow key moves the piece by, in files and in ranks.
 */
const STEPS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1]
}

function drawing(piece: Piece): string {
  return svgOf(ringed(piece, HALO))
}

function shade(file: number, rank: number): 'dark' | 'light' {
  return (file + rank) % 2 ? 'dark' : 'light'
}

/**
 * Holds the piece on show and runs the unfold on `chart`.
 */
function useStanding(chart: NodeRef): Standing {
  const piece  = shallowRef<Piece>('Q')
  const square = shallowRef(moves.HOMES.Q)
  const beats  = useBeats()

  const pick = (index: number): void => {
    piece.value  = moves.TYPES[index]!
    square.value = moves.HOMES[piece.value]
  }

  useUnfold(chart, beats, {
    length : 11_000,
    play   : (time, done) => {
      moves.WALK.forEach(([name, to], index) => {
        time.at(300 + index * STEP, () => {
          pick(moves.TYPES.indexOf(name))
        })
        time.at(1150 + index * STEP, () => {
          square.value = to
        })
      })
      time.at(300 + moves.WALK.length * STEP, done)
    },
    prime  : () => {
      pick(1)
    },
    settle : () => {
      pick(1)
    }
  })

  return { lit: computed(() => new Set(moves.reach(piece.value, square.value))), pick, piece, square }
}

/**
 * The pale ground a dark piece stands on, drawn beneath its outline.
 */
const HALO = '[&_*]:fill-[color-mix(in_oklab,var(--sc-light)_85%,transparent)]! '
           + '[&_*]:stroke-[color-mix(in_oklab,var(--sc-light)_85%,transparent)]! [&_*]:[stroke-width:3.4]!'

/**
 * Sets a piece's drawing to fill the element holding it.
 */
const FILLED = '[&_svg]:block [&_svg]:size-full'

function tile(index: number, { lit, square }: Standing): VNode {
  const [file, rank]     = moves.placeOf(index)
  const [atFile, atRank] = moves.placeOf(square.value)
  const on               = lit.value.has(index)
  return h('i', {
    'class'    : 'absolute grid size-[12.5%] place-items-center',
    'data-lit' : on ? '' : undefined,
    'style'    : {
      '--sc-ref-color' : COLORS[shade(file, rank) === 'dark' ? 'light' : 'dark'],
      '--sc-ref-lag'   : `${on ? Math.max(Math.abs(file - atFile), Math.abs(rank - atRank)) * LAG : 0}ms`,
      'background'     : COLORS[shade(file, rank)],
      'left'           : `${file * 12.5}%`,
      'top'            : `${rank * 12.5}%`
    }
  }, h('i', {
    class: [
      'size-[34%] rounded-[1px] bg-(--sc-ref-color) opacity-0 [transform:scale(0.3)]',
      'transition-[opacity,transform] delay-(--sc-ref-lag) duration-move',
      'in-data-lit:opacity-100 in-data-lit:[transform:scale(1)]'
    ]
  }))
}

function board(state: Standing): VNode {
  const { piece, square } = state
  const [file, rank]      = moves.placeOf(square.value)
  return h('div', {
    'aria-label' : `A board holding one piece, a press on any square standing it there, now on ${moves.squareName(square.value)}`,
    'class'      : [
      'relative aspect-square cursor-pointer touch-manipulation overflow-clip rounded-xs select-none',
      '[box-shadow:0_0_0_1px_var(--sc-rule)]',
      'focus-ring'
    ],
    'onClick'    : (event: PointerEvent) => {
      const { x, y } = pointerAt(event)
      const box      = (event.currentTarget as Element).getBoundingClientRect()
      square.value   = (7 - clamp(Math.floor(y / box.height * 8), 0, 7)) * 8 + clamp(Math.floor(x / box.width * 8), 0, 7)
    },
    'onKeydown'  : (event: KeyboardEvent) => {
      const step = STEPS[event.key]
      if (step === undefined) return
      event.preventDefault()
      square.value = clamp((square.value >> 3) + step[1], 0, 7) * 8 + clamp(square.value % 8 + step[0], 0, 7)
    },
    'role'       : 'application',
    'tabindex'   : 0
  }, [
    ...SQUARES.map(index => tile(index, state)),
    h('i', {
      class     : [FILLED, 'pointer-events-none absolute top-0 left-0 size-[12.5%] transition-[transform] duration-glide'],
      innerHTML : drawing(piece.value),
      style     : { transform: `translate(${file * 100}%, ${rank * 100}%)` }
    })
  ])
}

function beside({ lit, pick, piece, square }: Standing): VNode {
  const at = moves.TYPES.indexOf(piece.value)
  return h('div', { class: BESIDE }, [
    h('div', { class: 'grid grid-cols-[62px_62px_minmax(0,1fr)] items-center' }, [
      ...(['light', 'dark'] as const).map(ground => h('i', {
        class     : [FILLED, 'aspect-square'],
        innerHTML : drawing(piece.value),
        style     : { background: COLORS[ground] }
      })),
      h('div', { class: 'ml-3 min-w-0' }, [
        h('h4', {
          class: 'm-0! border-0 p-0 font-display text-[1.05rem]/[1.2]! font-normal tracking-normal! text-ink normal-nums'
        }, moves.pieceName(piece.value)),
        h('p', {
          class: 'font-code text-[0.66rem]/[1.4]! font-medium text-quiet normal-nums'
        }, `${lit.value.size} squares from ${moves.squareName(square.value)} on an empty board`)
      ])
    ]),
    h('div', { class: 'grid grid-cols-6' }, moves.TYPES.map((name, index) => h('button', {
      ...pickable(index, at, moves.TYPES.length, pick),
      'aria-label' : moves.pieceName(name),
      'class'      : [
        'relative aspect-square aria-pressed:z-1',
        'aria-pressed:[box-shadow:0_0_0_2px_var(--sc-page),0_0_0_3.5px_var(--sc-run)]',
        FILLED
      ],
      'innerHTML'  : drawing(name),
      'style'      : { background: COLORS[(index + (index > 5 ? 1 : 0)) % 2 ? 'dark' : 'light'] }
    })))
  ])
}

/**
 * The board and pieces as one piece a reader picks and stands on any square,
 * every square it then reaches lighting in a wave out from it, the piece's name
 * and what it reaches beside the board on both square colors.
 */
export const Pieces = defineComponent({
  name  : 'ReferencePieces',
  setup : () => {
    const { chart, layout } = useChart(narrowAt)
    const state             = useStanding(chart)

    return () => stage(chart, layout.value.narrow, [h('div', { class: BED }, [board(state), beside(state)])])
  }
})
