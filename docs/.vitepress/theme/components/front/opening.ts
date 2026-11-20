import { type VNode, defineComponent, h } from 'vue'

import * as typing     from '../../../lib/front/typing.ts'
import { ENTRY }       from '../../../lib/markdown/front.ts'
import runs            from '../../../lib/rendered/runs.json' with { type: 'json' }
import { Loaded }      from '../../../lib/viewer/loaded.ts'
import methods         from '../../../../pages/methods/index.md?raw'
import demo            from '../../../../public/matches/demo.json' with { type: 'json' }
import type { Match }  from '../../../lib/viewer/examples.ts'
import { Rails }       from '../overview/rails.ts'
import * as terminal   from './terminal.ts'

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
 * The replay button in the terminal's title bar, hidden while the session
 * plays.
 */
const REPLAY = [
  'cursor-pointer rounded-[999px] border border-[color-mix(in_oklab,var(--sc-ground)_40%,var(--sc-dark))]',
  'bg-transparent px-2.5 py-0.5 font-code text-xs/[18px] font-medium text-ground disabled:invisible',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground'
]
/**
 * The sentence the opening entry leads with, in the display face.
 */
const SAID = [
  'max-w-[54ch] font-display text-[length:clamp(1.375rem,1.2rem+1vw,1.75rem)]/[1.3]! font-normal',
  'text-pretty text-ink'
]
/**
 * The main clause of the sentence Methods opens on saying what a match is, up
 * to the clause setting out what a run is.
 */
const SAYS = `${/A match is [^,.]+/u.exec(methods)![0]}.`
/**
 * The rails beneath the terminal, each stage of the session lighting more of
 * them: the tracks alone, then the shared run, then the whole.
 */
const STAGED = [
  '[&_figure]:m-0 [&_:is(rect[data-game],line)]:transition-[opacity]',
  '[&_:is(rect[data-game],line)]:duration-glide',
  'data-[stage=empty]:[&_rect[data-game]]:opacity-12 data-[stage=empty]:[&_line]:opacity-0',
  'data-[stage=run]:[&_rect[data-game]:not([data-game=both])]:opacity-12 data-[stage=run]:[&_line]:opacity-0'
]
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
  const cursor = terminal.cursor()
  return [
    prompt([MATCH.command.slice(0, frame.typed), frame.printed ? null : cursor]),
    ...MATCH.out
      .slice(0, frame.printed)
      .map(line => h('div', { 'class': terminal.OUT, 'data-out': '' }, breakable(line))),
    ...done ? [prompt([cursor])] : []
  ]
}

/**
 * Draws one line typed behind the prompt.
 */
function prompt(text: (VNode | string | null)[]): VNode {
  return h('div', { class: 'grid grid-cols-[2ch_minmax(0,1fr)]' }, [terminal.prompt('❯'), h('span', text)])
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

    return (): VNode => h('section', { 'class': [ENTRY, 'gap-8'], 'data-entry': '' }, [
      h('p', {
        'data-says' : '',
        'class'     : SAID
      }, SAYS),
      h('div', { class: [terminal.SCREEN, 'h-auto grid-rows-[30px_1fr]'], ref: typed.root }, [
        terminal.bar([
          h('span', { class: 'mx-auto flex items-center gap-[7px]' }, terminal.lights()),
          typed.moving.value
            ? h('button', {
              'aria-label' : 'Replay the session',
              'disabled'   : typed.playing.value,
              'onClick'    : typed.play,
              'class'      : REPLAY,
              'type'       : 'button'
            }, 'Replay')
            : null
        ], false, 'justify-between'),
        h('pre', {
          'aria-label' : [MATCH.command, ...MATCH.out].join('. '),
          'class'      : [terminal.PRINTED, 'grid content-start wrap-break-word'],
          'role'       : 'img'
        }, [
          h('div', { 'aria-hidden': 'true', 'class': 'invisible col-start-1 row-start-1' },
            linesAt(true, typed.frames[last]!)),
          h('div', { class: 'col-start-1 row-start-1' },
            linesAt(typed.at.value === last, typed.frames[typed.at.value]!))
        ])
      ]),
      h('div', {
        'data-stage' : stageOf(typed),
        'class'      : STAGED
      }, h(Rails, { loaded }))
    ])
  }
})
