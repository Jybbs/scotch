import rendered from '../rendered/tie.json' with { type: 'json' }

import * as numbers from './numbers.ts'
import * as tags    from './tags.ts'

/**
 * What a reader points at in the figure of the tie order: one tied game, one
 * kind of rating, or one bin of the games carrying both, each by its place
 * from 0.
 */
export interface Focus {
  at : number
  by : 'bin' | 'game' | 'kind'
}

/**
 * What a focus lights: the bin or the tied game it points at, or `null`, the
 * tied games, the place of the kind of rating among `ratingKinds`, and the
 * share of every stored game the meter fills to.
 */
export interface Lit {
  bin   : number | null
  game  : TiedGame | null
  games : readonly TiedGame[]
  kind  : number
  share : number
}

/**
 * The readout a focus reads as: its figure, its title, a line in the code
 * face, and a sentence.
 */
export interface Panel {
  big      : string
  line     : string
  sentence : string
  title    : string
}

/**
 * The stored games carrying one kind of rating, in the order a tie takes the
 * kinds: their count, the tied games among them, the label and the rule
 * ordering them, how many ratings they carry, and their share of every stored
 * game.
 */
export interface RatingKind {
  count : number
  games : readonly TiedGame[]
  label : string
  rated : Rated
  rule  : string
  share : number
}

/**
 * One stored game of the tie, at its place in the order a match shows them:
 * its players, the year and the event it was played in, the ratings it
 * carries and how many, its number in the index, and the value the order
 * sorts it by, the mean of two ratings or the one it carries.
 */
export interface TiedGame {
  black  : number | null
  event  : string
  key    : number | null
  name   : string
  number : number
  place  : number
  rated  : Rated
  white  : number | null
  year   : number | null
}

/**
 * How many of its two ratings a stored game carries.
 */
type Rated = 0 | 1 | 2

/**
 * The words naming a place in the tie, from the first.
 */
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth']
/**
 * The bins of the games carrying both ratings, by the mean of the two, from
 * the lowest.
 */
export const meanBins: readonly tags.MeanBin[] = tags.TAGS.means
/**
 * Every tied game, in the order a match shows them.
 */
export const tiedGames: readonly TiedGame[] = rendered.games.map(tiedOf)
/**
 * The kinds of rating a stored game carries, both first, then one, then
 * neither, the order a tie takes them in.
 */
export const ratingKinds: readonly RatingKind[] = ([
  [2, 'Both ratings', 'by the mean of the two', 'both'],
  [1, 'One rating', 'by that rating', 'one'],
  [0, 'Neither', 'in the order the index stores them', 'neither']
] as const).map(([rated, label, rule, key]) => ({
  count : tags.TAGS.every.ratings[key],
  games : tiedGames.filter(game => game.rated === rated),
  label : label,
  rated : rated,
  rule  : rule,
  share : tags.TAGS.every.ratings[key] / tags.TAGS.every.games
}))

/**
 * Writes the tied games a bin holds, `as the tie’s game 1 does` where it holds
 * any.
 */
function heldBy(bin: number): string {
  const held = tiedGames.filter(game => binOf(game) === bin)
  return held.length > 0 ? `, as the tie’s ${places(held)} ${held.length === 1 ? 'does' : 'do'}` : ''
}

/**
 * Writes the sentence a kind of rating reads as in the readout, naming the
 * tests a game of its kind passes.
 */
function kindSentence(kind: RatingKind): string {
  const tied = `as the tie’s ${places(kind.games)} do`
  if (kind.rated === 2)
    return 'Every stored game carrying both ratings passes the first test and takes its place by the mean '
         + `of the two, ${tied}.`
  if (kind.rated === 1)
    return 'A stored game carrying one rating fails the first test, passes the second, and takes its place '
         + `by that rating after every game carrying both, ${tied}.`
  return 'A stored game carrying neither rating fails both tests and keeps the order the index stores it '
       + `in, after every rated game, ${tied}.`
}

/**
 * Reads a rating tag as a number, or `null` where it holds no number above 0,
 * as the index reads it.
 */
function rating(text: string): number | null {
  return /^\d+$/u.test(text) && Number(text) > 0 ? Number(text) : null
}

/**
 * Writes the sentence naming the rule that set a tied game's place, from how
 * many ratings it carries and where its value ranks among the tied games of
 * its kind.
 */
function ruleSentence(game: TiedGame): string {
  const same    = ratingKinds[2 - game.rated]!.games
  const rank    = same.indexOf(game)
  const ahead   = tiedGames.filter(other => other.rated > game.rated).length
  const highest = rank ? `the ${ORDINALS[rank]} highest` : 'the highest'
  const comes   = `so it comes ${ORDINALS[game.place - 1]}`
  if (game.rated === 2)
    return `It carries both ratings, so the match sorts it by their mean, ${game.key}, ${highest} of the `
         + `${same.length} tied games carrying both, ${comes}.`
  if (game.rated === 1)
    return `It carries one rating, so it follows the ${ahead} tied games carrying both and sorts by that `
         + `rating, ${game.key}, ${highest} of the ${same.length} carrying one, ${comes}.`
  return `It carries neither rating, so it comes after the ${ahead} rated games and keeps the order the `
       + `index stores the rest in, as stored game ${numbers.counted(game.number)}, ${comes}.`
}

