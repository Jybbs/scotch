import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { percent }                              from '../../../lib/data/numbers.ts'
import { useDrive }                             from '../../../lib/front/drive.ts'
import { type Front, type Game, frontOf, same } from '../../../lib/front/example.ts'
import { lastOf, readingAt }                    from '../../../lib/front/plies.ts'
import { type Readout, Panel }                  from './panel.ts'

/**
 * How the fingerprints play their plies: the milliseconds between two, and the
 * beats they rest on the last.
 */
const PACE = { interval: 650, rest: 4 } as const
/**
 * The opacity of a fingerprint's lightest digit and the opacity each step of a
 * digit adds, so the digit `f` draws at 0.9.
 */
const SHADE = { least: 0.08, step: 0.82 / 15 } as const
/**
 * The name each game's track goes by.
 */
const TRACKS = { stored: 'The stored game', submitted: 'Your game' } as const satisfies Record<Game, string>

/**
 * Draws one position's key as a fingerprint of its 16 hex digits, one shade
 * per digit, a press on it showing its ply.
 */
function print(at: number, front: Front, game: Game, go: (step: number) => void, ply: number): VNode {
  const key    = front.keys[game][ply]!
  const digits = [...key].map(digit =>
    h('i', { style: { opacity: String(SHADE.least + Number.parseInt(digit, 16) * SHADE.step) } }))
  return h('span', {
    'class'     : 'sc-front-print',
    'data-on'   : ply <= at ? '' : undefined,
    'data-same' : ply <= at && same(front, ply) ? '' : undefined,
    'onClick'   : () => go(ply),
    'title'     : `${TRACKS[game]}, ply ${ply}, 0x${key}`
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
  return h('div', { 'aria-hidden': 'true', 'class': 'sc-front-runbar' }, [
    h('b', { 'data-on': shown, 'style': { left, width: percent(length / plies, 2) } }),
    h('span', {
      'data-on' : shown,
      'style'   : { left: percent((start + length / 2) / plies, 2) }
    }, `The run · ${length}`)
  ])
}

/**
 * Draws the tie between the two tracks at each ply whose keys match.
 */
function ties(at: number, front: Front): VNode {
  return h('div', { 'aria-hidden': 'true', 'class': 'sc-front-ties' }, front.keys.submitted.map((_, ply) =>
    h('i', { 'data-on': ply <= at && same(front, ply) ? '' : undefined })))
}

/**
 * Draws one game's track, a fingerprint per ply.
 */
function track(at: number, front: Front, game: Game, go: (step: number) => void): VNode {
  const plies = front.keys[game].map((_, ply) => print(at, front, game, go, ply))
  return h('div', { 'class': 'sc-front-track', 'data-game': game }, plies)
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
    }, () => h('div', { 'aria-label': label, 'class': 'sc-front-prints', 'role': 'img' }, [
      h('div', { class: 'sc-front-lab' }, [h('span', { 'data-game': 'submitted' }, TRACKS.submitted),
        h('span', 'Each key as 16 hex digits')]),
      track(drive.at.value, front, 'submitted', drive.go),
      ties(drive.at.value, front),
      track(drive.at.value, front, 'stored', drive.go),
      h('div', { class: 'sc-front-lab' }, [h('span', { 'data-game': 'stored' }, TRACKS.stored),
        h('span', `Ply 0 to ${plies - 1}`)]),
      runBar(drive.at.value, front)
    ]))
  }
})
