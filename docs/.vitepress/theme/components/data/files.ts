import { type ShallowRef, type VNode, computed, defineComponent, h, shallowRef, useId } from 'vue'

import * as axes     from '../../../lib/data/axes.ts'
import { useChart }  from '../../../lib/data/chart.ts'
import * as files    from '../../../lib/data/files.ts'
import * as list     from '../../../lib/data/list.ts'
import * as timeline from '../../../lib/reference/timeline.ts'
import * as drawings from './drawings.ts'
import { Rail }      from './rail.ts'
import { Tabs }      from './tabs.ts'

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
 * Draws a tab for each section beside the count of its files.
 */
function sectionTabs(id: string, state: list.List): VNode {
  return h(Tabs, {
    'controls'    : () => `${id}-drawing`,
    'label'       : 'Sections',
    'names'       : files.SECTIONS,
    'on'          : state.section.value,
    'onUpdate:on' : (section: string) => { list.showSection(state, section as files.Section) }
  }, { default: ({ name }: { name: files.Section }) => [name, h('small', list.countOf(state, name))] })
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
      sectionTabs(id, state),
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
