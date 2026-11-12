import { type ShallowRef, type VNode, defineComponent, h, nextTick, shallowRef } from 'vue'

import { dimmed }   from '../../../lib/data/corner.ts'
import * as numbers from '../../../lib/data/numbers.ts'
import * as omitted from '../../../lib/data/omitted.ts'
import { Corner }   from './corner.ts'
import { Plate }    from './plate.ts'

/**
 * Draws one section's bar of the games its files hold, a segment per kind as
 * wide as its count, against the section reading the most games.
 */
function bar(
  ledger : omitted.Tally,
  lit    : string | null,
  most   : number,
  picked : omitted.Segment,
  press  : (cell: omitted.Segment, step: number) => void
): VNode {
  const read  = omitted.readOf(ledger)
  const width = `${Math.max(9, read / most * 100).toFixed(2)}%`
  return h('div', { class: 'sc-data-ledger-section' }, [
    h('header', [
      h('span', ledger.name),
      h('small', `${numbers.counted(read)} read · ${numbers.counted(ledger.files)} files`)
    ]),
    h('div', { class: 'sc-data-ledger-bar', style: { width } }, omitted.segments
      .filter(({ section }) => section === ledger.section)
      .map(cell => segment(cell, ledger, lit, picked, press)))
  ])
}

/**
 * Draws the drawer beneath the bars, closed at first, holding the files behind
 * the pressed count, the most first.
 */
function drawer({ kind, section }: omitted.Segment): VNode {
  const files = omitted.holding(kind, section)
  return h('details', { class: 'sc-data-drawer' }, [
    h('summary', `Show the ${numbers.counted(files.length)} files behind this count`),
    h('ol', { class: 'sc-data-drawer-files' }, files.map(([name, count]) => h('li', [
      h('span', name),
      h('b', numbers.counted(count))
    ])))
  ])
}

/**
 * Builds the call pressing a segment, or the one `step` segments past it, and
 * focusing it where a key moved there.
 */
function pressing(
  chart  : ShallowRef<HTMLElement | null>,
  picked : ShallowRef<omitted.Segment>
): (cell: omitted.Segment, step: number) => void {
  return (cell, step) => {
    const next = omitted.segmentPast(cell, step)
    picked.value = omitted.segments[next]!
    if (!step) return
    void nextTick(() => {
      chart.value?.querySelectorAll<HTMLElement>('.sc-data-ledger-segment')[next]?.focus()
    })
  }
}

/**
 * Draws one segment of a section's bar, a press naming its count in the
 * sentence above and an arrow key pressing the segment beside it.
 */
function segment(
  cell   : omitted.Segment,
  ledger : omitted.Tally,
  lit    : string | null,
  picked : omitted.Segment,
  press  : (cell: omitted.Segment, step: number) => void
): VNode {
  const { label, word } = omitted.KINDS.find(({ key }) => key === cell.kind)!
  const count           = ledger[cell.kind]
  return h('button', {
    'aria-label'   : `${ledger.section}, ${label}, ${numbers.counted(count)} games`,
    'aria-pressed' : String(cell.kind === picked.kind && cell.section === picked.section),
    'class'        : ['sc-data-ledger-segment', dimmed(cell.kind, lit)],
    'data-k'       : cell.kind,
    'onClick'      : () => { press(cell, 0) },
    'style'        : { flexGrow: count },
    'type'         : 'button',

    onKeydown: (event: KeyboardEvent) => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
      if (step === undefined) return
      event.preventDefault()
      press(cell, step)
    }
  }, h('span', `${word} ${numbers.counted(count)}`))
}

/**
 * The games each section's files hold as one bar a section, a segment for the
 * games the index keeps and one for each reason it leaves games out, the marks
 * in the corner naming each color and the files behind the pressed count in a
 * drawer beneath.
 */
export const GameLedger = defineComponent({
  name  : 'ScotchGameLedger',
  setup : () => {
    const chart  = shallowRef<HTMLElement | null>(null)
    const lit    = shallowRef<string | null>(null)
    const picked = shallowRef<omitted.Segment>({ kind: 'below', section: 'Openings' })
    const most   = Math.max(...omitted.OMISSIONS.sections.map(omitted.readOf))
    const press  = pressing(chart, picked)

    return (): VNode => {
      const ledger = omitted.OMISSIONS.sections.find(({ section }) => section === picked.value.section)!
      return h(Plate, {
        big  : numbers.counted(ledger[picked.value.kind]),
        line : `${omitted.KINDS.find(({ key }) => key === picked.value.kind)!.label} · ${ledger.name}`,
        say  : omitted.ledgerSentence(picked.value.kind, ledger)
      }, () => [
        h('div', { class: 'sc-data-chart sc-data-ledger', ref: chart }, [
          h(Corner, {
            'items'        : omitted.ledgerMarks,
            'lit'          : lit.value,
            'onUpdate:lit' : (key: string | null) => { lit.value = key }
          }),
          ...omitted.OMISSIONS.sections.map(section => bar(section, lit.value, most, picked.value, press))
        ]),
        drawer(picked.value)
      ])
    }
  }
})
