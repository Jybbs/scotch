import type { Chart }          from '../../../../lib/data/lengths.ts'
import type { Archive, Store } from '../../../../lib/data/store.ts'

/**
 * The address PGN Mentor serves its players' archives under.
 */
const PLAYERS = 'https://www.pgnmentor.com/players/'
/**
 * A store of four archives and 26 games, 25 of them dated across four decades,
 * whose results run in the order the index lists them.
 */
export const SAMPLE_STORE: Store = {
  games     : 26,
  moves     : [[0, 1, 1, 0], [1, 0, 2, 1], [0, 1, 1, 2], [0, 2, 0, 1], [0, 1, 1, 1]],
  positions : 1820,
  results   : ['*', '0-1', '1-0', '1/2-1/2'],

  eras: [
    { decade: 1840, moves: [0, 1, 1], name: '1840s' },
    { decade: 1850, moves: [0, 2, 2, 1], name: '1850s' },
    { decade: 1900, moves: [1, 0, 3, 4], name: '1900s' },
    { decade: 2000, moves: [0, 0, 2, 6, 2], name: '2000s' }
  ],

  files: [
    archive({ 1850: 3 }, 3, 'Morphy'),
    archive({ 2000: 8 }, 8, 'Kasparov'),
    archive({ 1840: 2 }, 2, 'Anderssen'),
    archive({ 1900: 3, 2000: 2 }, 5, 'Karpov')
  ],

  largest: [
    { games: 8, held: 8 / 18, name: 'Kasparov', others: false },
    { games: 5, held: 13 / 18, name: 'Karpov', others: false },
    { games: 5, held: 1, name: '2 others', others: true }
  ]
}
/**
 * A chart over the first three moves, which every case reading `SAMPLE_STORE`
 * takes so a reader checks each count by hand.
 */
export const SMALL: Chart = { late: 2, limit: 3, opening: 2, plotted: 3, short: 1, smoothing: 1 }

/**
 * Builds the archive PGN Mentor serves for one player under the player's name,
 * holding `games` games counted by decade.
 */
function archive(decades: Record<string, number>, games: number, name: string): Archive {
  return { address: `${PLAYERS}${name}.zip`, decades, games, name }
}
