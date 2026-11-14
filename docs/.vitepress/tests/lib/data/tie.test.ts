import { describe, expect, it } from 'vitest'

import * as numbers from '../../../lib/data/numbers.ts'
import * as tags    from '../../../lib/data/tags.ts'
import * as tie     from '../../../lib/data/tie.ts'

const [first, second, third, fourth, , sixth] = tie.tiedGames

describe('the tied games', () => {
  it('reads each tied game’s ratings and the value the order sorts it by, in the order a tie takes', () => {
    expect(tie.tiedGames.map(game => [game.place, game.rated, game.key])).toEqual([
      [1, 2, 2635], [2, 2, 2547.5], [3, 2, 2507], [4, 1, 2640], [5, 1, 2505], [6, 0, null], [7, 0, null]
    ])
    expect(first!.name).toBe('Portisch – Spassky')
    const places = tie.ratingKinds.map(kind => kind.games.map(game => game.place))
    expect(places).toEqual([[1, 2, 3], [4, 5], [6, 7]])
    expect(numbers.summed(tie.ratingKinds.map(kind => kind.count))).toBe(tags.TAGS.every.games)
  })

  it.each([
    [{ games: 1, high: 2200, low: null }, 'under 2200'],
    [{ games: 1, high: 2250, low: 2200 }, 'from 2200 to under 2250'],
    [{ games: 1, high: null, low: 2850 }, 'of 2850 or more']
  ])('names the means a bin holds', (bin, phrase) => {
    expect(tie.meanPhrase(bin)).toBe(phrase)
  })

  it.each([
    ['2785', 2785],
    ['1', 1],
    ['2900', 2900],
    ['2901', null],
    ['3000', null],
    ['0', null],
    ['', null],
    ['2700?', null]
  ])('reads the rating tag %j as %j, as the index reads it', (text, value) => {
    expect(tie.rating(text)).toBe(value)
  })

  it('finds the bin a game carrying both ratings falls in, and none for any other', () => {
    const bins = tie.tiedGames.map(tie.binOf)
    expect(bins.slice(0, 3).map(at => tie.meanBins[at]!.low)).toEqual([2600, 2500, 2500])
    expect(bins.slice(3)).toEqual([-1, -1, -1, -1])
  })

})

describe('the readout of the tie order', () => {
  it('lights a tied game, a kind of rating, or a bin, beside the share the meter fills to', () => {
    expect(tie.litBy({ at: 3, by: 'game' })).toEqual({
      bin: null, game: fourth, games: [fourth], kind: 1, share: tie.ratingKinds[1]!.share
    })
    expect(tie.litBy({ at: 2, by: 'kind' }).games).toEqual(tie.ratingKinds[2]!.games)
    const bin = tie.binOf(second!)
    expect(tie.litBy({ at: bin, by: 'bin' })).toEqual({
      bin   : bin,
      game  : null,
      games : [second, third],
      kind  : 0,
      share : tie.meanBins[bin]!.games / tags.TAGS.every.games
    })
  })

  it('reads out a tied game by the rule that set its place', () => {
    expect(tie.panelOf({ at: 1, by: 'game' })).toEqual({
      big      : '2',
      line     : '1992 · Groningen · 2625 · 2470',
      sentence : 'It carries both ratings, so the match sorts it by their mean, 2547.5, the second '
               + 'highest of the 3 tied games carrying both, so it comes second.',
      title    : 'Christiansen – Klovans'
    })
    expect(tie.panelOf({ at: 3, by: 'game' }).sentence).toBe(
        'It carries one rating, so it follows the 3 tied games carrying both and sorts by that rating, 2640, '
      + 'the highest of the 2 carrying one, so it comes fourth.'
    )
    expect(tie.panelOf({ at: 5, by: 'game' }).sentence).toBe(
        'It carries neither rating, so it comes after the 5 rated games and keeps the order the index stores '
      + `the rest in, as stored game ${numbers.counted(sixth!.number)}, so it comes sixth.`
    )
  })

})

describe('the words of the tie order', () => {
  it.each([0, 1, 2])('reads out kind %i by the tests its games pass and the tied games it holds', at => {
    const kind  = tie.ratingKinds[at]!
    const panel = tie.panelOf({ at, by: 'kind' })
    expect(panel.title).toBe(`${kind.label}, ${kind.rule}`)
    const held  = tie.places(kind.games)
    expect(panel.line).toBe(`${numbers.counted(kind.count)} stored games · the tie’s ${held}`)
    expect(panel.sentence).toMatch(/^(Every|A) stored game carrying .+, as the tie’s games \d to \d do\.$/u)
    expect(tie.kindLead(kind)).toContain(`and take their place ${kind.rule}`)
  })

  it('reads out a bin by its share of the games carrying both and the tied games it holds', () => {
    const both = tie.ratingKinds[0]!.count
    const at   = tie.binOf(first!)
    const bin  = tie.meanBins[at]!
    expect(tie.panelOf({ at, by: 'bin' })).toEqual({
      big      : tie.shared(bin.games / both),
      line     : `${numbers.counted(bin.games)} stored games · of those carrying both`,
      sentence : `${numbers.counted(bin.games)} of the ${numbers.counted(both)} stored games carrying both `
               + 'ratings fall here, as the tie’s game 1 does.',
      title    : 'A mean from 2600 to under 2650'
    })
    expect(tie.panelOf({ at: 0, by: 'bin' }).sentence).toMatch(/fall here\.$/u)
    expect(tie.panelOf({ at: tie.meanBins.length - 1, by: 'bin' }).title).toBe('A mean of 2850 or more')
  })

  it.each([
    [0, '0%'], [0.0004, '0.04%'], [0.06, '6.0%'], [0.92, '92%']
  ])('writes a share of %f as %s', (share, text) => {
    expect(tie.shared(share)).toBe(text)
  })

  it('speaks the ratings each kind of tied game carries', () => {
    const games = [0, 3, 5].map(at => tie.tiedGames[at]!)
    expect(games.map(game => tie.ratingSpoken(game))).toEqual([
      'rated 2655 and 2615, a mean of 2635', 'rated 2640 on one side alone', 'rated on neither side'
    ])
  })
})
