// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import * as files        from '../../../lib/data/files.ts'
import * as list         from '../../../lib/data/list.ts'
import { SAMPLE_LISTED } from './fixtures/listed.ts'

/**
 * Builds the file list's state over the sample, beside the Players in the order
 * the swarm draws them.
 */
function sampled(): { marks: files.Entry[], state: list.List } {
  const state = list.useList(SAMPLE_LISTED)
  return { marks: files.sectionOf(state.entries, 'Players'), state }
}

describe('useList', () => {
  it('opens on the Players and the archive under two sections, across every game the Openings hold', () => {
    const { state } = sampled()
    expect([state.section.value, state.at.value?.listed.file, state.target.value])
      .toEqual(['Players', 'players/Bird.zip', [0, 290]])
    expect(state.years).toEqual([1845, 2020])
  })

  it('reads every file `scotch render docs` wrote by default', () => {
    expect(list.useList().entries).toHaveLength(files.LISTED.length)
  })
})

describe('showSection', () => {
  it('moves the card to the file the section opens on', () => {
    const { state } = sampled()
    list.showSection(state, 'Events')
    expect([state.section.value, state.at.value?.stem]).toEqual(['Events', 'WorldChamp2018'])
  })
})

describe('countOf and tallyOf', () => {
  it('counts every file of a section, and the marks shown, while no query is set', () => {
    const { marks, state } = sampled()
    expect(files.SECTIONS.map(section => list.countOf(state, section))).toEqual(['4', '5', '5'])
    expect(list.tallyOf(state, marks)).toBe('14 files')
  })

  it('counts the files the query matches while one is set', () => {
    const { marks, state } = sampled()
    state.query.value = 'bird'
    expect(files.SECTIONS.map(section => list.countOf(state, section))).toEqual(['1', '0', '1'])
    expect(list.tallyOf(state, marks)).toBe('1 of 4 Players')
  })
})

describe('stepAlong', () => {
  it.each([
    { key: 'ArrowRight', to: 'Carlsen' },
    { key: 'ArrowDown', to: 'Carlsen' },
    { key: 'ArrowLeft', to: 'Undated' },
    { key: 'ArrowUp', to: 'Undated' }
  ])('steps the card along the marks on $key', ({ key, to }) => {
    const { marks, state } = sampled()
    expect(list.stepAlong(key, state, marks)).toBe(true)
    expect(state.at.value?.stem).toBe(to)
  })

  it('steps only among the marks the query matches, from the first where the card shows none of them', () => {
    const { marks, state } = sampled()
    state.query.value = 'o'
    expect(list.stepAlong('ArrowRight', state, marks)).toBe(true)
    expect(state.at.value?.stem).toBe('Morphy')
  })

  it('leaves the card where it is for another key, or where no mark matches', () => {
    const { marks, state } = sampled()
    expect(list.stepAlong('Enter', state, marks)).toBe(false)
    state.query.value = 'zzz'
    expect(list.stepAlong('ArrowRight', state, marks)).toBe(false)
    expect(state.at.value?.stem).toBe('Bird')
  })
})
