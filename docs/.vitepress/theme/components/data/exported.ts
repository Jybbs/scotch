import { type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import * as exported from '../../../lib/data/exported.ts'
import * as parts    from './parts.ts'
import { Tabs }      from './tabs.ts'

/**
 * A field's name in the sentence over the tabs, in the code face.
 */
const KEY = 'font-code text-[0.875em] font-semibold'

/**
 * Sets a type's text, each part the table writes between backticks in a chip.
 */
function typed(type: string): (VNode | string)[] {
  return type.split('`').flatMap<VNode | string>((text, at) => {
    if (!text) return []
    return at % 2
      ? [h('code', { class: 'rounded-sm! bg-page! px-1.5! py-0.5! text-[0.75rem]/[16px]! whitespace-nowrap' },
          text)]
      : [text]
  })
}

/**
 * Draws one row of a field: its lines of the demo's file in one band beside
 * the type and the meaning of the field they write.
 */
function row({ lines, note }: exported.Row): VNode {
  return h('div', {
    class: 'col-span-full grid grid-cols-subgrid '
         + '[&:hover>*]:[background-image:linear-gradient(var(--sc-exported-join),var(--sc-exported-join))]'
  }, [
    h('span', {
      class: [
        'min-w-0 bg-side px-(--sc-exported-pad) pt-3 font-code text-[0.875rem]/[24px] font-normal',
        '@min-[36rem]:pb-3', note ? 'pb-1' : 'pb-3'
      ]
    }, lines.map(({ depth, dim, text }) => h('span', {
      'class'      : 'block pl-[calc(var(--sc-exported-depth,0)*2ch)] wrap-anywhere whitespace-pre-wrap '
                   + 'data-dim:text-quiet data-[depth=1]:[--sc-exported-depth:1] '
                   + 'data-[depth=2]:[--sc-exported-depth:2]',
      'data-depth' : depth,
      'data-dim'   : dim ? '' : undefined
    }, text))),
    h('span', {
      class: [
        'min-w-0 bg-side pt-0 pr-(--sc-exported-pad) pb-3.5 pl-[calc(var(--sc-exported-pad)+2ch)] font-body',
        'text-[0.8125rem]/[20px] font-normal @min-[36rem]:bg-(--sc-exported-wash) @min-[36rem]:pt-3.5',
        '@min-[36rem]:pl-(--sc-exported-pad)',
        note ? 'grid content-start gap-0.5' : 'hidden @min-[36rem]:block'
      ]
    }, note
      ? [
          h('span', { class: 'text-quiet' }, typed(note.type)),
          h('span', { class: 'font-body text-[1rem]/[28px] font-normal' }, note.meaning)
        ]
      : [])
  ])
}

/**
 * The match file annotated: a tab for each field over the field's part of the
 * demo's file, each line on the band of what it means, every field's panel
 * drawn in one cell and the hidden ones kept out of sight and out of reach, so
 * the tallest sets the height and a pick moves nothing below. The arrow keys,
 * Home, and End move between the tabs.
 */
export const Exported = defineComponent({
  name: 'ScotchDataExported',

  setup: () => {
    const id = useId()
    const on = shallowRef<exported.Field>('span')

    return (): VNode => h('div', {
      class: [
        parts.DATA, '@container m-0 grid gap-4 text-ink [--sc-exported-pad:24px]',
        '[--sc-exported-join:color-mix(in_oklab,var(--sc-run)_9%,transparent)]',
        '[--sc-exported-wash:color-mix(in_oklab,var(--sc-side)_50%,transparent)]'
      ]
    }, [
      h('p', { class: 'm-0! font-body text-[0.8125rem]/[20px]! font-normal' }, [
        h('b', { class: KEY }, 'submitted'), ' holds your game, and ',
        h('b', { class: KEY }, 'stored'), ' the grandmaster game sharing its longest run.'
      ]),
      h(Tabs, {
        'controls'    : (field: string) => `${id}-panel-${field}`,
        'label'       : 'Fields',
        'look'        : 'wide',
        'names'       : exported.FIELDS,
        'on'          : on.value,
        'onUpdate:on' : (field: string) => { on.value = field as exported.Field },
        'tabOf'       : (field: string) => `${id}-tab-${field}`
      }),
      h('div', { class: 'grid' }, exported.FIELDS.map(field => h('div', {
        'aria-labelledby' : `${id}-tab-${field}`,
        'class'           : 'min-w-0 [grid-area:1/1] not-data-on:invisible',
        'data-on'         : field === on.value ? '' : undefined,
        'id'              : `${id}-panel-${field}`,
        'inert'           : field !== on.value,
        'role'            : 'tabpanel'
      }, h('div', {
        'aria-label' : `The ${field} field of demo.json, line by line`,
        'class'      : 'grid grid-cols-[minmax(0,1fr)] gap-y-[3px] overflow-hidden rounded-lg '
                     + '@min-[36rem]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]',
        'role'       : 'group'
      }, exported.rowsOf(field).map(each => row(each))))))
    ])
  }
})
