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
 * Where each caption stands and when it shows: the shared one over the
 * boards until they part, and each game's over its own board after.
 */
const CAPTIONS = {
  both      : 'left-1/2 in-data-apart:opacity-0',
  stored    : 'left-[calc(50%+var(--sc-front-gap)+var(--sc-front-board)/2)] opacity-0 '
            + 'in-data-apart:opacity-100 in-data-apart:delay-glide',
  submitted : 'left-[calc(50%-var(--sc-front-gap)-var(--sc-front-board)/2)] opacity-0 '
            + 'in-data-apart:opacity-100 in-data-apart:delay-glide'
} as const
/**
 * Where each game's board moves once the boards part.
 */
const HALVES = {
  stored    : 'z-1 in-data-apart:translate-x-(--sc-front-gap)',
  submitted : 'in-data-apart:translate-x-[calc(-100%-var(--sc-front-gap))]'
} as const
/**
 * The box each board stands in, centered until the boards part.
 */
const HALF = 'absolute top-[30px] left-1/2 aspect-[1] w-(--sc-front-board) -translate-x-1/2 '
           + 'transition-[translate] duration-part'
/**
 * How the split plays its plies: the milliseconds between two, and the beats
 * it rests on the last.
 */
const PACE = { interval: 700, rest: 6 } as const

/**
 * Draws the caption naming one game, or both, over the boards.
 */
function caption(game: keyof typeof CAPTIONS, text: string): VNode {
  return h('span', {
    'data-game' : game,
    'class'     : [
      'absolute top-0 -translate-x-1/2 whitespace-nowrap transition-[opacity] text-ink',
      'font-code text-[0.65rem]/none font-semibold tracking-[0.14em] uppercase', CAPTIONS[game]
    ]
  }, text)
}

/**
 * Draws the split's two boards at the position the run opens on, the stored
 * game's under a cover naming who moves after the run's last position.
 */
function halvesOf(front: Front, halves: Halves): VNode[] {
  const { start } = front.example.run
  const mover     = (lastOf(front) + 1) % 2 ? 'White' : 'Black'
  return [
    h('div', { 'class': [HALF, HALVES.submitted], 'data-game': 'submitted' }, h(Half, {
      game     : 'submitted',
      label    : 'Your game’s board',
      position : front.example.submitted[start]!,
      ref      : halves.submitted
    })),
    h('div', { 'class': [HALF, HALVES.stored], 'data-game': 'stored' }, [
      h(Half, {
        game     : 'stored',
        label    : 'The stored game’s board',
        position : front.example.stored[start]!,
        ref      : halves.stored
      }),
      h('div', {
        'aria-hidden' : 'true',
        'data-cover'  : '',
        'class'       : [
          'pointer-events-none absolute inset-0 z-2 grid place-content-center justify-items-center gap-1.5',
          'rounded-[3px] bg-raised/62 [backdrop-filter:blur(2.5px)] opaque:bg-raised',
          'opaque:[backdrop-filter:none]',
          'opacity-0 transition-[opacity] duration-settle in-data-apart:opacity-100',
          'in-data-apart:delay-settle'
        ]
      }, [
        h('b', { class: 'font-display text-[4rem]/none font-normal text-stored max-sm:text-[2.6rem]' }, '?'),
        h('span', {
          class: [
            'rounded-[3px] bg-raised px-[7px] py-1 [box-shadow:0_0_0_1px_var(--sc-stored)]',
            'font-code text-[0.65rem]/[1.2] font-semibold tracking-[0.14em] text-ink uppercase'
          ]
        }, `${mover} to move`)
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
                + 'The link scotch match game --link prints opens both games in the Viewer.'
  return {
    big      : String(reading.figure),
    readings : [
      ['Your move', reading.moves.submitted],
      ['Stored move', met ? 'Its own order' : reading.moves.stored]
    ],
    say      : ply > last ? parted : met ? reading.say : 'Both games, one position.',
    unit     : `${reading.figure === 1 ? 'position' : 'positions'} shared`
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
        'data-apart' : ply > last ? '' : undefined,
        'data-split' : '',
        'role'       : 'img',
        'class'      : [
          '[--sc-front-board:min(236px,47%)] [--sc-front-gap:10px] max-sm:[--sc-front-board:47%]',
          'max-sm:[--sc-front-gap:6px]',
          'relative aspect-[100/52] max-h-[300px] w-full max-sm:aspect-[100/60]'
        ]
      }, [
        caption('both', 'Both games, one position'),
        caption('submitted', 'Your game'),
        caption('stored', 'The stored game'),
        ...halvesOf(front, halves)
      ]))
    }
  }
})
