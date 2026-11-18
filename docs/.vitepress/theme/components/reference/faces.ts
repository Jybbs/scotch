import { type Ref, type ShallowRef, type VNode, defineComponent, h, nextTick, shallowRef, watch } from 'vue'

import examples                              from '../../../lib/rendered/examples.json' with { type: 'json' }
import { useChart }                          from '../../../lib/data/chart.ts'
import { type Face, IDENTITY }               from '../../../lib/identity/tokens.ts'
import { narrowAt }                          from '../../../lib/reference/pick.ts'
import { type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { SMALL, stage }                      from './parts.ts'

/**
 * The tint behind the picked row, the rows, the face a reader looks at, and how
 * far each part has wiped in, beside the call that lights a face.
 */
interface Sheet {
  block : ShallowRef<{ height: number, top: number }>
  facts : ShallowRef<HTMLElement | null>
  look  : ShallowRef<number>
  show  : (index: number) => void
  wiped : ShallowRef<number[]>
}

/**
 * The faces in the order the sheet sets them, each beside the slot's word and
 * the strokes standing in for its text until it wipes in, as each stroke's
 * height, the height of its line, and its first line's top.
 */
const SLOTS: readonly { face: Face, name: string, strokes: readonly [string, string, string] }[] = [
  { face: 'display', name: 'Display', strokes: ['.8em', '1.2em', '.2em'] },
  { face: 'body',    name: 'Body',    strokes: ['.72em', '1.6em', '.42em'] },
  { face: 'code',    name: 'Code',    strokes: ['.78em', '1.65em', '.4em'] }
]
/**
 * The first moves of the front page's stored game, each move's number and each
 * side's move a cell of the score.
 */
const MOVES = examples.front.stored.played.slice(0, 14).flatMap(([san], index) => {
  const move = { number: false, word: san! }
  return index % 2 === 0 ? [{ number: true, word: `${index / 2 + 1}.` }, move] : [move]
})
const WIPES = [300, 1500, 2700] as const
/**
 * When the unfold lights each face in turn and then none.
 */
const LOOKS = [[4000, 0], [4700, 1], [5400, 2], [6100, -1]] as const

/**
 * Holds the sheet's state and runs the unfold on `chart`, measuring the tint
 * again each time `layout` changes.
 */
function useSheet(chart: NodeRef, layout: Ref<unknown>): Sheet {
  const block  = shallowRef({ height: 0, top: 0 })
  const facts  = shallowRef<HTMLElement | null>(null)
  const look   = shallowRef(-1)
  const picked = shallowRef(-1)
  const wiped  = shallowRef(SLOTS.map(() => 1))
  const beats  = useBeats()

  const measure = (): void => {
    const fact  = facts.value?.querySelectorAll('button')[picked.value]
    block.value = fact ? { height: fact.offsetHeight, top: fact.offsetTop } : { height: 0, top: block.value.top }
  }
  const show = (index: number): void => {
    look.value   = index
    picked.value = index
    measure()
  }
  const stand = (share: number): void => {
    show(-1)
    wiped.value = SLOTS.map(() => share)
  }

  watch(layout, () => {
    void nextTick(measure)
  })
  useUnfold(chart, beats, {
    length : 7000,
    play   : (time, done) => {
      WIPES.forEach((at, index) => {
        time.at(at, () => {
          picked.value = index
          measure()
        })
        time.tween(950, eased => {
          wiped.value = wiped.value.with(index, eased)
        }, { delay: at })
      })
      LOOKS.forEach(([at, index]) => { time.at(at, () => { show(index) }) })
      time.at(6500, done)
    },
    prime  : () => {
      stand(0)
    },
    settle : () => {
      stand(1)
    }
  })

  return { block, facts, look, show, wiped }
}

function part(state: Sheet, index: number, words: VNode): VNode {
  const { face, strokes: [stroke, row, top] } = SLOTS[index]!
  const share = state.wiped.value[index]!
  return h('span', {
    'class'     : 'relative block transition-[opacity] in-data-look:not-data-on:opacity-20',
    'data-face' : face,
    'data-on'   : state.look.value === index ? '' : undefined
  }, [
    h('span', { class: 'block', style: share < 1 ? { clipPath: `inset(-2px ${(1 - share) * 100}% -2px 0)` } : undefined }, [words]),
    share < 1
      ? h('i', {
        'aria-hidden' : 'true',
        'class'       : 'pointer-events-none absolute inset-0',
        'style'       : {
          background : `repeating-linear-gradient(var(--sc-rule) 0 ${stroke}, transparent 0 ${row})`,
          clipPath   : `inset(0 0 0 ${share * 100}%)`,
          top        : top
        }
      })
      : null
  ])
}

function score(state: Sheet): VNode {
  return h('div', {
    'aria-label' : 'A score sheet set in the three faces',
    'class'      : [
      'grid grid-cols-2 gap-x-[22px] gap-y-0 rounded-[3px] border border-rule bg-raised px-4 py-3.5',
      'in-data-narrow:grid-cols-1 in-data-narrow:gap-3 in-data-narrow:p-3'
    ],
    'data-look'  : state.look.value < 0 ? undefined : '',
    'role'       : 'img'
  }, [
    h('div', [
      part(state, 0, h('h5', {
        class: 'm-0 mb-1.5 font-display text-[1.5rem]/[1.2] font-normal! tracking-normal normal-nums'
      }, 'The Longest Run')),
      part(state, 1, h('p', { class: 'font-body text-[0.9375rem]/[1.6]! font-normal normal-nums' }, 'Two games share a run where they reach the same positions one ply after another, and the longest such run names the closest game.'))
    ]),
    part(state, 2, h('div', {
      class: 'grid grid-cols-[1.7rem_minmax(0,1fr)_minmax(0,1fr)] content-start font-code '
           + 'text-[0.78rem]/[1.65] font-medium normal-nums'
    }, MOVES.map(move => h('span', {
      'class'       : 'border-b border-b-rule/55 pl-1 data-number:pl-0 data-number:text-quiet',
      'data-number' : move.number ? '' : undefined
    }, move.word))))
  ])
}

function rows({ block, facts, look, show }: Sheet): VNode {
  return h('div', { class: 'relative grid', ref: facts }, [
    h('i', {
      'aria-hidden' : 'true',
      'class'       : 'absolute inset-x-0 top-0 h-0 bg-tint transition-[transform,height] duration-glide',
      'style'       : { height: `${block.value.height}px`, transform: `translateY(${block.value.top}px)` }
    }),
    ...SLOTS.map(({ face, name }, index) => {
      const { family, license, package: installed, stack } = IDENTITY.faces[face]
      return h('button', {
        'aria-pressed' : String(look.value === index),
        'class'        : [
          'relative z-1 grid min-w-0 grid-cols-[8.2rem_minmax(0,1fr)] gap-x-3 gap-y-px px-2 py-[7px]',
          'text-left',
          'in-data-narrow:grid-cols-1',
          index === 0 ? '' : 'border-t border-t-rule/55'
        ],
        'data-face'    : face,
        'onClick'      : () => {
          show(look.value === index ? -1 : index)
        },
        'type'         : 'button'
      }, [
        h('div', { class: 'grid' }, [h('b', {
          class : face === 'code' ? 'text-[0.84rem]/[1.25] font-normal' : 'text-[1rem]/[1.25] font-normal',
          style : { fontFamily: stack }
        }, family), h('small', { class: SMALL }, name)]),
        h('span', { class: 'font-body text-[0.8125rem]/[1.4] font-normal normal-nums' }, IDENTITY.meanings.faces[face]),
        h('code', {
          class: 'col-2 bg-transparent! p-0! font-code text-[0.625rem]/[1.4]! font-medium wrap-anywhere text-quiet! '
               + 'normal-nums in-data-narrow:col-1'
        }, `${installed} · ${license}`)
      ])
    })
  ])
}

/**
 * The faces as a score sheet set in all of them, each block of words wiping in
 * over its gray strokes, beside what each face sets and the package and license
 * it ships under, a pick lighting the part of the sheet that face sets.
 */
export const Faces = defineComponent({
  name  : 'ReferenceFaces',
  setup : () => {
    const { chart, layout } = useChart(narrowAt)
    const state             = useSheet(chart, layout)

    return () => stage(chart, layout.value.narrow, [score(state), rows(state)])
  }
})
