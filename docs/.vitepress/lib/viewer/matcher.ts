import type { InitInput }          from '../games/crate/scotch.js'
import { loadReader }              from '../games/readers.ts'
import { type Matches, Published } from '../games/store.ts'

/**
 * Where matching a submitted game reads from: the WebAssembly module the reader
 * and the store run in, the origin the store is published at, and the fetch
 * every request goes through.
 */
export interface Sources {
  fetch?  : typeof globalThis.fetch
  module? : InitInput
  origin? : string
}

/**
 * What submitting a game gives: the stored games it shares its longest run
 * with, in the order `scotch match game` ranks them, or the line naming why
 * it makes no match.
 */
export type Submission = { matches: Matches, problem?: undefined }
                       | { matches?: undefined, problem: string }

/**
 * Reads the message an error carries, or the value thrown in its place as text.
 */
function messageOf(error: unknown): string {
  return Error.isError(error) ? error.message : String(error)
}

/**
 * Matches a game submitted as PGN against the published store, loading the
 * reader and opening the store on the first submission, so the page fetches no
 * store file before a game is submitted.
 */
export class Matcher {
  private published?       : Promise<Published>
  private reader?          : ReturnType<typeof loadReader>
  private readonly sources : Sources

  constructor(sources: Sources = {}) {
    this.sources = sources
  }

  /**
   * Reads the first game `text` carries and matches it, reporting a text
   * holding no game and a game carrying a problem, such as an illegal move or
   * a variant other than standard chess, as `scotch match game` reports them,
   * and reporting a reader or a store it cannot load, which the next
   * submission loads again.
   *
   * Args:
   *   name : What the text was read from, which the line naming a problem
   *     names.
   *   text : The PGN text.
   */
  async submit(name: string, text: string): Promise<Submission> {
    const read = await (this.reader ??= loadReader(
      this.sources.module ?? new URL('../games/crate/scotch_bg.wasm', import.meta.url)
    )).catch((error: unknown) => {
      this.reader = undefined
      return messageOf(error)
    })
    if (typeof read === 'string') return { problem: `Cannot load the reader: ${read}` }
    const [game] = read(text)
    if (!game) return { problem: `Found no game in ${name}` }
    if (game.errors.length > 0) {
      return { problem: [`Found problems in the game in ${name}:`, ...game.errors].join('\n') }
    }
    try {
      const store = await (this.published ??= Published.open(this.sources.origin, this.sources.fetch))
      return { matches: await store.matches(game) }
    } catch (error) {
      this.published = undefined
      return { problem: `Cannot reach the store: ${messageOf(error)}` }
    }
  }
}
