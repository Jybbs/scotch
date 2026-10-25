import type { Side }   from './examples.ts'
import * as games      from './games.ts'
import type { Loaded } from './loaded.ts'

/**
 * The longest line of move text PGN's export format writes, each line holding
 * fewer than 80 printing characters (PGN Section 8.2.1).
 */
const WIDTH = 79

function quoted(value: string): string {
  return `"${value.replaceAll(/["\\]/gu, mark => `\\${mark}`)}"`
}

/**
 * Lays words out as lines of move text no wider than PGN's export format sets.
 */
function wrapped(words: readonly string[]): string[] {
  return words.reduce<string[]>((lines, word) => {
    const last = lines.at(-1)
    if (last === undefined || last.length + 1 + word.length > WIDTH) lines.push(word)
    else lines[lines.length - 1] = `${last} ${word}`
    return lines
  }, [])
}

/**
 * Writes a game's moves from `from` on, each of White's behind its number and
 * the first behind its number where Black plays it, as a Black move opening a
 * line or following a variation takes one (PGN Section 8.2.2.2).
 */
export function movesOf(from: number, side: Side): string[] {
  const number = games.numberingOf(side)
  return side.moves.slice(from).map((san, at) => {
    const { no, white } = number(from + at)
    if (white) return `${no}. ${san}`
    return at ? san : `${no}... ${san}`
  })
}

/**
 * Writes the submitted game as PGN in export format, its tags in the order it
 * holds them and its moves wrapped within 79 columns, with the stored game's
 * moves from the move where the two part set as a Recursive Annotation
 * Variation on the submitted game's move there, which a reader plays by first
 * taking that move back (PGN Section 8.2.5), the variation opening on a comment
 * naming the stored game's players, event, and year. Taking it back reaches the
 * last position the two share with the same side to move, since the index keys
 * a position with the side to move. Where the submitted game ends on that
 * position, the stored game's moves close the game as a comment.
 */
export function pgnOf(loaded: Loaded): string {
  const { stored, submitted } = loaded.match
  const tags                  = Object.entries(submitted.headers)
    .map(([name, value]) => `[${name} ${quoted(value ?? '')}]`)
  const words  = movesOf(0, submitted)
  const shared = loaded.shared
  if (stored && shared && loaded.parting) {
    const line = movesOf(shared.last + loaded.offset, stored)
    const note = `${games.nameOf(stored)}, ${games.whereOf(stored)}`
    if (shared.last < submitted.moves.length) {
      const after = movesOf(shared.last + 1, submitted)
      words.splice(shared.last + 1, words.length, `( {${note}}`, ...line, ')', ...after)
    } else {
      words.push(`{${note}, continued ${line.join(' ')}}`)
    }
  }
  return `${tags.join('\n')}\n\n${wrapped([...words, submitted.headers.Result ?? '*']).join('\n')}\n`
}
