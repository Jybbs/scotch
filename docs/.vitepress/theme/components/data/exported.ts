import { type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import * as exported from '../../../lib/data/exported.ts'
import { Tabs }      from './tabs.ts'

/**
 * Sets a type's text, each part the table writes between backticks in a chip.
 */
function typed(type: string): (VNode | string)[] {
  return type.split('`').flatMap<VNode | string>((text, at) => {
    if (!text) return []
    return at % 2 ? [h('code', { class: 'sc-exported-record' }, text)] : [text]
  })
}

/**
 * Draws one row of a field: its lines of the demo's file in one band beside
 * the type and the meaning of the field they write.
 */
function row({ lines, note }: exported.Row): VNode {
  return h('div', { class: 'sc-exported-row' }, [
    h('span', { class: 'sc-exported-code' }, lines.map(({ depth, dim, text }) => h('span', {
      'class'      : 'sc-exported-line',
      'data-depth' : depth,
      'data-dim'   : dim ? '' : undefined
    }, text))),
    h('span', { class: 'sc-exported-gloss' }, note
      ? [
          h('span', { class: 'sc-exported-type' }, typed(note.type)),
          h('span', { class: 'sc-exported-meaning' }, note.meaning)
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

    return (): VNode => h('div', { class: 'sc-data sc-data-exported sc-exported' }, [
      h('p', { class: 'sc-exported-note' }, [
        h('b', { class: 'sc-exported-key' }, 'submitted'), ' holds your game, and ',
        h('b', { class: 'sc-exported-key' }, 'stored'), ' the grandmaster game sharing its longest run.'
      ]),
      h(Tabs, {
        'controls'    : (field: string) => `${id}-panel-${field}`,
        'label'       : 'Fields',
        'names'       : exported.FIELDS,
        'on'          : on.value,
        'onUpdate:on' : (field: string) => { on.value = field as exported.Field },
        'tabOf'       : (field: string) => `${id}-tab-${field}`
      }),
      h('div', { class: 'sc-exported-panels' }, exported.FIELDS.map(field => h('div', {
        'aria-labelledby' : `${id}-tab-${field}`,
        'class'           : 'sc-exported-panel',
        'data-on'         : field === on.value ? '' : undefined,
        'id'              : `${id}-panel-${field}`,
        'inert'           : field !== on.value,
        'role'            : 'tabpanel'
      }, h('div', {
        'aria-label' : `The ${field} field of demo.json, line by line`,
        'class'      : 'sc-exported-rows',
        'role'       : 'group'
      }, exported.rowsOf(field).map(each => row(each))))))
    ])
  }
})
