import { type ShallowRef, type VNode, defineComponent, h, nextTick, shallowRef } from 'vue'

import { dimmed }   from '../../../lib/data/corner.ts'
import * as numbers from '../../../lib/data/numbers.ts'
import * as omitted from '../../../lib/data/omitted.ts'
import { Corner }   from './corner.ts'
import * as parts   from './parts.ts'
import { Plate }    from './plate.ts'

/**
 * The chart of bars, holding the color each kind of segment takes, the games
 * left out as variants hatched over their tone.
 */
const LEDGER = [
  parts.CHART, 'grid gap-3.5 [--sc-data-kept:var(--sc-data-link)]',
  '[--sc-data-below:color-mix(in_oklab,var(--sc-data-ink)_60%,var(--sc-data-page))]',
  '[--sc-data-repeat:color-mix(in_oklab,var(--sc-data-ink)_26%,var(--sc-data-page))]',
  '[--sc-data-unread:color-mix(in_oklab,var(--sc-data-ink)_78%,var(--sc-data-page))]',
  '[--sc-data-hatch:repeating-linear-gradient(-45deg,var(--sc-data-ink)_0_1.5px,transparent_1.5px_5px)]',
  '[--sc-data-variant:var(--sc-data-hatch)_color-mix(in_oklab,var(--sc-data-ink)_62%,var(--sc-data-page))]'
]
/**
 * A segment of a section's bar in its kind's color, the repeats' count set in
 * the ink, ringed while pressed and faded while a mark of the corner names
 * another kind.
 */
const SEGMENT = [
  '@container min-w-[3px] cursor-pointer rounded-xs border-0 p-0',
  '[background:var(--sc-data-mark,var(--sc-data-fill))]',
  'font-code text-[0.6rem]/[26px] font-medium tracking-[0.06em] text-(--sc-data-page) uppercase',
  'transition-[opacity,flex-grow] duration-settle ease-glide data-off:opacity-22',
  'aria-pressed:[box-shadow:0_0_0_2px_var(--sc-data-page),0_0_0_3.5px_var(--sc-data-ink)]',
  'focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-(--sc-data-link) data-[k=below]:[--sc-data-mark:var(--sc-data-below)]',
  'data-[k=kept]:[--sc-data-mark:var(--sc-data-kept)] data-[k=repeat]:[--sc-data-mark:var(--sc-data-repeat)]',
  'data-[k=repeat]:text-(--sc-data-ink) data-[k=unread]:[--sc-data-mark:var(--sc-data-unread)]',
  'data-[k=variant]:[--sc-data-mark:var(--sc-data-variant)]'
]
/**
 * The count a segment names, set in the ink on a chip of the repeats' tone over
 * the hatch of the variants. A segment hides its count while narrower than the
 * widest label and chip the ledger draws, each glyph taking 0.66em and each
 * label its padding, with that width rounded up to a tenth of an em.
 */
const SPAN = 'block overflow-hidden whitespace-nowrap @max-[13.6em]:invisible'

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
  return h('div', [
    h('header', {
      class: 'mb-1 flex justify-between gap-3 font-code text-[0.65rem]/[16px] font-medium tracking-[0.08em] '
           + 'uppercase'
    }, [
      h('span', ledger.name),
      h('small', { class: 'text-[0.6rem] text-(--sc-data-quiet) tabular-nums' },
        `${numbers.counted(read)} read · ${numbers.counted(ledger.files)} files`)
    ]),
    h('div', {
      class : 'flex h-[26px] gap-0.5 transition-[width] duration-settle ease-glide',
      style : { width }
    }, omitted.segments
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
  return h('details', { class: 'group/drawer' }, [
    h('summary', {
      class: 'cursor-pointer font-body text-[0.78rem]/[24px] font-semibold text-(--sc-data-link) '
           + 'group-open/drawer:mb-1.5!'
    }, `Show the ${numbers.counted(files.length)} files behind this count`),
    h('ol', { class: parts.FILES }, files.map(([name, count]) => h('li', [
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
      chart.value?.querySelectorAll<HTMLElement>('button[data-k]')[next]?.focus()
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
    'class'        : SEGMENT,
    'data-k'       : cell.kind,
    'data-off'     : dimmed(cell.kind, lit),
    'onClick'      : () => { press(cell, 0) },
    'style'        : { flexGrow: count },
    'type'         : 'button',

    onKeydown: (event: KeyboardEvent) => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
      if (step === undefined) return
      event.preventDefault()
      press(cell, step)
    }
  }, h('span', {
    class: [
      SPAN, cell.kind === 'variant'
        ? 'mx-auto my-[5px] w-fit rounded-xs bg-(--sc-data-repeat) px-[6px] leading-[16px] '
        + 'text-(--sc-data-ink)'
        : 'px-2'
    ]
  }, `${word} ${numbers.counted(count)}`))
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
        h('div', { 'class': LEDGER, 'data-chart': '', 'ref': chart }, [
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
