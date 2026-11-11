import { type VNode, defineComponent, h, shallowRef } from 'vue'

import { useDrive }            from '../../../lib/front/drive.ts'
import { frontOf }             from '../../../lib/front/example.ts'
import * as session            from '../../../lib/front/session.ts'
import { type Readout, Panel } from './panel.ts'

/**
 * How the session plays its beats: the milliseconds between two, and the beats
 * it rests on the last.
 */
const PACE = { interval: 110, rest: 26 } as const
/**
 * The numeral naming each command, in the order the session runs them.
 */
const NUMERALS = ['I', 'II', 'III'] as const

/**
 * Draws the lines the terminal shows at a beat: each command typed so far
 * behind its prompt, the cursor after the one being typed, and the lines each
 * finished command printed, a prompt waiting with the cursor after the last.
 */
function lines(beat: session.Beat, commands: readonly session.Command[]): VNode[] {
  const cursor = h('span', { class: 'sc-front-cursor' })
  const shown  = [] as VNode[]
  for (const [step, each] of commands.slice(0, beat.step + 1).entries()) {
    const done  = step < beat.step || beat.done
    const typed = step < beat.step ? each.command : each.command.slice(0, beat.typed)
    shown.push(h('div', [h('span', { class: 'sc-front-prompt' }, '❯ '), typed, done ? null : cursor]))
    if (done) shown.push(...each.out.map(line => h('div', { class: 'sc-front-out' }, line)))
  }
  if (beat.done && beat.step === commands.length - 1) {
    shown.push(h('div', [h('span', { class: 'sc-front-prompt' }, '❯ '), cursor]))
  }
  return shown
}

/**
 * Writes what the readout names at a beat.
 */
function readoutOf(beat: session.Beat, commands: readonly session.Command[]): Readout {
  const each = commands[beat.step]!
  return {
    big      : beat.done ? each.figure : '·',
    readings : commands.map((command, step) =>
      [command.verb, step < beat.step || step === beat.step && beat.done ? command.figure : '·']),
    say      : `${each.unit}, step ${NUMERALS[beat.step]} of ${NUMERALS.at(-1)}, from ${each.command}`
  }
}

/**
 * The Guide section's widget on the front page: a terminal typing the three
 * commands a reader runs from a fresh clone and printing what each leaves, the
 * match naming the front page's example, the clock line walking the beats.
 */
export const Session = defineComponent({
  name: 'ScotchFrontSession',

  setup: () => {
    const commands = session.commandsOf(frontOf())
    const beats    = session.beatsOf(commands)
    const panel    = shallowRef(null)
    const last     = beats.length - 1
    const drive    = useDrive(panel, { ...PACE, count: beats.length, settle: last, start: 0 })
    const names    = beats.map(beat => `${NUMERALS[beat.step]} · ${commands[beat.step]!.verb}`)
    const label    = commands.map(each => `${each.command}: ${each.out.join(', ')}`).join('. ')

    return (): VNode => {
      const beat    = beats[drive.at.value]!
      const readout = readoutOf(beat, commands)
      return h(Panel, { drive, label: 'The session', names, readout, ref: panel }, () =>
        h('div', { class: 'sc-front-terminal' }, [
          h('header', { 'aria-hidden': 'true' }, [h('i'), h('i'), h('i'), h('span', '~/scotch')]),
          h('pre', { 'aria-label': label, 'role': 'img' }, lines(beat, commands))
        ]))
    }
  }
})
