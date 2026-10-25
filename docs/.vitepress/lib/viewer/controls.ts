import { clamp } from '@vueuse/core'

import type { Loaded } from './loaded.ts'

/**
 * One step of the Viewer, the four steps, the two the run gives, and the flip,
 * as the group it sits in and the cursor it moves to from a cursor, or none
 * where it goes nowhere.
 */
export interface Control extends Key {
  group : keyof typeof GROUPS
  to    : (loaded: Loaded, cursor: number) => number | undefined
}

/**
 * What a button of the Viewer's controls names: the keys that take it, the
 * first of them the one its cap shows, its label and its name, and the title
 * naming what it does.
 */
export interface Key {
  cap   : string
  keys  : readonly string[]
  label : string
  name  : string
  title : string
}

/**
 * The controls in the order the Viewer sets them, the four steps and then the
 * two the run the games share gives, which go nowhere where no stored game was
 * matched. Start takes Up and End takes Down beside Home and End, the sheets'
 * grid and the track's slider answering Up and Down first while focus sits in
 * them.
 */
export const CONTROLS: readonly Control[] = [
  {
    cap   : '↑',
    group : 'step',
    keys  : ['ArrowUp', 'Home'],
    label : 'Start',
    name  : 'start',
    title : 'To the starting position',
    to    : loaded => loaded.first
  },
  {
    cap   : '←',
    group : 'step',
    keys  : ['ArrowLeft'],
    label : 'Back',
    name  : 'back',
    title : 'Back one ply',
    to    : (_, cursor) => cursor - 1
  },
  {
    cap   : '→',
    group : 'step',
    keys  : ['ArrowRight'],
    label : 'Next',
    name  : 'next',
    title : 'On one ply',
    to    : (_, cursor) => cursor + 1
  },
  {
    cap   : '↓',
    group : 'step',
    keys  : ['ArrowDown', 'End'],
    label : 'End',
    name  : 'end',
    title : 'To the last position',
    to    : loaded => loaded.last
  },
  {
    cap   : 'M',
    group : 'run',
    keys  : ['m'],
    label : 'Meet',
    name  : 'meet',
    title : 'To the first position the two share',
    to    : loaded => loaded.shared?.meet
  },
  {
    cap   : 'P',
    group : 'run',
    keys  : ['p'],
    label : 'Part',
    name  : 'part',
    title : 'To the move where the two part',
    to    : loaded => loaded.partAt
  }
]
/**
 * The control turning both boards to the other side, which presses while the
 * boards face Black's, beside the key that takes it.
 */
export const FLIP: Key = {
  cap   : 'F',
  keys  : ['f'],
  label : 'Flip',
  name  : 'flip',
  title : 'Turn both boards to the other side'
}
/**
 * The two groups the controls sit in, in the order the pill sets them, each
 * beside the name a screen reader gives it.
 */
export const GROUPS = { step: 'Step', run: 'The shared run' } as const

/**
 * Finds the control a key takes, the letters in either case.
 */
export function controlOf(key: string): Control | undefined {
  return CONTROLS.find(control => control.keys.some(each => each.toLowerCase() === key.toLowerCase()))
}

/**
 * Reads whether a control goes nowhere from a cursor, either naming no cursor
 * or naming the one the Viewer already stands on.
 */
export function idle(control: Control, cursor: number, loaded: Loaded): boolean {
  const to = control.to(loaded, cursor)
  return to === undefined || clamp(to, loaded.first, loaded.last) === cursor
}
