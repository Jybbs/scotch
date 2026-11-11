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
      .toEqual(['scotch fetch games', 'scotch index games', 'scotch match game docs/public/games/front.pgn'])
  })

  it("prints the last archives the fetch writes and the store's own counts", () => {
    expect(commands[0]).toMatchObject({
      figure : counted(STORE.files.length),
      out    : STORE.files.slice(-2).map(({ address }) => `Fetched ${address}`)
    })
    expect(commands[1]!.out).toEqual([`Indexed ${counted(STORE.games)} games into .cache/data/index`])
  })

  it('stops the match report on the run the two games share, ahead of the parting', () => {
    expect(commands[2]).toMatchObject({
      figure : '6',
      out    : ['Shares 6 positions, plies 7 to 12 of the submitted game '
              + 'and plies 7 to 12 of the stored game']
    })
    expect(commands[2]!.out.join(' ')).not.toContain('Qc2')
  })
})
