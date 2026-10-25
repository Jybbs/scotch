import * as games                                      from './games.ts'
import { type Loaded, PARTIES, type Pair, type Party } from './loaded.ts'

/**
 * One move of a sheet, as the cursor it moves to, its SAN, whether it lies
 * inside the run the two games share, and the tag it carries where the two meet
 * or part on it.
 */
export interface Cell {
  reach : number
  run   : boolean
  san   : string
  tag?  : 'meet' | 'part'
}

/**
 * One game's part of a row, its move number and its two moves, any of them
 * missing where the game plays no move there.
 */
export interface Half {
  black? : Cell
  no?    : string
  white? : Cell
}

/**
 * The sheets bound row by row: the rows, each holding the plies the cursor
 * reaches together in either game, and whether the submitted game's first move
 * is Black's, which shifts every row by one ply.
 */
export interface Sheet {
  first : number
  rows  : readonly SheetRow[]
}

/**
 * One row of the bound sheets, numbered from the row the cursor's first ply
 * falls in, beside whether the run the two games share passes through it.
 */
export interface SheetRow {
  index     : number
  run       : boolean
  stored    : Half
  submitted : Half
}

function cellOf(loaded: Loaded, reach: number, san: string): Cell {
  const shared = loaded.shared
  const run    = !!shared && reach > shared.meet && reach <= shared.last
  if (shared?.meet === reach && reach > 0) return { reach, run, san, tag: 'meet' }
  return shared?.part === reach ? { reach, run, san, tag: 'part' } : { reach, run, san }
}

function place(loaded: Loaded, first: number, party: Party, rowOf: (index: number) => SheetRow): void {
  const side = loaded.sideOf(party)
  if (!side) return
  const number = games.numberingOf(side)
  for (const [at, san] of side.moves.entries()) {
    const reach                     = loaded.cursorOf(party, at + 1)
    const { no, white }             = number(at)
    const row                       = rowOf(rowAt(reach, first))
    const half                      = row[party]
    half.no                         = `${no}.`
    half[white ? 'white' : 'black'] = cellOf(loaded, reach, san)
    if (party === 'submitted' && loaded.sharing(reach) && reach > loaded.shared!.meet) row.run = true
  }
}

/**
 * Finds the pair the submitted game's move reaching a cursor belongs to, where
 * the two games played that move in another order.
 */
export function pairAt(loaded: Loaded, cursor: number): Pair | undefined {
  const reach = loaded.plyOf('submitted', cursor)
  return loaded.pairs.find(pair => pair.submitted === reach)
}

/**
 * Reads the row a cursor falls in, the row holding the move that reaches it.
 */
export function rowAt(cursor: number, first: number): number {
  return Math.floor((cursor - 1 + first) / 2)
}

/**
 * Binds the two games' moves row by row, the stored game's shifted by the run's
 * offset, so each row holds the plies the cursor reaches together.
 */
export function sheetOf(loaded: Loaded): Sheet {
  const first = games.numberingOf(loaded.match.submitted)(0).white ? 0 : 1
  const rows  = new Map<number, SheetRow>()
  const rowOf = (index: number): SheetRow => {
    if (!rows.has(index)) rows.set(index, { index, run: false, stored: {}, submitted: {} })
    return rows.get(index)!
  }
  for (const party of PARTIES) place(loaded, first, party, rowOf)
  return { first, rows: [...rows.values()].toSorted((a, b) => a.index - b.index) }
}