/**
 * Reads the share of every stored game a bin of the games carrying both
 * ratings holds.
 */
function shareOf(bin: number): number {
  return meanBins[bin]!.games / tags.TAGS.every.games
}

/**
 * Reads one game of the tie at its place, `index` counting from 0.
 */
function tiedOf(game: (typeof rendered.games)[number], index: number): TiedGame {
  const white = rating(game.tags.WhiteElo)
  const black = rating(game.tags.BlackElo)
  return {
    black  : black,
    event  : game.tags.Event,
    key    : white !== null && black !== null ? (white + black) / 2 : white ?? black,
    name   : [game.tags.White, game.tags.Black].map(player => player.split(',')[0]!.trim()).join(' – '),
    number : game.game,
    place  : index + 1,
    rated  : (Number(white !== null) + Number(black !== null)) as Rated,
    white  : white,
    year   : Number(game.tags.Date.slice(0, 4)) || null
  }
}

/**
 * Finds the place among `meanBins` of the bin a game carrying both ratings
 * falls in, or -1 for any other game.
 */
export function binOf(game: TiedGame): number {
  const key = game.key ?? 0
  return game.rated === 2
    ? meanBins.findIndex(bin => (bin.low ?? -Infinity) <= key && key < (bin.high ?? Infinity))
    : -1
}

/**
 * Writes the sentence the head of the figure reads at a kind of rating.
 */
export function kindLead(kind: RatingKind): string {
  return `Of every stored game, ${shared(kind.share)} carry ${kind.label.toLowerCase()} and take their `
       + `place ${kind.rule}, as the tie’s ${places(kind.games)} do.`
}

/**
 * Reads what a focus lights.
 */
export function litBy({ at, by }: Focus): Lit {
  if (by === 'bin') {
    const games = tiedGames.filter(game => binOf(game) === at)
    return { bin: at, game: null, games: games, kind: 0, share: shareOf(at) }
  }
  const game = by === 'game' ? tiedGames[at]! : null
  const kind = game ? 2 - game.rated : at
  return {
    bin   : null,
    game  : game,
    games : game ? [game] : ratingKinds[at]!.games,
    kind  : kind,
    share : ratingKinds[kind]!.share
  }
}

/**
 * Writes the range of means a bin holds, such as `from 2200 to under 2250`.
 */
export function meanPhrase({ high, low }: tags.MeanBin): string {
  if (low === null) return `under ${high}`
  return high === null ? `of ${low} or more` : `from ${low} to under ${high}`
}

/**
 * Writes the readout a focus reads as, the figure of a tied game being its
 * place.
 */
export function panelOf({ at, by }: Focus): Panel {
  if (by === 'game') {
    const game = tiedGames[at]!
    return {
      big      : String(game.place),
      line     : `${game.year ?? 'Undated'} · ${game.event} · ${game.white ?? '–'} · ${game.black ?? '–'}`,
      sentence : ruleSentence(game),
      title    : game.name
    }
  }
  if (by === 'kind') {
    const kind = ratingKinds[at]!
    return {
      big      : shared(kind.share),
      line     : `${numbers.counted(kind.count)} stored games · the tie’s ${places(kind.games)}`,
      sentence : kindSentence(kind),
      title    : `${kind.label}, ${kind.rule}`
    }
  }
  const bin  = meanBins[at]!
  const both = numbers.counted(ratingKinds[0]!.count)
  return {
    big      : shared(bin.games / ratingKinds[0]!.count),
    line     : `${numbers.counted(bin.games)} stored games · of those carrying both`,
    sentence : `${numbers.counted(bin.games)} of the ${both} stored games carrying both ratings fall `
             + `here${heldBy(at)}.`,
    title    : `A mean ${meanPhrase(bin)}`
  }
}

/**
 * Writes the places a run of tied games holds, such as `games 1 to 3`.
 */
export function places(games: readonly TiedGame[]): string {
  return games.length === 1 ? `game ${games[0]!.place}` : `games ${games[0]!.place} to ${games.at(-1)!.place}`
}

/**
 * Writes the ratings a tied game carries as a screen reader hears them.
 */
export function ratingSpoken(game: TiedGame): string {
  if (game.rated === 2) return `rated ${game.white} and ${game.black}, a mean of ${game.key}`
  return game.rated === 1 ? `rated ${game.key} on one side alone` : 'rated on neither side'
}

/**
 * Writes a share of the stored games with the digits it needs to read as more
 * than nothing, one under a tenth and two under a thousandth.
 */
export function shared(share: number): string {
  if (share > 0 && share < 0.001) return numbers.percent(share, 2)
  return numbers.percent(share, share > 0 && share < 0.1 ? 1 : 0)
}
