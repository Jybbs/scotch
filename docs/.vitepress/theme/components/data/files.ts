import { type ShallowRef, type VNode, computed, defineComponent, h, shallowRef, useId } from 'vue'

import * as axes     from '../../../lib/data/axes.ts'
import { useChart }  from '../../../lib/data/chart.ts'
import * as files    from '../../../lib/data/files.ts'
import * as list     from '../../../lib/data/list.ts'
import * as timeline from '../../../lib/reference/timeline.ts'
import * as drawings from './drawings.ts'
import { Rail }      from './rail.ts'

/**
 * How long a drawing's marks take to finish unfolding, the last one's delay
 * included, in milliseconds.
 */
const UNFOLD = 1800

/**
 * Draws the field that finds a file by its file name or its name beside its
 * tally.
 */
function findField(state: list.List, marks: readonly files.Entry[]): VNode {
  return h('label', { class: 'sc-data-files-find' }, [
    h('input', {
      'aria-label' : 'Find a file',
      onInput      : (event: Event) => {
        state.query.value = (event.target as HTMLInputElement).value.trim().toLowerCase()
      },
      placeholder  : 'Find a file, such as Najdorf',
      type         : 'search'
    }),
    h('span', list.tallyOf(state, marks))
  ])
}

/**
 * Draws a tab for each section beside the count of its files, the arrow keys,
 * Home, and End moving between them.
 */
function sectionTabs(id: string, state: list.List, tabs: Map<files.Section, HTMLElement>): VNode {
  const pick = (section: files.Section, focus = false): void => {
    list.showSection(state, section)
    if (focus) tabs.get(section)?.focus()
  }
  const keyed = (event: KeyboardEvent): void => {
    const { length } = files.SECTIONS
    const place      = files.SECTIONS.indexOf(state.section.value)
    const to         = { ArrowLeft: place - 1, ArrowRight: place + 1, End: length - 1, Home: 0 }[event.key]
    if (to === undefined) return
    event.preventDefault()
    pick(files.SECTIONS.at(to % length)!, true)
  }
  const bar = { 'aria-label': 'Sections', class: 'sc-data-tabs', onKeydown: keyed, role: 'tablist' }

  return h('div', bar, files.SECTIONS.map(section => h('button', {
    'aria-controls' : `${id}-drawing`,
    'aria-selected' : section === state.section.value,
    class           : 'sc-data-tab',
    onClick         : () => pick(section),
    ref             : (node: unknown) => { if (node instanceof HTMLElement) tabs.set(section, node) },
    role            : 'tab',
    tabindex        : section === state.section.value ? 0 : -1,
    type            : 'button'
  }, [section, h('small', list.countOf(state, section))])))
}

/**
 * Holds whether a drawing's marks are unfolding, which they do once, the first
 * time the drawing comes into view, unless the site's drawings hold still.
 */
function useRise(chart: timeline.NodeRef): ShallowRef<boolean> {
  const unfolding = shallowRef(false)
  const still     = (): void => { unfolding.value = false }

  timeline.useUnfold(chart, timeline.useBeats(), {
    length : UNFOLD,
    play   : (beats, done) => {
      unfolding.value = true
      beats.at(UNFOLD, done)
    },
    prime  : still,
    settle : still
  })

  return unfolding
}

/**
 * The file list: a tab for each of PGN Mentor's sections, a field finding a
 * file by its file name or its name, each section drawn on the axis it reads
 * best by, and beneath the drawing the card for the file a pointer or the
 * arrow keys rest on. The Players are discs at the mean year of each archive's
 * games, the Events bricks stacked in the year each was played, and the
 * Openings bands by first move and reply that open on a press.
 */
export const Files = defineComponent({
  name  : 'ScotchFiles',
  setup : () => {
    const state = list.useList()
    const id    = useId()
    const tabs  = new Map<files.Section, HTMLElement>()

    const { chart, layout, sized, style } = useChart(width => ({ height: width < 520 ? 200 : 184, width }))

    const unfolding = useRise(chart)
    const drawn     = computed(() => {
      const drawing: drawings.Drawing = {
        at      : state.at.value,
        entries : state.entries,
        focus   : entry => { state.at.value = entry },
        height  : layout.value.height,
        query   : state.query.value,
        width   : layout.value.width
      }
      if (state.section.value === 'Players') return drawings.playersDrawing(drawing, state.years)
      if (state.section.value === 'Events') return drawings.eventsDrawing(drawing, state.years)
      const [low = 0, high = 0] = state.domain.value
      return drawings.openingsDrawing(state.bands, [low, high], drawing, band => {
        state.target.value = axes.zoomed(state.bands, band, state.target.value)
      })
    })
    const stepped   = (event: KeyboardEvent): void => {
      if (list.stepAlong(event.key, state, drawn.value.marks)) event.preventDefault()
    }

    return (): VNode => h('div', { class: 'sc-data sc-data-files' }, [
      sectionTabs(id, state, tabs),
      findField(state, drawn.value.marks),
      h('div', { class: 'sc-data-files-chart', ref: chart, style: style.value }, sized.value ? h('svg', {
        'aria-label' : `${state.section.value}, ${files.LEGENDS[state.section.value]}`,
        class        : ['sc-data-files-draw', { 'sc-data-unfold': unfolding.value }],
        height       : layout.value.height,
        id           : `${id}-drawing`,
        onKeydown    : stepped,
        role         : 'group',
        tabindex     : 0,
        viewBox      : `0 0 ${layout.value.width} ${layout.value.height}`,
        width        : layout.value.width
      }, drawn.value.nodes) : undefined),
      h('p', { class: 'sc-data-files-legend' }, files.LEGENDS[state.section.value]),
      state.at.value
        ? h(Rail, { decades: state.decades, entries: state.entries, entry: state.at.value })
        : null
    ])
  }
})
