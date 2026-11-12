import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { dimmed }   from '../../../lib/data/corner.ts'
import * as numbers from '../../../lib/data/numbers.ts'
import * as tags    from '../../../lib/data/tags.ts'
import { Corner }   from './corner.ts'
import { Plate }    from './plate.ts'

/**
 * Draws one cell of the grid, shaded by the share of its column missing its
 * tag where that share makes it a gap, the share written in it once it
 * reaches a tenth.
 */
function cell(
  at     : tags.Carried,
  lit    : string | null,
  picked : tags.Carried,
  pick   : (to: tags.Carried) => void
): VNode {
  const share = tags.missingShare(at)
  const kind  = tags.isGap(at) ? 'gap' : 'carried'
  return h('div', {
    'class'          : ['sc-data-carried-cell', dimmed(kind, lit), {
      'sc-data-all' : at.column === tags.COLUMNS.length - 1,
      'sc-data-on'  : at.column === picked.column && at.tag === picked.tag
    }],
    'data-k'         : kind,
    'onClick'        : () => { pick(at) },
    'onPointerenter' : () => { pick(at) },
    'role'           : 'gridcell',
    'style'          : { '--sc-data-level': share.toFixed(3) }
  }, kind === 'gap' && share >= 0.1 ? String(Math.round(share * 100)) : '')
}

/**
 * Draws the files holding the most of the picked gap's games, or nothing for a
 * cell whose games the index counts no files for.
 */
function files(picked: tags.Carried): VNode | null {
  const held = tags.gapOf(picked).files
  if (held.length === 0) return null
  const rows = held.map(file => h('li', [h('span', file.path), h('b', numbers.counted(file.count))]))
  return h('ol', { class: 'sc-data-drawer-files' }, rows)
}

/**
 * Draws the grid, a row per tag and a column per decade beside every stored
 * game's, the tags named down the left and every other decade along the foot.
 */
function grid(lit: string | null, picked: tags.Carried, pick: (to: tags.Carried) => void): VNode[] {
  return [
    ...tags.TAGS.names.flatMap((name, tag) => [
      h('span', { class: ['sc-data-carried-tag', { 'sc-data-on': tag === picked.tag }] }, name),
      ...tags.COLUMNS.map((_, column) => cell({ column, tag }, lit, picked, pick))
    ]),
    h('span'),
    ...tags.COLUMNS.map((column, at) => h('span', {
      class: ['sc-data-carried-decade', { 'sc-data-all': at === tags.COLUMNS.length - 1 }]
    }, at === tags.COLUMNS.length - 1 ? 'All' : at % 2 ? column.name.slice(0, 4) : ''))
  ]
}

/**
 * Each decade's share of its games missing each tag as a grid, only the gaps
 * shaded, the cell a reader points at, presses, or steps to with the arrow
 * keys naming its share and listing the files holding the most of its games.
 */
export const TagGaps = defineComponent({
  name  : 'ScotchTagGaps',
  setup : () => {
    const lit    = shallowRef<string | null>(null)
    const picked = shallowRef<tags.Carried>({
      column : tags.COLUMNS.findIndex(column => column.name === '1980s'),
      tag    : tags.TAGS.names.indexOf('Round')
    })

    const pick  = (to: tags.Carried): void => { picked.value = to }
    const keyed = (event: KeyboardEvent): void => {
      const to = tags.carriedStepped(picked.value, event.key)
      if (to === undefined) return
      event.preventDefault()
      pick(to)
    }

    return (): VNode => {
      const gap    = tags.gapOf(picked.value)
      const column = tags.COLUMNS[picked.value.column]!
      return h(Plate, {
        big      : numbers.percent(tags.missingShare(picked.value), 1),
        readings : [
          ['Tag', gap.tag],
          ['Decade', column === tags.TAGS.every ? 'Every decade' : column.name],
          ['Missing', numbers.counted(gap.missing)]
        ],
        say: tags.carriedSentence(picked.value)
      }, () => h('div', { class: 'sc-data-carried' }, [
        h(Corner, {
          'items'        : tags.CARRIED_MARKS,
          'lit'          : lit.value,
          'onUpdate:lit' : (key: string | null) => { lit.value = key }
        }),
        h('div', {
          'aria-label' : 'The share of each decade’s games leaving each tag without a value',
          'class'      : 'sc-data-carried-grid',
          'onKeydown'  : keyed,
          'role'       : 'grid',
          'style'      : { '--sc-data-columns': String(tags.COLUMNS.length) },
          'tabindex'   : 0
        }, grid(lit.value, picked.value, pick)),
        files(picked.value)
      ]))
    }
  }
})
