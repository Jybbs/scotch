import { type VNode, h } from 'vue'

import { GAME_MARKS } from '../../../lib/viewer/loaded.ts'
import { Corner }     from '../data/corner.ts'

/**
 * Draws the Viewer's legend in the corner over its track, naming the submitted
 * game and the stored game each beside the color its board, its sheet, and its
 * moves take.
 */
export function gameLegend(): VNode {
  return h('div', { class: 'sc-data sc-viewer-legend' }, h(Corner, { items: GAME_MARKS }))
}
