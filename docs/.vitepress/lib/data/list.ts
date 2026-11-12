import { useTransition }                                        from '@vueuse/core'
import { type Ref, type ShallowRef, computed, shallowRef } from 'vue'

import { useMotion } from '../motion/control.ts'
import * as timing   from '../motion/timing.ts'
import * as axes     from './axes.ts'
import * as files    from './files.ts'
import { counted }   from './numbers.ts'

/**
 * The file list's state: every entry, the decades the card's cells span, the
 * years the Players and Events drawings span, the Openings' bands, the section
 * and the query shown, the entry the card shows, and the stretch of the
 * Openings shown beside the one a press last opened.
 */
export interface List {
  at      : ShallowRef<files.Entry | undefined>
  bands   : axes.Bands
  decades : number[]
  domain  : Ref<number[]>
  entries : files.Entry[]
  query   : ShallowRef<string>
  section : ShallowRef<files.Section>
  target  : ShallowRef<[number, number]>
  years   : readonly [number, number]
}

/**
 * Keeps the entries of `entries` the query matches, every one while no query
 * is set.
 */
function matching(list: List, entries: readonly files.Entry[]): files.Entry[] {
  return entries.filter(entry => files.matches(entry, list.query.value))
}

/**
 * Counts a section's files, or those the query matches while one is set.
 */
export function countOf(list: List, section: files.Section): string {
  return counted(matching(list, files.sectionOf(list.entries, section)).length)
}

/**
 * Moves the card one mark along `marks` from the one it shows, among those the
 * query matches, returning whether `key` steps it.
 */
export function stepAlong(key: string, list: List, marks: readonly files.Entry[]): boolean {
  const order = matching(list, marks)
  const step  = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 }[key]
  if (step === undefined || order.length === 0) return false
  const place = list.at.value ? order.indexOf(list.at.value) : -1
  list.at.value = order[(place + step + order.length) % order.length]
  return true
}

/**
 * Shows a section, the card moving to the entry the section opens on.
 */
export function showSection(list: List, section: files.Section): void {
  list.section.value = section
  list.at.value      = files.opening(list.entries, section)
}

/**
 * Writes the find field's tally, every file while no query is set and the
 * marks of the section shown that the query matches otherwise.
 */
export function tallyOf(list: List, marks: readonly files.Entry[]): string {
  if (!list.query.value) return `${counted(list.entries.length)} files`
  return `${counted(matching(list, marks).length)} of ${counted(marks.length)} ${list.section.value}`
}

/**
 * Builds the file list's state over `listed`, opening on the Players and the
 * archive the section opens on, and easing the Openings' stretch toward each
 * one a press opens along the site's glide, straight there while the site's
 * drawings hold still.
 */
export function useList(listed: readonly files.Listed[] = files.LISTED): List {
  const entries    = files.entriesOf(listed)
  const decades    = files.decadesOf(files.sectionOf(entries, 'Players'))
  const bands      = axes.bandsOf(files.sectionOf(entries, 'Openings'))
  const target     = shallowRef<[number, number]>([0, bands.total])
  const { moving } = useMotion()

  return {
    at      : shallowRef(files.opening(entries, 'Players')),
    bands   : bands,
    decades : decades,
    domain  : useTransition(target, {
      disabled : computed(() => !moving.value),
      duration : timing.DURATIONS.glide * 1.6,
      easing   : timing.CURVES.glide
    }),
    entries : entries,
    query   : shallowRef(''),
    section : shallowRef<files.Section>('Players'),
    target  : target,
    years   : files.yearsOf(decades)
  }
}
