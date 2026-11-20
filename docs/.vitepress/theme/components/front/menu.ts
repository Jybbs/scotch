import type { VNode }                                                                        from 'vue'
import { defineComponent, h, nextTick, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'

import { tabbed }    from '../../../lib/data/keys.ts'
import * as studying from '../../../lib/front/studying.ts'
import * as terminal from './terminal.ts'

/**
 * The color each kind of word in a command is set in, darkened on the row the
 * menu has chosen.
 */
const PAINT = {
  arg     : '',
  flag    : 'text-warning '
          + 'in-aria-[current=true]:text-[color-mix(in_oklab,var(--sc-warning)_50%,var(--sc-dark))]',
  program : 'text-light',
  sub     : 'text-series-1 '
          + 'in-aria-[current=true]:text-[color-mix(in_oklab,var(--sc-series-1)_60%,var(--sc-dark))]'
} as const satisfies Record<studying.Kind, string>
/**
 * A command in the completion menu, set apart from the rest while it is the
 * menu's stop, the shell's own marker before it.
 */
const CHOICE = [
  'group relative col-span-full grid cursor-pointer grid-cols-subgrid gap-x-[2ch] rounded-[3px] border-0',
  'bg-transparent px-2 py-px text-left text-[0.75rem] transition-[background]',
  'text-[color-mix(in_oklab,var(--sc-ground)_86%,var(--sc-dark))] focus-visible:outline-1',
  'focus-visible:-outline-offset-1 focus-visible:outline-series-4 aria-[current=true]:bg-ground',
  'aria-[current=true]:text-dark aria-[current=true]:before:absolute aria-[current=true]:before:-left-[2ch]',
  "aria-[current=true]:before:content-['❯'] aria-[current=true]:before:font-bold",
  'aria-[current=true]:before:text-series-4'
]
/**
 * The key a completion menu opens on, drawn as a keycap after the command.
 */
const KEY = [
  'ml-1 rounded-[3px] border border-[color-mix(in_oklab,var(--sc-ground)_30%,var(--sc-dark))] px-[5px]',
  'align-[1px] text-[0.6rem] tracking-[0.1em] text-[color-mix(in_oklab,var(--sc-ground)_70%,var(--sc-dark))]',
  'uppercase'
]
/**
 * The section a command answers, set beside it and reversed with it once it
 * is the menu's stop.
 */
const NOTE = [
  'text-[color-mix(in_oklab,var(--sc-ground)_64%,var(--sc-dark))]',
  'group-hover:text-[color-mix(in_oklab,var(--sc-ground)_86%,var(--sc-dark))]',
  'group-aria-[current=true]:text-[color-mix(in_oklab,var(--sc-dark)_72%,var(--sc-ground))]'
]
/**
 * The code face the menu and the run beneath it are set in.
 */
const TYPED = 'font-code text-[0.8125rem]/[1.7] font-normal'
/**
 * The screen beneath the menu a run types into, ten lines tall and twelve
 * where the terminal is wide, scrolling inside itself.
 */
const RUN = [
  TYPED, 'h-[calc(10lh+30px)] min-w-0 overflow-auto overscroll-contain px-4 pt-3.5 pb-4',
  '@min-[36rem]:h-[calc(12lh+30px)] [scrollbar-width:thin]',
  '[border-top:1px_dashed_color-mix(in_oklab,var(--sc-ground)_22%,var(--sc-dark))]',
  '[scrollbar-color:color-mix(in_oklab,var(--sc-ground)_30%,var(--sc-dark))_transparent]',
  'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-series-4'
]

/**
 * Draws the prompt the completion menu opens under and the menu itself, each
 * command beside the section it answers, the one at `lit` the menu's stop for
 * the keyboard.
 */
function ask(
  choose : (place: number) => void,
  id     : string,
  keyed  : (event: KeyboardEvent) => void,
  lit    : number
): VNode {
  return h('div', { class: ['grid gap-2 px-4 pt-3.5 pb-3', TYPED] }, [
    h('div', { class: 'wrap-anywhere' }, [
      terminal.prompt('❯ ', true),
      ...painted('scotch '),
      h('span', { class: KEY }, 'tab')
    ]),
    h('div', {
      'aria-label' : 'Commands',
      'class'      : 'ml-[2ch] grid grid-cols-[minmax(0,1fr)] '
                   + '@min-[36rem]:grid-cols-[max-content_minmax(0,1fr)]',
      'role'       : 'group'
    }, studying.RUNS.map((each, place) => h('button', {
      'aria-controls' : id,
      'aria-current'  : place === lit ? 'true' : undefined,
      'onClick'       : () => choose(place),
      'onKeydown'     : keyed,
      'tabindex'      : place === lit ? 0 : -1,
      'type'          : 'button',
      'class'         : CHOICE
    }, [
      h('span', painted(each.short)),
      h('span', { class: NOTE }, `-- ${each.heading.toLowerCase()}`)
    ])))
  ])
}

/**
 * Draws the line a command is typed on: the prompt, the command so far in its
 * colors, and the cursor after it while it types.
 */
function commandLine(cursor: boolean, text: string, typed: number): VNode {
  return h('div', { class: 'wrap-anywhere' }, [
    terminal.prompt('❯ ', true),
    ...painted(text, typed),
    cursor ? terminal.cursor() : null
  ])
}

/**
 * Sets the first `typed` characters of a command in the colors of each word's
 * kind, as a shell's syntax highlighting sets the line being typed.
 */
function painted(text: string, typed = text.length): VNode[] {
  let left = typed
  return studying.wordsOf(text).flatMap(([word, kind]) => {
    const shown = word.slice(0, Math.max(left, 0))
    left -= word.length
    if (!shown) return []
    return [h('span', {
      'class'     : kind ? PAINT[kind] || undefined : undefined,
      'data-kind' : kind ?? undefined
    }, shown)]
  })
}

/**
 * Draws the lines of a run as far as a frame reaches: the typed command, each
 * printed line, the answering one marked, and a fresh prompt once the run has
 * printed whole.
 */
function session(run: studying.Run, frame: studying.Frame): VNode {
  return h('div', {
    'data-columns' : run.columns ? '' : undefined,
    'class'        : [
      '[font-variant-ligatures:none]',
      run.columns ? 'min-w-max whitespace-pre wrap-normal' : 'min-w-0 whitespace-pre-wrap wrap-anywhere'
    ]
  }, [
    commandLine(!frame.done, run.command, frame.typed),
    ...run.lines.slice(0, frame.shown).map((line, at) => h('div', {
      'data-answer' : at === run.answer ? '' : undefined,
      'data-out'    : '',
      'class'       : [
        terminal.OUT, 'data-answer:-ml-4 data-answer:border-l-3 data-answer:border-l-series-4',
        'data-answer:pl-[calc(16px+2ch-3px)] data-answer:text-ground',
        'data-answer:bg-[color-mix(in_oklab,var(--sc-ground)_7%,var(--sc-dark))]'
      ]
    }, line || ' ')),
    frame.shown === run.lines.length ? commandLine(true, '', 0) : null
  ])
}

/**
 * The runs of Studying a Match as the shell's completion menu under one
 * prompt, each command beside the section it answers, a press typing that
 * command into the screen below the menu and its output line by line. The
 * screen holds one height at each width whichever command runs, and keeps its
 * last line in view as the run types, so a run longer than the screen scrolls
 * up through it.
 */
export const Menu = defineComponent({
  name: 'ScotchFrontMenu',

  setup: () => {
    const id     = useId()
    const term   = studying.useConsole()
    const lit    = shallowRef(0)
    const screen = useTemplateRef<HTMLElement>('screen')
    const toEnd  = (): void => {
      screen.value?.scrollTo({ top: screen.value.scrollHeight })
    }
    const choose = (place: number): void => {
      lit.value = place
      term.pick(place)
      screen.value?.scrollTo({ left: 0 })
      void nextTick(toEnd)
    }
    const keyed = (event: KeyboardEvent): void => {
      const to = tabbed(lit.value, event.key, studying.RUNS.length, 'y')
      if (to === undefined) return
      event.preventDefault()
      lit.value = to
      const row = (event.currentTarget as HTMLElement).parentElement!.children[to]
      if (row instanceof HTMLElement) row.focus()
    }

    onMounted(toEnd)
    watch(term.frame, toEnd, { flush: 'post' })

    return (): VNode => {
      const run = studying.RUNS[term.picked.value]!
      return h('div', {
        class: [
          terminal.SCREEN, '@container h-auto grid-rows-[30px_auto_auto] *:min-w-0',
          '[&_button]:[font-variant-ligatures:none]'
        ]
      }, [
        terminal.bar(terminal.lights()),
        ask(choose, id, keyed, lit.value),
        h('div', {
          'aria-label' : run.heading,
          'class'      : RUN,
          'id'         : id,
          'ref'        : 'screen',
          'role'       : 'region',
          'tabindex'   : 0
        }, session(run, term.frame.value))
      ])
    }
  }
})
