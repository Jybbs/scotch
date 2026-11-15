import { type VNode, defineComponent, h } from 'vue'

import * as handoff      from '../../../lib/data/handoff.ts'
import { SHADE, hexOf }  from '../../../lib/front/example.ts'

/**
 * Splits a path at each slash so it wraps there and nowhere else.
 */
function path(text: string): (VNode | string)[] {
  return text.split('/').flatMap((part, at) => at ? [h('wbr'), `/${part}`] : [part])
}

/**
 * Draws one position key as a fingerprint of its 16 hex digits, one shade per
 * digit, as the front page draws a game's keys, or an empty frame where the
 * position is not one the submitted game shares.
 */
function print(key: string | undefined): VNode {
  const digits = key ? [...hexOf(key)] : []
  return h('span', { 'class': 'sc-handoff-print', 'data-lit': key ? '' : undefined }, digits.map(digit =>
    h('i', { style: { opacity: String(SHADE.least + Number.parseInt(digit, 16) * SHADE.step) } })))
}

/**
 * Draws what a stop holds of the demo's stored game.
 */
function drawn(shown: handoff.Drawn): VNode {
  switch (shown.kind) {
    case 'path':
      return h('span', { class: 'sc-handoff-figure' }, path(shown.text))
    case 'prints':
      return h('div', {
        'aria-label' : `${shown.count} keys, the first ${shown.keys.length} shared`,
        'class'      : 'sc-handoff-prints',
        'role'       : 'img'
      }, Array.from({ length: shown.count }, (_, at) => print(shown.keys[at])))
    case 'report':
      return h('pre', { class: 'sc-handoff-report' }, shown.lines.join('\n'))
    case 'row':
      return h('dl', { class: 'sc-handoff-row' },
        shown.rows.flatMap(([term, value]) => [h('dt', term), h('dd', value)]))
  }
}

/**
 * Draws one stop: the verb and the name of what it is, the drawing of the
 * stored game in it, and the line saying what that is.
 */
function stop({ drawn: shown, line, name, verb }: handoff.Stop): VNode {
  return h('li', { 'class': 'sc-handoff-stop', 'data-verb': verb }, [
    h('span', { class: 'sc-handoff-name' }, [
      h('span', { class: 'sc-handoff-verb' }, handoff.VERBS[verb]),
      h('span', path(name))
    ]),
    drawn(shown),
    h('span', { class: 'sc-handoff-line' }, line)
  ])
}

/**
 * The store's flow on the Guide's store page: each command numbered beside
 * what it writes or prints of the demo match's stored game, and between two
 * steps a line saying what the later one reads of the earlier one's files.
 */
export const Handoff = defineComponent({
  name: 'ScotchDataHandoff',

  setup: () => (): VNode => h('div', { class: 'sc-data-handoff sc-handoff-box' }, h('ol', {
    'aria-label' : 'From the fetched files to a match',
    'class'      : 'sc-handoff'
  }, handoff.legs.map(({ command, does, handed, stops }, at) => h('li', {
    class : 'sc-handoff-leg',
    style : { '--sc-handoff-stops': stops.length }
  }, [
    handed
      ? h('p', { class: 'sc-handoff-handed' }, [h('span', { 'aria-hidden': 'true' }, '↓'), handed])
      : null,
    h('ol', { class: 'sc-handoff-stops' }, stops.map(each => stop(each))),
    h('p', { class: 'sc-handoff-command' }, [
      h('span', { class: 'sc-handoff-step' }, [
        h('b', String(at + 1)), `Step ${at + 1} of ${handoff.legs.length}`
      ]),
      h('code', command),
      h('span', { class: 'sc-handoff-does' }, does)
    ])
  ]))))
})
