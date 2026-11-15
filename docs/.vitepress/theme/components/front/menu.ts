import type { VNode }                                                                        from 'vue'
import { defineComponent, h, nextTick, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'

import { tabbed }    from '../../../lib/data/keys.ts'
import * as studying from '../../../lib/front/studying.ts'

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
  return h('div', { class: 'sc-menu-ask' }, [
    h('div', { class: 'sc-menu-line' }, [
      h('span', { class: 'sc-front-prompt' }, '❯ '),
      ...painted('scotch '),
      h('span', { class: 'sc-menu-key' }, 'tab')
    ]),
    h('div', { 'aria-label': 'Commands', 'class': 'sc-menu-choices', 'role': 'group' },
      studying.RUNS.map((each, place) => h('button', {
        'aria-controls' : id,
        'aria-current'  : place === lit ? 'true' : undefined,
        'class'         : 'sc-menu-choice',
        'onClick'       : () => choose(place),
        'onKeydown'     : keyed,
        'tabindex'      : place === lit ? 0 : -1,
        'type'          : 'button'
      }, [
        h('span', { class: 'sc-menu-name' }, painted(each.short)),
        h('span', { class: 'sc-menu-say' }, `-- ${each.heading.toLowerCase()}`)
      ])))
  ])
}

/**
 * Draws the line a command is typed on: the prompt, the command so far in its
 * colors, and the cursor after it while it types.
 */
function commandLine(cursor: boolean, text: string, typed: number): VNode {
  return h('div', { class: 'sc-menu-line' }, [
    h('span', { class: 'sc-front-prompt' }, '❯ '),
    ...painted(text, typed),
    cursor ? h('span', { class: 'sc-front-cursor' }) : null
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
    return shown ? [h('span', { class: kind ? `sc-menu-${kind}` : undefined }, shown)] : []
  })
}

/**
 * Draws the lines of a run as far as a frame reaches: the typed command, each
 * printed line, the answering one marked, and a fresh prompt once the run has
 * printed whole.
 */
function session(run: studying.Run, frame: studying.Frame): VNode {
  return h('div', { class: ['sc-menu-lines', run.columns ? 'is-columns' : ''] }, [
    commandLine(!frame.done, run.command, frame.typed),
    ...run.lines.slice(0, frame.shown).map((line, at) =>
      h('div', { 'class': 'sc-front-out', 'data-answer': at === run.answer ? '' : undefined }, line || ' ')),
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
      return h('div', { class: 'sc-front-terminal sc-menu' }, [
        h('header', { 'aria-hidden': 'true' }, [h('i'), h('i'), h('i'), h('span', '~/scotch')]),
        ask(choose, id, keyed, lit.value),
        h('div', {
          'aria-label' : run.heading,
          'class'      : 'sc-menu-run',
          'id'         : id,
          'ref'        : 'screen',
          'role'       : 'region',
          'tabindex'   : 0
        }, session(run, term.frame.value))
      ])
    }
  }
})
