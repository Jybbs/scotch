import init, { type InitInput, read } from './crate/scotch.js'

/**
 * One game a PGN text carries, read and keyed by the WebAssembly build of the
 * crate the command line reads its games through.
 */
interface Game {
  errors : string[]
  keys   : bigint[]
  moves  : string[]
  tags   : Record<string, string>
}

/**
 * Instantiates the WebAssembly module `source` holds or names, the
 * `scotch_bg.wasm` that `rs:wasm` writes beside the JavaScript wasm-bindgen writes for it, and returns
 * a reader of every game a PGN text carries, each read as python-chess's
 * reader reads it and keyed position by position by its Zobrist hash.
 */
export async function loadReader(source: InitInput): Promise<(text: string) => Game[]> {
  await init({ module_or_path: source })
  return text => read(text).map(game => {
    using owned = game
    return {
      errors : owned.errors,
      keys   : [...owned.keys],
      moves  : owned.moves,
      tags   : Object.fromEntries(owned.names.map((name, at) => [name, owned.values[at] ?? '']))
    }
  })
}
