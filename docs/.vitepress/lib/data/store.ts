import rendered from '../rendered/store.json' with { type: 'json' }

/**
 * One fetched file and the games the store holds from it, counted by the decade
 * they were played in under the decade's first year, beside the name it is
 * filed under, its file's name without the extension.
 */
export interface Archive {
  address : string
  decades : Readonly<Record<string, number | undefined>>
  games   : number
  name    : string
}

/**
 * The games of one decade, counted by how many moves each plays from 0, beside
 * the decade's name, such as `1980s`.
 */
interface Era {
  decade : number
  moves  : readonly number[]
  name   : string
}

/**
 * One row of the archives the store keeps the most games from: its games, the
 * share of the store held down to it, its name, and whether it gathers every
 * other archive.
 */
export interface Rank {
  games  : number
  held   : number
  name   : string
  others : boolean
}

/**
 * The counts `scotch render docs` reads from the index for the Data pages, the
 * Guide's store page, and the Viewer, meaning the games of each decade by
 * length, each fetched file, the count of every stored game and of every
 * position the index holds, the archives it keeps the most games from, and for
 * each number of moves the games ending in each result `results` names.
 */
export interface Store {
  eras      : readonly Era[]
  files     : readonly Archive[]
  games     : number
  largest   : readonly Rank[]
  moves     : readonly (readonly number[])[]
  positions : number
  results   : readonly string[]
}

/**
 * The counts the index holds, as `scotch render docs` last wrote them.
 */
export const STORE: Store = rendered
