import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { dimmed }   from '../../../lib/data/corner.ts'
import * as numbers from '../../../lib/data/numbers.ts'
import * as tags    from '../../../lib/data/tags.ts'
import { Corner }   from './corner.ts'
import * as parts   from './parts.ts'
import { Plate }    from './plate.ts'

/**
 * A label of the grid, a tag's name or a decade's, in the quiet code face.
 */
const LABEL = 'font-code text-[0.56rem]/none font-medium whitespace-nowrap text-(--sc-data-quiet)'

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
    'class'          : [
      'grid h-[22px] cursor-pointer place-items-center rounded-xs bg-(--sc-data-held) font-code',
      'text-[0.54rem]/none font-semibold text-(--sc-data-page)', parts.DIM,
      'data-on:[box-shadow:0_0_0_2px_var(--sc-data-page),0_0_0_3.5px_var(--sc-data-ink)]',
      'data-[k=gap]:bg-[color-mix(in_oklab,var(--sc-data-link)_calc(var(--sc-data-level)*75%+25%),var(--sc-data-page))]',
      { 'ml-1.5': at.column === tags.COLUMNS.length - 1 }
    ],
    'data-k'         : kind,
    'data-off'       : dimmed(kind, lit),
    'data-on'        : at.column === picked.column && at.tag === picked.tag ? '' : undefined,
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
  return h('ol', { class: parts.FILES }, rows)
}

/**
 * Draws the grid, a row per tag and a column per decade beside every stored
 * game's, the tags named down the left and every other decade along the foot.
 */
function grid(lit: string | null, picked: tags.Carried, pick: (to: tags.Carried) => void): VNode[] {
  return [
    ...tags.TAGS.names.flatMap((name, tag) => [
      h('span', {
        'class'   : [LABEL, 'self-center pr-1.5 text-right data-on:font-bold data-on:text-(--sc-data-ink)'],
        'data-on' : tag === picked.tag ? '' : undefined
      }, name),
      ...tags.COLUMNS.map((_, column) => cell({ column, tag }, lit, picked, pick))
    ]),
    h('span'),
    ...tags.COLUMNS.map((column, at) => h('span', {
      class: [LABEL, 'pt-1.5 text-center', { 'ml-1.5': at === tags.COLUMNS.length - 1 }]
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
      }, () => h('div', {
        class: 'grid gap-2.5 '
             + '[--sc-data-held:color-mix(in_oklab,var(--sc-data-quiet)_10%,var(--sc-data-page))]'
      }, [
        h(Corner, {
          'items'        : tags.CARRIED_MARKS,
          'lit'          : lit.value,
          'onUpdate:lit' : (key: string | null) => { lit.value = key }
        }),
        h('div', {
          'aria-label' : 'The share of each decade’s games leaving each tag without a value',
          'class'      : 'grid grid-cols-[4.6rem_repeat(var(--sc-data-columns),minmax(0,1fr))] items-stretch '
                       + 'gap-0.5 outline-offset-4',
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
