import { type Ref, type ShallowRef, type VNode, defineComponent, h, nextTick, shallowRef, watch } from 'vue'

import examples                              from '../../../lib/rendered/examples.json' with { type: 'json' }
import { useChart }                          from '../../../lib/data/chart.ts'
import { type Face, IDENTITY }               from '../../../lib/identity/tokens.ts'
import { narrowAt }                          from '../../../lib/reference/pick.ts'
import { type NodeRef, useBeats, useUnfold } from '../../../lib/reference/timeline.ts'
import { stage }                             from './parts.ts'

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
    'class'     : 'sc-ref-part',
    'data-face' : face,
    'data-on'   : state.look.value === index ? '' : undefined
  }, [
    h('span', { class: 'sc-ref-words', style: share < 1 ? { clipPath: `inset(-2px ${(1 - share) * 100}% -2px 0)` } : undefined }, [words]),
    share < 1
      ? h('i', {
        'aria-hidden' : 'true',
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
    'class'      : 'sc-ref-score',
    'data-look'  : state.look.value < 0 ? undefined : '',
    'role'       : 'img'
  }, [
    h('div', [
      part(state, 0, h('h5', 'The Longest Run')),
      part(state, 1, h('p', 'Two games share a run where they reach the same positions one ply after another, and the longest such run names the closest game.'))
    ]),
    part(state, 2, h('div', { class: 'sc-ref-moves' }, MOVES.map(move =>
      h('span', { class: move.number ? 'sc-ref-number' : undefined }, move.word))))
  ])
}

function rows({ block, facts, look, show }: Sheet): VNode {
  return h('div', { class: 'sc-ref-facts', ref: facts }, [
    h('i', {
      'aria-hidden' : 'true',
      'class'       : 'sc-ref-block',
      'style'       : { height: `${block.value.height}px`, transform: `translateY(${block.value.top}px)` }
    }),
    ...SLOTS.map(({ face, name }, index) => {
      const { family, license, package: installed, stack } = IDENTITY.faces[face]
      return h('button', {
        'aria-pressed' : String(look.value === index),
        'class'        : 'sc-ref-fact',
        'data-face'    : face,
        'onClick'      : () => {
          show(look.value === index ? -1 : index)
        },
        'type'         : 'button'
      }, [
        h('div', [h('b', { style: { fontFamily: stack } }, family), h('small', name)]),
        h('span', IDENTITY.meanings.faces[face]),
        h('code', `${installed} · ${license}`)
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
