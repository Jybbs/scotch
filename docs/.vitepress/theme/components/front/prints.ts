import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { percent }                                     from '../../../lib/data/numbers.ts'
import { useDrive }                                    from '../../../lib/front/drive.ts'
import { type Front, type Game, SHADE, frontOf, same } from '../../../lib/front/example.ts'
import { lastOf, readingAt }                           from '../../../lib/front/plies.ts'
import { type Readout, Panel }                         from './panel.ts'

/**
 * How the fingerprints play their plies: the milliseconds between two, and the
 * beats they rest on the last.
 */
const PACE = { interval: 650, rest: 4 } as const
/**
 * The ring a lit fingerprint takes in each game's color.
 */
const RINGS = {
  stored    : 'data-on:[box-shadow:inset_0_0_0_1.5px_var(--sc-stored)]',
  submitted : 'data-on:[box-shadow:inset_0_0_0_1.5px_var(--sc-submitted)]'
} as const satisfies Record<Game, string>
/**
 * The row a track and its ties share, one column per ply.
 */
const ROW = 'grid grid-cols-[repeat(19,minmax(0,1fr))] gap-[3px] max-sm:gap-px'
/**
 * The color each game's name takes over its track.
 */
const TINTS = {
  stored    : 'text-[color-mix(in_oklab,var(--sc-stored)_60%,var(--sc-ink))]',
  submitted : 'text-[color-mix(in_oklab,var(--sc-submitted)_60%,var(--sc-ink))]'
} as const satisfies Record<Game, string>
/**
 * The mono capitals each label of the drawing is set in.
 */
const LABEL = 'font-code text-[0.65rem]/none font-semibold tracking-[0.12em] uppercase'
/**
 * The name each game's track goes by.
 */
const TRACKS = { stored: 'The stored game', submitted: 'Your game' } as const satisfies Record<Game, string>

/**
 * Draws the line naming a game's track beside a note on the drawing.
 */
function lab(game: Game, note: string): VNode {
  return h('div', { class: ['flex justify-between text-quiet', LABEL] }, [
    h('span', { 'class': TINTS[game], 'data-game': game }, TRACKS[game]),
    h('span', note)
  ])
}

/**
 * Draws one position's key as a fingerprint of its 16 hex digits, one shade
 * per digit, a press on it showing its ply.
 */
function print(at: number, front: Front, game: Game, go: (step: number) => void, ply: number): VNode {
  const key    = front.keys[game][ply]!
  const digits = [...key].map(digit =>
    h('i', { style: { opacity: String(SHADE.least + Number.parseInt(digit, 16) * SHADE.step) } }))
  return h('span', {
    'data-on'   : ply <= at ? '' : undefined,
    'data-same' : ply <= at && same(front, ply) ? '' : undefined,
    'onClick'   : () => go(ply),
    'title'     : `${TRACKS[game]}, ply ${ply}, 0x${key}`,
    'class'     : [
      'grid aspect-[1] cursor-pointer grid-cols-[repeat(4,1fr)] gap-px rounded-[3px] p-0.5 max-sm:gap-0',
      'max-sm:p-px',
      'bg-page/55 opaque:bg-page [box-shadow:inset_0_0_0_1px_var(--sc-rule)] *:rounded-[1px] *:bg-ink',
      'opacity-25 transition-[opacity,box-shadow] data-on:opacity-100',
      RINGS[game], 'data-same:[box-shadow:inset_0_0_0_2px_var(--sc-entry)]'
    ]
  }, digits)
}

/**
 * Draws the bracket spanning the run beneath the tracks once the clock passes
 * its last ply, beside the run's length.
 */
function runBar(at: number, front: Front): VNode {
  const plies             = front.keys.submitted.length
  const { length, start } = front.example.run
  const shown             = at >= lastOf(front) ? '' : undefined
  const left              = percent(start / plies, 2)
  const fade              = 'absolute opacity-0 transition-[opacity] duration-settle data-on:opacity-100'
  return h('div', { 'aria-hidden': 'true', 'class': 'relative h-5.5' }, [
    h('b', {
      'data-on' : shown,
      'style'   : { left, width: percent(length / plies, 2) },
      'class'   : [
        fade, 'top-0 h-2 rounded-b-[3px] border-[1.5px] border-t-0',
        'border-x-(--sc-entry) border-b-(--sc-entry)'
      ]
    }),
    h('span', {
      'class'   : [fade, LABEL, 'top-[11px] -translate-x-1/2 whitespace-nowrap text-ink'],
      'data-on' : shown,
      'style'   : { left: percent((start + length / 2) / plies, 2) }
    }, `The run · ${length}`)
  ])
}

/**
 * Draws the tie between the two tracks at each ply whose keys match.
 */
function ties(at: number, front: Front): VNode {
  return h('div', { 'aria-hidden': 'true', 'class': [ROW, 'h-[34px]'] }, front.keys.submitted.map((_, ply) =>
    h('i', {
      'data-on' : ply <= at && same(front, ply) ? '' : undefined,
      'class'   : [
        'h-full w-0.5 justify-self-center bg-(--sc-entry) [transform:scaleY(0)]',
        'transition-[transform] data-on:[transform:scaleY(1)]'
      ]
    })))
}

/**
 * Draws one game's track, a fingerprint per ply.
 */
function track(at: number, front: Front, game: Game, go: (step: number) => void): VNode {
  const plies = front.keys[game].map((_, ply) => print(at, front, game, go, ply))
  return h('div', { 'class': ROW, 'data-game': game }, plies)
}

/**
 * Writes what the readout names at a ply.
 */
function readoutOf(front: Front, ply: number): Readout {
  const reading = readingAt(front, ply)
  return {
    big      : String(reading.figure),
    readings : [
      ['Yours', reading.moves.submitted],
      ['Stored', reading.moves.stored],
      ['Keys', same(front, ply) ? 'Equal' : 'Differ']
    ],
    say      : reading.say,
    unit     : reading.unit
  }
}

/**
 * The Methods section's widget on the front page: each position's Zobrist key
 * in the front page's example drawn as a fingerprint of its 16 hex digits, in
 * a track per game, so the positions the two games share show the same
 * fingerprint above and below, tied together and spanned by the run.
 */
export const Prints = defineComponent({
  name: 'ScotchFrontPrints',

  setup: () => {
    const front = frontOf()
    const panel = shallowRef(null)
    const plies = front.keys.submitted.length
    const drive = useDrive(panel, { ...PACE, count: plies, settle: lastOf(front), start: 0 })
    const names = front.keys.submitted.map((_, ply) => `Ply ${ply}`)
    const label = 'Each position’s key drawn as a fingerprint for both games, the shared positions '
                + 'showing the same fingerprint above and below'

    return (): VNode => h(Panel, {
      drive   : drive,
      label   : 'Plies',
      names   : names,
      readout : readoutOf(front, drive.at.value),
      ref     : panel
    }, () => h('div', { 'aria-label': label, 'class': 'grid gap-2 py-2', 'role': 'img' }, [
      lab('submitted', 'Each key as 16 hex digits'),
      track(drive.at.value, front, 'submitted', drive.go),
      ties(drive.at.value, front),
      track(drive.at.value, front, 'stored', drive.go),
      lab('stored', `Ply 0 to ${plies - 1}`),
      runBar(drive.at.value, front)
    ]))
  }
})
