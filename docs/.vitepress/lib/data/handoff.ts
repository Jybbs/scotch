import demo from '../../../public/matches/demo.json' with { type: 'json' }
import keys from '../rendered/keys.json' with { type: 'json' }
import runs from '../rendered/runs.json' with { type: 'json' }

/**
 * What a stop draws of the demo's stored game: the path of the file holding it,
 * its row of tags, the `count` fingerprints of its position keys with the keys
 * of those it shares lit, or the report's first lines.
 */
export type Drawn =
  | { kind: 'path', text: string }
  | { count: number, keys: readonly string[], kind: 'prints' }
  | { kind: 'report', lines: readonly string[] }
  | { kind: 'row', rows: readonly (readonly [string, string])[] }

/**
 * One command of the flow: the sentence saying when it runs, the line saying
 * what the step before hands it, and the stops it writes or prints.
 */
export interface Leg {
  command : string
  does    : string
  stops   : readonly Stop[]
  handed? : string
}

/**
 * One stop of the flow: the file or the output it names, a plain line saying
 * what that is, the drawing of the demo's stored game in it, and whether the
 * command writes or prints it.
 */
export interface Stop {
  drawn : Drawn
  line  : string
  name  : string
  verb  : Verb
}

/**
 * What a command does with a stop.
 */
export type Verb = 'prints' | 'writes'

/**
 * The word each verb reads as on its stop.
 */
export const VERBS = { prints: 'Prints', writes: 'Writes' } as const satisfies Record<Verb, string>

/**
 * The reference the report's first line opens on, the archive holding the
 * demo's stored game and the game's place in it.
 */
const [reference = '']    = runs.plies.lines[0]!.split('  ')
const [archive = '', ply] = reference.split(':')
const shared              = demo.span.length
const stored              = demo.stored.headers
const plies               = demo.stored.moves.length
/**
 * The steps carrying one game, the demo match's stored game, from the archive
 * holding it to the report naming it, each command beside what it writes and
 * what the step before hands it.
 */
export const legs: readonly Leg[] = [
  {
    command : 'scotch fetch games',
    does    : 'Runs first, downloading each file sources.toml names.',
    stops   : [{
      drawn : { kind: 'path', text: archive },
      line  : `Holds the game as its game ${ply}, ${stored.White} against ${stored.Black} `
            + `at ${stored.Event}.`,
      name  : 'downloads/',
      verb  : 'writes'
    }]
  },
  {
    command : 'scotch index games',
    does    : 'Runs next, reading every fetched file into the index.',
    handed  : `Reads the ${archive} step 1 wrote`,
    stops   : [
      {
        drawn: {
          kind : 'row',
          rows : [
            ['White', stored.White], ['Black', stored.Black], ['Event', stored.Event],
            ['Plies', String(plies)]
          ]
        },
        line : 'Its row among every stored game.',
        name : 'index/games.parquet',
        verb : 'writes'
      },
      {
        drawn : { count: plies + 1, keys: keys.demo.slice(0, shared), kind: 'prints' },
        line  : `Its ${plies + 1} position keys, the first ${shared} lit as the ones your game shares.`,
        name  : 'index/positions.bin',
        verb  : 'writes'
      }
    ]
  },
  {
    command : 'scotch match game',
    does    : 'Runs on your game, reading the index step 2 built.',
    handed  : 'Reads the games.parquet and positions.bin step 2 wrote',
    stops   : [{
      drawn : { kind: 'report', lines: runs.plies.lines.slice(0, 2) },
      line  : 'The report’s first lines, naming the game and the run it shares.',
      name  : 'The report',
      verb  : 'prints'
    }]
  }
]
