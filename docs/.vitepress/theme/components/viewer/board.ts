import type { PropType, ShallowRef, VNode }                                  from 'vue'
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

import * as drawings                                 from '../../../lib/viewer/drawing.ts'
import { GameBoard }                                 from '../../../lib/viewer/gameboard.ts'
import * as games                                    from '../../../lib/viewer/games.ts'
import { type Loaded, NOTHING, PARTIES, type Party } from '../../../lib/viewer/loaded.ts'
import { Picking, squareAt }                         from '../../../lib/viewer/offering.ts'
import { type Hop, moveTo, standingOf }              from '../../../lib/viewer/placements.ts'
import { type Facing, SQUARE, cornerOf, groundOf }   from '../../../lib/viewer/trail.ts'
import { startMark }                                 from '../start.ts'
import { SHADES }                                    from './parts.ts'

/**
 * The calls a board answers the pointer through while it takes a move.
 */
interface Pointing {
  onPointerdown : (event: PointerEvent) => void
  onPointerup   : (event: PointerEvent) => void
}

/**
 * What a board draws at the ply it opens on, before its motion takes over: each
 * piece at rest and the last move's two squares.
 */
interface Opening {
  hop?   : Hop
  pieces : readonly drawings.PieceDrawing[]
}

/**
 * The board, outlined in its game's color and taking the pointer while it
 * takes a move.
 */
const BOARD = 'block aspect-square h-auto w-full rounded-sm [box-shadow:0_0_0_2px_var(--sc-viewer-game)] '
            + 'data-taking:cursor-pointer data-taking:touch-none'
/**
 * The caption under a board, the game's name beside the move reaching the
 * cursor, the name dropped on a narrow screen.
 */
const CAPTION = {
  move : 'col-start-2 w-[10ch] text-right font-code text-[0.84rem] leading-(--sc-viewer-caption) '
       + 'font-medium tabular-nums whitespace-nowrap text-ink [&_[data-start]]:text-(--sc-viewer-game) '
       + '[&_[data-start]>span]:text-(--sc-viewer-word) max-sm:text-[0.7rem]',
  name : 'overflow-hidden font-display text-[length:min(1.2rem,6.4cqi)] leading-(--sc-viewer-caption) '
       + 'font-normal text-ellipsis whitespace-nowrap max-sm:hidden',
  row  : 'grid h-(--sc-viewer-caption) grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[9px] '
       + 'max-sm:[--sc-viewer-caption:18px]'
} as const
/**
 * The line filling the stored game's square, shown only while no stored game
 * shares a position.
 */
const EMPTY = 'absolute inset-0 m-0 hidden max-w-none place-items-center rounded-sm border border-dashed '
            + 'border-rule bg-page p-[12%] text-center font-body text-base/[22px] font-normal text-quiet '
            + 'italic in-data-[matched=no]:grid'
/**
 * One game's board over its caption, sized by its own width.
 */
const FIGURE = '@container m-0 grid min-w-0 content-start gap-2.5'
/**
 * The mark on each of the last move's two squares, a wash of its game's color
 * inside a line of it.
 */
const HOP = 'fill-[color-mix(in_srgb,var(--sc-viewer-game)_30%,transparent)] stroke-(--sc-viewer-game)'
/**
 * Where each game's board stands in the stage's grid on a narrow screen,
 * where the stage sets the two boards side by side.
 */
const PLACES = {
  stored    : 'max-lg:[grid-area:2/2]',
  submitted : 'max-lg:[grid-area:2/1]'
} as const satisfies Record<Party, string>

/**
 * Draws one game's arrow on a board, faded and thinner on the other game's
 * board, shown after the step's delay once it is on.
 */
function arrow(game: Party, party: Party): VNode {
  const own = game === party
  return h('g', {
    'class'     : [
      'opacity-0 transition-opacity data-on:[transition-delay:var(--sc-viewer-step,0ms)]',
      own ? 'data-on:opacity-100' : 'data-on:opacity-40'
    ],
    'data-game' : game
  }, [
    h('path', { class: ['stroke-(--sc-viewer-game) [stroke-linecap:round]', own ? 'stroke-4' : 'stroke-3'] }),
    h('path', { class: 'fill-(--sc-viewer-game)' })
  ])
}

/**
 * The board's squares, the two marks of the last move, the layer its pieces are
 * drawn in, and the two arrows naming each game's next move, drawn on
 * python-chess's 45-unit squares at the ply the board opens on, so the build
 * renders the position and the board's motion takes the same nodes over.
 */
function drawing(
  facing    : Facing,
  label     : string,
  opening   : Opening,
  party     : Party,
  svg       : ShallowRef<SVGSVGElement | null>,
  picked?   : number,
  pointing? : Pointing
): VNode {
  return h('svg', {
    'aria-label'  : label,
    'class'       : [BOARD, party === 'stored' ? 'in-data-[matched=no]:invisible' : ''],
    'data-taking' : pointing ? '' : undefined,
    'ref'         : svg,
    'role'        : 'img',
    'viewBox'     : `0 0 ${8 * SQUARE} ${8 * SQUARE}`,
    ...pointing
  }, [
    h('g', groundOf(facing).map(({ shade, square, x, y }) => h('rect', {
      'class'       : SHADES[shade],
      'data-shade'  : shade,
      'data-square' : square,
      'height'      : SQUARE,
      'width'       : SQUARE,
      'x'           : x,
      'y'           : y
    }))),
    ...[opening.hop?.from, opening.hop?.to].map(square => h('rect', {
      'class'        : HOP,
      'data-hop'     : '',
      'height'       : SQUARE - drawings.HOP_STROKE,
      'opacity'      : square === undefined ? 0 : 1,
      'stroke-width' : drawings.HOP_STROKE,
      'width'        : SQUARE - drawings.HOP_STROKE,
      ...square === undefined ? {} : drawings.hopAt(square, facing)
    })),
    h('g', { 'data-pieces': '' }, opening.pieces.map(drawn => h('g', {
      'data-piece'  : drawn.piece,
      'data-square' : drawn.square,
      'innerHTML'   : drawn.markup,
      'opacity'     : '1',
      'transform'   : drawn.transform
    }))),
    pickedMark(facing, picked),
    ...PARTIES.map(game => arrow(game, party))
  ])
}

