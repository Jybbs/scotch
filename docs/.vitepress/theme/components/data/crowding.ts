import { type VNode, computed, defineComponent, h, shallowRef } from 'vue'

import { pointerAt, useChart } from '../../../lib/data/chart.ts'
import { dimmed }              from '../../../lib/data/corner.ts'
import * as crowding           from '../../../lib/data/crowding.ts'
import * as numbers            from '../../../lib/data/numbers.ts'
import { Corner }              from './corner.ts'
import { Plate }               from './plate.ts'
import { positionBoard }       from './position.ts'

/**
 * Draws one block of the tree, shaded deeper the more stored games play its
 * line and named where its name fits, the blocks of the line picked and of the
 * moves before it lit.
 */
function block(
  each   : crowding.Block,
  layout : crowding.CrowdingLayout,
  lit    : string | null,
  path   : ReadonlySet<crowding.Block>,
  picked : crowding.Block
): VNode {
  const name  = crowding.blockName(each)
  const width = Math.max(0.6, each.share * layout.width - 1)
  const y     = each.depth * layout.row
  return h('g', {
    'class'   : ['sc-data-crowding-block', dimmed(path.has(each) ? 'path' : 'rest', lit)],
    'data-k'  : path.has(each) ? 'path' : undefined,
    'data-on' : each === picked ? 'picked' : path.has(each) ? 'path' : undefined,
    'style'   : { '--sc-data-level': Math.min(1, each.share * 3).toFixed(3) }
  }, [
    h('rect', {
      height : layout.row - 2,
      rx     : 2,
      width  : numbers.tenth(width),
      x      : numbers.tenth(each.start * layout.width),
      y      : y
    }),
    width > name.length * 6.4 + 6
      ? h('text', { x: numbers.tenth(each.start * layout.width + 5), y: y + layout.row / 2 + 3 }, name)
      : null
  ])
}

/**
 * Reads the blocks of a block's line and of each move before it, the start
 * among them.
 */
function pathOf(blocks: readonly crowding.Block[], picked: crowding.Block): Set<crowding.Block> {
  const sans = picked.line.sans
  return new Set(blocks.filter(each => each.line.sans.every((san, at) => sans[at] === san)))
}

/**
 * Draws the tree as one slider the pointer and the arrow keys move across,
 * every block off the line picked dimmed while its corner mark is lit.
 */
function tree(
  calls  : Record<string, unknown>,
  blocks : readonly crowding.Block[],
  layout : crowding.CrowdingLayout,
  lit    : string | null,
  picked : crowding.Block
): VNode {
  const path = pathOf(blocks, picked)
  return h('svg', {
    'aria-label'     : 'The opening lines the stored games play, a row per ply and each block as wide as '
                     + 'the games playing its line',
    'aria-valuemax'  : blocks.length - 1,
    'aria-valuemin'  : 0,
    'aria-valuenow'  : blocks.indexOf(picked),
    'aria-valuetext' : crowding.crowdingSentence(picked),
    'class'          : 'sc-data-svg',
    'height'         : layout.height,
    'role'           : 'slider',
    'tabindex'       : 0,
    'viewBox'        : `0 0 ${layout.width} ${layout.height}`,
    'width'          : layout.width,
    ...calls
  }, blocks.map(each => block(each, layout, lit, path, picked)))
}

/**
 * The opening lines the most stored games play as a tree of blocks, a row per
 * ply with the start on top and each block as wide as the games playing its
 * line, the block a reader points at or steps to with the arrow keys showing
 * its position on a board beside its line and its counts.
 */
export const CrowdedLines = defineComponent({
  name  : 'ScotchCrowdedLines',
  setup : () => {
    const key = shallowRef('e4 c5')
    const lit = shallowRef<string | null>(null)

    const { chart, layout, sized, style } = useChart(crowding.crowdingLayout)

    const blocks = computed(() => crowding.blocksOf(layout.value.rows))
    const picked = computed(() => blocks.value.find(each => each.line.sans.join(' ') === key.value)
      ?? blocks.value[0]!)

    const pick = (to: crowding.Block | undefined): void => {
      if (to) key.value = to.line.sans.join(' ')
    }
    const calls = {
      onKeydown: (event: KeyboardEvent) => {
        const to = crowding.blockStepped(picked.value, blocks.value, event.key)
        if (to === undefined) return
        event.preventDefault()
        pick(to)
      },
      onPointermove: (event: PointerEvent) => {
        const { x, y } = pointerAt(event)
        pick(crowding.blockAt(blocks.value, layout.value, x, y))
      }
    }

    return (): VNode => h(Plate, {
      big      : numbers.counted(picked.value.line.games),
      readings : [
        ['Line', picked.value.depth ? crowding.lineOf(picked.value.line.sans) : 'No move played'],
        ['Share of the store', numbers.percent(picked.value.share, 1)],
        ['Reach its position', numbers.counted(picked.value.line.reach)]
      ],
      say: crowding.crowdingSentence(picked.value)
    }, () => h('div', { class: 'sc-data-crowding' }, [
      h(Corner, {
        'items'        : crowding.CROWDING_MARKS,
        'lit'          : lit.value,
        'onUpdate:lit' : (to: string | null) => { lit.value = to }
      }),
      h('div', { class: 'sc-data-chart', ref: chart, style: style.value }, sized.value
        ? [tree(calls, blocks.value, layout.value, lit.value, picked.value)]
        : []),
      sized.value
        ? positionBoard(picked.value.line.placement, crowding.positionOf(picked.value), layout.value.board)
        : null
    ]))
  }
})
