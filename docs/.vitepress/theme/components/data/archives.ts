import { clamp }                                      from '@vueuse/core'
import { type VNode, defineComponent, h, shallowRef } from 'vue'

import * as files   from '../../../lib/data/files.ts'
import * as numbers from '../../../lib/data/numbers.ts'
import { STORE }    from '../../../lib/data/store.ts'
import { Plate }    from './plate.ts'

/**
 * The archives the store keeps the most games from and every other archive
 * together, each beside a bar of its games against the first's, its games, and
 * the share of the store held down to it, with a reading of the row a pointer
 * rests on.
 */
export const Archives = defineComponent({
  name  : 'ScotchArchives',
  setup : () => {
    const archives = STORE.files.length
    const rows     = STORE.largest
    const most     = Math.max(...rows.filter(row => !row.others).map(row => row.games))
    const widest   = Math.max(...rows.map(row => row.name.length))
    const picked   = shallowRef<number | null>(null)

    return (): VNode => h(Plate, {
      big  : numbers.counted(STORE.games),
      line : files.largestReading(archives, picked.value, rows),
      say  : files.largestSummary(archives, rows)
    }, () => h('div', {
      class          : 'sc-data-chart sc-data-archives',
      onPointerleave : (event: PointerEvent) => { if (event.pointerType !== 'touch') picked.value = null },
      style          : { '--sc-data-names': widest }
    }, [
      h('div', { 'aria-hidden': 'true', class: 'sc-data-archive sc-data-archive-head' }, [
        h('span', 'Archive'), h('span'), h('span', 'Games'), h('span', 'Held')
      ]),
      ...rows.map((row, index) => h('div', {
        class          : ['sc-data-archive', { 'sc-data-on': index === picked.value }],
        onPointerenter : () => { picked.value = index }
      }, [
        h('span', row.name),
        h('span', { class: 'sc-data-bar' }, h('i', {
          class : { 'sc-data-bar-others': row.others },
          style : { width: `${(clamp(row.games / most, 0, 1) * 88).toFixed(2)}%` }
        })),
        h('span', numbers.counted(row.games)),
        h('span', numbers.percent(row.held, 1))
      ]))
    ]))
  }
})
