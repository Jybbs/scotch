import { type VNode, defineComponent, h } from 'vue'

import * as typing     from '../../../lib/front/typing.ts'
import runs            from '../../../lib/rendered/runs.json' with { type: 'json' }
import { Loaded }      from '../../../lib/viewer/loaded.ts'
import methods         from '../../../../pages/methods/index.md?raw'
import demo            from '../../../../public/matches/demo.json' with { type: 'json' }
import type { Match }  from '../../../lib/viewer/examples.ts'
import { Rails }       from '../overview/rails.ts'

/**
 * How far the rails have filled in: only their tracks, the shared run, or
 * whole.
 */
type Stage = 'empty' | 'run' | 'whole'

/**
 * The demo match's command, without the flag the Guide's run adds, beside the
 * report's first three lines, which name the stored game, count the run the two
 * games share, and set out where they part.
 */
const MATCH: typing.Typed = {
  command : runs['match-game'].command.replace(/ --top \d+$/u, ''),
  out     : runs['match-game'].lines.slice(0, 3)
}
/**
 * The main clause of the sentence Methods opens on saying what a match is, up
 * to the clause setting out what a run is.
 */
const SAYS = `${/A match is [^,.]+/u.exec(methods)![0]}.`
/**
 * The demo match as the Viewer loads it, which the rails draw.
 */
const loaded = new Loaded(demo as Match)

/**
 * Sets a printed line with a break opportunity after each `/`, so a path or a
 * FEN wraps between its parts rather than inside one.
 */
function breakable(line: string): (VNode | string)[] {
  return line.split(/(?<=\/)/u).flatMap((part, at) => at ? [h('wbr'), part] : [part])
}

/**
 * Draws the lines the terminal shows at `frame`: the command typed so far
 * behind its prompt, the lines printed so far, and the cursor after the
 * command while it types or at a fresh prompt once the session is done.
 */
function linesAt(done: boolean, frame: typing.Frame): VNode[] {
  const cursor = h('span', { class: 'sc-front-cursor' })
  return [
    prompt([MATCH.command.slice(0, frame.typed), frame.printed ? null : cursor]),
    ...MATCH.out.slice(0, frame.printed).map(line => h('div', { class: 'sc-front-out' }, breakable(line))),
    ...done ? [prompt([cursor])] : []
  ]
}

/**
 * Draws one line typed behind the prompt.
 */
function prompt(text: (VNode | string | null)[]): VNode {
  return h('div', { class: 'sc-front-typed' }, [
    h('span', { class: 'sc-front-prompt' }, '❯'), h('span', text)
  ])
}

/**
 * Reads how far the rails fill in while the report prints: whole until it
 * plays and once the line saying where the games part prints, the shared run
 * once the line counting it prints, and only the tracks before that.
 */
function stageOf(typed: typing.Typing): Stage {
  const frame = typed.frames[typed.at.value]!
  const shown = MATCH.out.slice(0, frame.printed)
  const said  = (word: string): boolean => shown.some(line => line.startsWith(word))
  if (!typed.playing.value || said('Parts')) return 'whole'
  return said('Shares') ? 'run' : 'empty'
}

/**
 * The front page's opening: the sentence saying what a match is, a terminal
 * typing the demo match's command and printing its report's first lines over
 * a copy of the whole session holding its height, a press of its corner
 * control replaying it, and the demo match's rails beneath, filling in as the
 * report names the run and the parting.
 */
export const Opening = defineComponent({
  name: 'ScotchFrontOpening',

  setup: () => {
    const typed = typing.useTyping([MATCH])
    const last  = typed.frames.length - 1

    return (): VNode => h('section', { class: 'sc-entry sc-front-opening' }, [
      h('p', { class: 'sc-front-says' }, SAYS),
      h('div', { class: 'sc-front-terminal is-typing', ref: typed.root }, [
        h('header', [
          h('span', { 'aria-hidden': 'true', 'class': 'sc-front-chrome' }, [
            h('i'), h('i'), h('i'), h('span', '~/scotch')
          ]),
          typed.moving.value
            ? h('button', {
              'aria-label' : 'Replay the session',
              'class'      : 'sc-front-replay',
              'disabled'   : typed.playing.value,
              'onClick'    : typed.play,
              'type'       : 'button'
            }, 'Replay')
            : null
        ]),
        h('pre', { 'aria-label': [MATCH.command, ...MATCH.out].join('. '), 'role': 'img' }, [
          h('div', { 'aria-hidden': 'true', 'class': 'sc-front-ghost' }, linesAt(true, typed.frames[last]!)),
          h('div', { class: 'sc-front-live' },
            linesAt(typed.at.value === last, typed.frames[typed.at.value]!))
        ])
      ]),
      h('div', { 'class': 'sc-front-rails', 'data-stage': stageOf(typed) }, h(Rails, { loaded }))
    ])
  }
})
