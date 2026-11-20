import { clamp }                                      from '@vueuse/core'
import { type VNode, defineComponent, h, shallowRef } from 'vue'

import * as files   from '../../../lib/data/files.ts'
import * as numbers from '../../../lib/data/numbers.ts'
import { STORE }    from '../../../lib/data/store.ts'
import * as parts   from './parts.ts'
import { Plate }    from './plate.ts'

/**
 * A row of the table, its name, its bar, and its two counts on the columns the
 * table sets, the counts right-aligned.
 */
const ROW = 'col-span-full grid h-6 grid-cols-subgrid whitespace-nowrap [&>:nth-child(n+3)]:text-right'

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
      'class'          : [
        parts.CHART, 'grid '
                   + 'grid-cols-[calc(var(--sc-data-names)*1ch+1em)_minmax(0,1fr)_max-content_max-content]',
        'gap-x-3 font-code text-[0.65rem]/[24px] font-medium tracking-[0.06em] tabular-nums'
      ],
      'data-chart'     : '',
      'onPointerleave' : (event: PointerEvent) => { if (event.pointerType !== 'touch') picked.value = null },
      'style'          : { '--sc-data-names': widest }
    }, [
      h('div', {
        'aria-hidden' : 'true',
        'class'       : [ROW, 'border-b-[1.5px] border-b-(--sc-data-ink) text-(--sc-data-quiet) uppercase']
      }, [
        h('span', 'Archive'), h('span'), h('span', 'Games'), h('span', 'Held')
      ]),
      ...rows.map((row, index) => h('div', {
        'class'          : [
          ROW, '[border-bottom:var(--sc-data-hairline)] '
             + 'data-on:bg-[color-mix(in_oklab,var(--sc-data-link)_8%,transparent)]'
        ],
        'data-on'        : index === picked.value ? '' : undefined,
        'onPointerenter' : () => { picked.value = index }
      }, [
        h('span', row.name),
        h('span', { class: 'relative' }, h('i', {
          'class'       : [
            'absolute top-2 left-0 h-2 rounded-[1px]', row.others
              ? '[background:repeating-linear-gradient(90deg,var(--sc-data-fill)_0_3px,transparent_3px_5px)]'
              : 'bg-(--sc-data-fill)'
          ],
          'data-others' : row.others ? '' : undefined,
          'style'       : { width: `${(clamp(row.games / most, 0, 1) * 88).toFixed(2)}%` }
        })),
        h('span', numbers.counted(row.games)),
        h('span', numbers.percent(row.held, 1))
      ]))
    ]))
  }
})
