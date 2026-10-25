import { describe, expect, it } from 'vitest'

import { CONTROLS, type Control, controlOf, idle } from '../../../lib/viewer/controls.ts'
import { EXAMPLES }                                from '../../../lib/viewer/examples.ts'
import { Loaded }                                  from '../../../lib/viewer/loaded.ts'

const loaded = new Loaded(EXAMPLES.match)
const alone  = new Loaded(EXAMPLES.alone)
const named  = (name: string): Control => CONTROLS.find(control => control.name === name)!

describe('CONTROLS', () => {
  it.each([
    ['start', 20, loaded.first],
    ['back', 20, 19],
    ['next', 20, 21],
    ['end', 20, loaded.last],
    ['meet', 20, loaded.shared!.meet],
    ['part', 20, loaded.partAt]
  ])('moves %s from cursor %i to %i', (name, cursor, to) => {
    expect(named(name).to(loaded, cursor)).toBe(to)
  })
})

describe('controlOf', () => {
  it.each([
    ['ArrowLeft', 'back'],
    ['m', 'meet'],
    ['P', 'part'],
    ['home', 'start'],
    ['ArrowUp', 'start'],
    ['End', 'end'],
    ['ArrowDown', 'end']
  ])('finds the control key %j takes', (key, name) => {
    expect(controlOf(key)?.name).toBe(name)
  })

  it('finds no control for a key none takes', () => {
    expect(controlOf('x')).toBeUndefined()
  })
})

describe('idle', () => {
  it.each([
    ['start', loaded, loaded.first, true],
    ['start', loaded, 5, false],
    ['back', loaded, loaded.first, true],
    ['next', loaded, loaded.last, true],
    ['next', loaded, 5, false],
    ['meet', loaded, loaded.shared!.meet, true],
    ['meet', alone, 5, true],
    ['part', alone, 5, true]
  ] as const)('reads whether %s goes nowhere from a cursor', (name, match, cursor, still) => {
    expect(idle(named(name), cursor, match)).toBe(still)
  })
})
