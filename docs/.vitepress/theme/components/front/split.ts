import { type ShallowRef, type VNode, defineComponent, h, onMounted, shallowRef, watch } from 'vue'

import { useDrive }                    from '../../../lib/front/drive.ts'
import { type Front, frontOf, moveAt } from '../../../lib/front/example.ts'
import { lastOf, readingAt }           from '../../../lib/front/plies.ts'
import { type How, howOf }             from '../../../lib/methods/motion.ts'
import { useMotion }                   from '../../../lib/motion/control.ts'
import { Half, type Shown }            from './half.ts'
import { type Readout, Panel }         from './panel.ts'

/**
 * The split's two boards, each read once it mounts.
 */
type Halves = Record<'stored' | 'submitted', ShallowRef<Shown | null>>

/**
 * How the split plays its plies: the milliseconds between two, and the beats
 * it rests on the last.
 */
const PACE = { interval: 700, rest: 6 } as const

/**
 * Draws the split's two boards at the position the run opens on, the stored
 * game's under a cover naming who moves after the run's last position.
 */
function halvesOf(front: Front, halves: Halves): VNode[] {
  const { start } = front.example.run
  const mover     = (lastOf(front) + 1) % 2 ? 'White' : 'Black'
  return [
    h('div', { 'class': 'sc-front-half', 'data-game': 'submitted' }, h(Half, {
      game     : 'submitted',
      label    : 'Your game’s board',
      position : front.example.submitted[start]!,
      ref      : halves.submitted
    })),
    h('div', { 'class': 'sc-front-half', 'data-game': 'stored' }, [
      h(Half, {
        game     : 'stored',
        label    : 'The stored game’s board',
        position : front.example.stored[start]!,
        ref      : halves.stored
      }),
      h('div', { 'aria-hidden': 'true', 'class': 'sc-front-cover' }, [
        h('b', '?'),
        h('span', `${mover} to move`)
      ])
    ])
  ]
}

/**
 * Writes the split's label and the name of each of its steps, the step past
 * the run named for the parting.
 */
function labelsOf(front: Front, steps: number): { label: string, names: string[] } {
  const { length, start } = front.example.run
  const parting           = moveAt(front, 'submitted', lastOf(front) + 1)
  return {
    label : `One board while the games share ${length} positions, split in two `
          + `at your ${parting}, the stored game’s move there hidden`,
    names : Array.from({ length: steps }, (_, step) =>
      start + step === lastOf(front) + 1 ? 'The parting' : moveAt(front, 'submitted', start + step))
  }
}

/**
 * Writes what the readout names at a ply, the stored game's move past the run
 * kept back for the Viewer.
 */
function readoutOf(front: Front, ply: number): Readout {
  const last    = lastOf(front)
  const met     = ply === front.example.run.start
  const reading = readingAt(front, ply)
  const parted  = `Your game parted at ${moveAt(front, 'submitted', last + 1)}. `
                + 'How the stored game went on waits in the Viewer.'
  return {
    big      : String(reading.figure),
    readings : [
      ['Your move', reading.moves.submitted],
      ['Stored move', met ? 'Its own order' : reading.moves.stored]
    ],
    say      : `${reading.figure === 1 ? 'position' : 'positions'} shared. `
             + (ply > last ? parted : met ? reading.say : 'Both games, one position.')
  }
}

/**
 * The Viewer section's widget on the front page: the run the front page's
 * example shares played on what reads as one board, the two games' boards laid
 * exactly over each other while their positions match, then split in two where
 * the games part, the reader's board sliding aside and playing on while the
 * stored game's stays at the last shared position under a cover naming who
 * moves next, so the stored game's moves past the run stay for the Viewer.
 */
export const Split = defineComponent({
  name: 'ScotchFrontSplit',

  setup: () => {
    const front            = frontOf()
    const { start }        = front.example.run
    const last             = lastOf(front)
    const steps            = front.example.submitted.length - start
    const panel            = shallowRef(null)
    const drive            = useDrive(panel, { ...PACE, count: steps, settle: steps - 1, start: 0 })
    const { moving }       = useMotion()
    const { label, names } = labelsOf(front, steps)
    const halves: Halves   = { stored: shallowRef(null), submitted: shallowRef(null) }
    const place            = (to: number, how?: How): void => {
      halves.submitted.value?.show(front.example.submitted[start + to]!, how)
      halves.stored.value?.show(front.example.stored[Math.min(start + to, last)]!, how)
    }

    onMounted(() => {
      place(drive.at.value)
    })
    watch(drive.at, (to, from) => {
      place(to, howOf(from, !moving.value, to))
    })

    return (): VNode => {
      const ply     = start + drive.at.value
      const readout = readoutOf(front, ply)
      return h(Panel, { drive, label: 'Plies', names, readout, ref: panel }, () => h('div', {
        'aria-label' : label,
        'class'      : 'sc-front-split',
        'data-apart' : ply > last ? '' : undefined,
        'role'       : 'img'
      }, [
        h('span', { 'class': 'sc-front-caption', 'data-game': 'both' }, 'Both games, one position'),
        h('span', { 'class': 'sc-front-caption', 'data-game': 'submitted' }, 'Your game'),
        h('span', { 'class': 'sc-front-caption', 'data-game': 'stored' }, 'The stored game'),
        ...halvesOf(front, halves)
      ]))
    }
  }
})
