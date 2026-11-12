import type { Match, Side }   from '../viewer/examples.ts'
import { type Piece, Store } from './crate/scotch.js'
import type { Game }         from './readers.ts'

/**
 * Where the store is published: `manifest.json` naming the current file and
 * the bytes its head takes, beside each file under a name hashed from its
 * bytes.
 */
const ORIGIN = 'https://store.scotch.fyi'

/**
 * What `scotch publish store` writes beside the file it publishes.
 */
interface Manifest {
  head  : number
  store : string
}

/**
 * The tags of each game a game piece holds, in the order of their slots.
 */
type Shelf = readonly Readonly<Record<string, string>>[]

/**
 * Reads the bytes of `url` from `from` to the one before `to` through a range
 * request, refusing an answer holding other than the range.
 */
async function ranged(
  fetch : typeof globalThis.fetch,
  from  : bigint,
  to    : bigint,
  url   : string
): Promise<Uint8Array<ArrayBuffer>> {
  const answered = await fetch(url, { headers: { Range: `bytes=${from}-${to - 1n}` } })
  if (answered.status !== 206) throw new Error(`The store answered ${answered.status} to a range request`)
  return new Uint8Array(await answered.arrayBuffer())
}

/**
 * Reads a submitted game as one side of a match.
 */
function sideOf(game: Game): Side {
  return { headers: game.tags, moves: game.sans, placements: game.placements }
}

/**
 * The published store as a match reads it: the file's head, each piece a
 * lookup has reached, and the tags each game piece's block carries.
 */
export class Published {
  private readonly fetch   : typeof globalThis.fetch
  private readonly shelves = new Map<number, Shelf>()
  private readonly store   : Store
  private readonly url     : string

  private constructor(fetch: typeof globalThis.fetch, store: Store, url: string) {
    this.fetch = fetch
    this.store = store
    this.url   = url
  }

  /**
   * Reads the manifest at `origin` and the head of the file it names, the
   * first two requests a match makes.
   */
  static async open(origin = ORIGIN, fetch = globalThis.fetch): Promise<Published> {
    const answered = await fetch(`${origin}/manifest.json`, { cache: 'no-cache' })
    if (!answered.ok) throw new Error(`The store’s manifest answered ${answered.status}`)
    const { head, store } = await answered.json() as Manifest
    const url             = `${origin}/${store}`
    return new Published(fetch, new Store(await ranged(fetch, 0n, BigInt(head), url)), url)
  }

  /**
   * Finds the stored games sharing the longest run with `game`, the first
   * beside every game tied with it in the order `scotch match game` ranks
   * them, each as the match it makes with `game`, or the one match holding no
   * stored game where none shares a position with it.
   */
  async matches(game: Game): Promise<Match[]> {
    const submitted = sideOf(game)
    const keys      = BigUint64Array.from(game.keys)
    using first     = await this.settled(() => this.store.best(keys, 1))
    using more      = first.ties > 0 ? await this.settled(() => this.store.best(keys, first.ties + 1)) : undefined
    const best      = more ?? first
    const matches   = best.runs.map(run => {
      using owned = run
      using side  = this.store.side(owned.slot)
      const stored: Side = {
        headers    : this.shelves.get(side.piece)?.[side.place] ?? {},
        moves      : side.moves,
        placements : side.placements
      }
      return {
        span   : { length: owned.length, offset: owned.offset, start: owned.start },
        stored,
        submitted,
        ties   : best.ties
      }
    })
    return matches.length > 0 ? matches : [{ span: null, stored: null, submitted, ties: 0 }]
  }

  /**
   * Reads the piece `piece` names out of the file, a key piece as it stands and
   * a game piece out of its block of raw DEFLATE, keeping the tags the block
   * carries beside it.
   */
  private async fetched(piece: Piece): Promise<void> {
    using owned = piece
    const bytes = await ranged(this.fetch, owned.from, owned.to, this.url)
    if (owned.keys) {
      this.store.add(true, owned.at, bytes)
      return
    }
    const inflated = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    const block    = new Uint8Array(await new Response(inflated).arrayBuffer())
    const length   = new DataView(block.buffer).getUint32(0, true)
    this.store.add(false, owned.at, block.subarray(4, 4 + length))
    this.shelves.set(owned.at, JSON.parse(new TextDecoder().decode(block.subarray(4 + length))) as Shelf)
  }

  /**
   * Returns what `look` returns once every piece it reaches is held, fetching
   * the pieces an answer reached before the store held them and calling it
   * again.
   */
  private async settled<T extends Disposable>(look: () => T): Promise<T> {
    const answer = look()
    const wanted = this.store.wanted()
    if (wanted.length === 0) return answer
    answer[Symbol.dispose]()
    await Promise.all(wanted.map(piece => this.fetched(piece)))
    return this.settled(look)
  }
}
