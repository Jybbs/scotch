import { describe, expect, it } from 'vitest'

import { counted }             from '../../../lib/data/numbers.ts'
import { STORE }               from '../../../lib/data/store.ts'
import { frontOf }             from '../../../lib/front/example.ts'
import { beatsOf, commandsOf } from '../../../lib/front/session.ts'

const commands = commandsOf(frontOf())

describe('beatsOf', () => {
  it('types a command three characters a beat, then prints what it leaves', () => {
    const beats = beatsOf([{ ...commands[0]!, command: 'scotch' }])
    expect(beats).toEqual([
      { done: false, step: 0, typed: 0 },
      { done: false, step: 0, typed: 3 },
      { done: false, step: 0, typed: 6 },
      { done: true, step: 0, typed: 6 }
    ])
  })

  it('stops short of a command whose length the beat does not divide', () => {
    expect(beatsOf([{ ...commands[0]!, command: 'scotch f' }]).at(-2))
      .toEqual({ done: false, step: 0, typed: 8 })
  })

  it('plays every command in turn', () => {
    expect(new Set(beatsOf(commands).map(beat => beat.step))).toEqual(new Set([0, 1, 2]))
  })
})

describe('commandsOf', () => {
  it('lists the three commands a reader runs from a fresh clone', () => {
    expect(commands.map(each => each.command))
      .toEqual(['scotch fetch games', 'scotch index games', 'scotch match game front.pgn'])
  })

  it("names the store's own figures", () => {
    expect(commands[0]!.figure).toBe(counted(STORE.files.length))
    expect(commands[1]!.out)
      .toEqual([`${counted(STORE.games)} games`, `${counted(STORE.positions)} positions keyed`])
  })

  it("names the run the match finds and the reader's parting move", () => {
    expect(commands[2]).toMatchObject({
      figure : '6',
      out    : ['6 positions shared from ply 7', 'parting at your 7. O-O']
    })
  })
})