/**
 * Reads what a game's board draws at the cursor it opens on, nothing where the
 * match leaves the game out.
 */
function openingOf(cursor: number, loaded: Loaded, party: Party): Opening {
  const side = loaded.sideOf(party)
  if (!side) return { pieces: [] }
  const ply = loaded.plyOf(party, cursor)
  const hop = moveTo(side.placements, ply)
  return { hop, pieces: drawings.piecesAt(side.placements[ply]!) }
}

/**
 * Draws the outline around the square whose piece a player picked, or nothing
 * while none is.
 */
function pickedMark(facing: Facing, picked?: number): VNode | null {
  if (picked === undefined) return null
  return h('rect', {
    'class'       : 'pointer-events-none fill-none stroke-(--sc-viewer-game) stroke-3',
    'data-picked' : '',
    'height'      : SQUARE,
    'width'       : SQUARE,
    ...cornerOf(picked, facing)
  })
}

/**
 * Answers the pointer on a board taking a move: a press or a release on a
 * square goes to the picking, which a press then keeps the pointer captured
 * for, and a move it makes goes to `offer`.
 */
function pointingOf(
  picking : Picking,
  props   : { cursor: number, facing: Facing, loaded: Loaded, party: Party },
  offer   : (hop?: Hop, picked?: number) => void
): Pointing {
  const answer = (event: PointerEvent, press: boolean): void => {
    const side   = props.loaded.sideOf(props.party)
    const square = squareOf(event, props.facing)
    if (!side || square === undefined) return
    const ply = props.loaded.plyOf(props.party, props.cursor)
    const hop = press
      ? picking.press(square, standingOf(side.placements[ply]!), games.numberingOf(side)(ply).white)
      : picking.release(square)
    if (press) (event.currentTarget as Element).setPointerCapture(event.pointerId)
    offer(hop, picking.picked)
  }
  return {
    onPointerdown : event => answer(event, true),
    onPointerup   : event => answer(event, false)
  }
}

/**
 * Reads the square under a pointer event on a board turned to face one side.
 */
function squareOf(event: PointerEvent, facing: Facing): number | undefined {
  const svg   = event.currentTarget as SVGSVGElement
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM()?.inverse())
  return squareAt(point.x, point.y, facing)
}

/**
 * One game's board, outlined in its game's color, with its caption beneath
 * naming the game and the move reaching the ply the cursor shows, the stored
 * game's board holding a line saying nothing matched in its own square where no
 * stored game shares a position. A `GameBoard` moves its pieces once it mounts,
 * which the Viewer reaches through `board`. While `taking` is set, the board
 * takes a move from the pointer, by a drag or by two taps, and emits it as
 * `offer`.
 */
export const GameFigure = defineComponent({
  name: 'ScotchGameFigure',

  props: {
    cursor : { required: true, type: Number },
    facing : { required: true, type: String as PropType<Facing> },
    loaded : { required: true, type: Object as PropType<Loaded> },
    party  : { required: true, type: String as PropType<Party> },
    taking : { default: false, type: Boolean }
  },

  emits: {
    offer: (hop: Hop) => Number.isInteger(hop.from) && Number.isInteger(hop.to)
  },

  setup: (props, { emit, expose }) => {
    const svg     = shallowRef<SVGSVGElement | null>(null)
    const board   = shallowRef<GameBoard>()
    const opening = openingOf(props.cursor, props.loaded, props.party)
    const picking = new Picking()
    const picked  = shallowRef<number>()
    const offered = (hop?: Hop, square?: number): void => {
      picked.value = square
      if (hop) emit('offer', hop)
    }
    const pointing = pointingOf(picking, props, offered)

    watch(() => [props.cursor, props.taking], () => {
      picking.drop()
      picked.value = undefined
    })

    onMounted(() => {
      board.value = new GameBoard(svg.value!)
    })
    onBeforeUnmount(() => {
      board.value?.dispose()
    })
    expose({ board })

    return () => {
      const side = props.loaded.sideOf(props.party)
      const ply  = props.loaded.plyOf(props.party, props.cursor)
      const move = side && ply ? games.numbered(side, ply - 1) : startMark()
      return h('figure', { 'class': [FIGURE, PLACES[props.party]], 'data-game': props.party }, [
        h('div', { class: 'relative aspect-square' }, [
          drawing(
            props.facing,
            `The ${props.party} game at ply ${ply}`,
            opening,
            props.party,
            svg,
            picked.value,
            props.taking ? pointing : undefined
          ),
          props.party === 'stored' ? h('p', { class: EMPTY }, `${NOTHING}.`) : null
        ]),
        h('figcaption', { class: CAPTION.row }, [
          h('span', { class: CAPTION.name }, side ? games.nameOf(side) : 'Nothing matched'),
          h('span', { class: CAPTION.move }, side ? move : '')
        ])
      ])
    }
  }
})
