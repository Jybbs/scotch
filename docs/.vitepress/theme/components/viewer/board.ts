import type { PropType, ShallowRef, VNode }                           from 'vue'
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef } from 'vue'

import { readingOrder }                              from '../../../lib/methods/board.ts'
import { shadeOf }                                   from '../../../lib/methods/squares.ts'
import * as drawings                                 from '../../../lib/viewer/drawing.ts'
import { GameBoard }                                 from '../../../lib/viewer/gameboard.ts'
import * as games                                    from '../../../lib/viewer/games.ts'
import { type Loaded, NOTHING, PARTIES, type Party } from '../../../lib/viewer/loaded.ts'
import { type Hop, moveTo }                          from '../../../lib/viewer/placements.ts'
import { type Facing, SQUARE, cornerOf }             from '../../../lib/viewer/trail.ts'

/**
 * What a board draws at the ply it opens on, before its motion takes over: each
 * piece at rest and the last move's two squares.
 */
interface Opening {
  hop?   : Hop
  pieces : readonly drawings.PieceDrawing[]
}

/**
 * The board's squares, the two marks of the last move, the layer its pieces are
 * drawn in, and the two arrows naming each game's next move, drawn on
 * python-chess's 45-unit squares at the ply the board opens on, so the build
 * renders the position and the board's motion takes the same nodes over.
 */
function drawing(
  facing  : Facing,
  label   : string,
  opening : Opening,
  svg     : ShallowRef<SVGSVGElement | null>
): VNode {
  return h('svg', {
    'aria-label' : label,
    'class'      : 'sc-viewer-board',
    'ref'        : svg,
    'role'       : 'img',
    'viewBox'    : `0 0 ${8 * SQUARE} ${8 * SQUARE}`
  }, [
    h('g', readingOrder.map(square => h('rect', {
      'class'       : 'sc-viewer-square',
      'data-shade'  : shadeOf(square),
      'data-square' : square,
      'height'      : SQUARE,
      'width'       : SQUARE,
      ...cornerOf(square, facing)
    }))),
    ...[opening.hop?.from, opening.hop?.to].map(square => h('rect', {
      'class'        : 'sc-viewer-hop',
      'height'       : SQUARE - drawings.HOP_STROKE,
      'opacity'      : square === undefined ? 0 : 1,
      'stroke-width' : drawings.HOP_STROKE,
      'width'        : SQUARE - drawings.HOP_STROKE,
      ...square === undefined ? {} : drawings.hopAt(square, facing)
    })),
    h('g', { class: 'sc-viewer-pieces' }, opening.pieces.map(drawn => h('g', {
      'class'       : 'sc-viewer-piece',
      'data-piece'  : drawn.piece,
      'data-square' : drawn.square,
      'innerHTML'   : drawn.markup,
      'opacity'     : '1',
      'transform'   : drawn.transform
    }))),
    ...PARTIES.map(party => h('g', { 'class': 'sc-viewer-arrow', 'data-game': party }, [
      h('path', { class: 'sc-viewer-arrow-line' }),
      h('path', { class: 'sc-viewer-arrow-head' })
    ]))
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
 * One game's board, outlined in its game's color, with its caption beneath
 * naming the game and the move reaching the ply the cursor shows, the stored
 * game's board holding a line saying nothing matched in its own square where no
 * stored game shares a position. A `GameBoard` moves its pieces once it mounts,
 * which the Viewer reaches through `board`.
 */
export const GameFigure = defineComponent({
  name: 'ScotchGameFigure',

  props: {
    cursor : { required: true, type: Number },
    facing : { required: true, type: String as PropType<Facing> },
    loaded : { required: true, type: Object as PropType<Loaded> },
    party  : { required: true, type: String as PropType<Party> }
  },

  setup: (props, { expose }) => {
    const svg     = shallowRef<SVGSVGElement | null>(null)
    const board   = shallowRef<GameBoard>()
    const opening = openingOf(props.cursor, props.loaded, props.party)

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
      const move = side && ply ? games.numbered(side, ply - 1) : 'Start'
      return h('figure', { 'class': 'sc-viewer-figure', 'data-game': props.party }, [
        h('div', { class: 'sc-viewer-box' }, [
          drawing(props.facing, `The ${props.party} game at ply ${ply}`, opening, svg),
          props.party === 'stored'
            ? h('p', { class: 'sc-viewer-nothing' }, `${NOTHING}.`)
            : null
        ]),
        h('figcaption', { class: 'sc-viewer-caption' }, [
          h('span', { class: 'sc-viewer-caption-name' }, side ? games.nameOf(side) : 'Nothing matched'),
          h('span', { class: 'sc-viewer-caption-move' }, side ? move : '')
        ])
      ])
    }
  }
})
