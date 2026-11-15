import { useIntervalFn } from '@vueuse/core'
import { type ComputedRef, type ShallowRef, computed, shallowRef, watch } from 'vue'

import page          from '../../../pages/guide/studying.md?raw'
import runs          from '../rendered/runs.json' with { type: 'json' }
import { useMotion } from '../motion/control.ts'
import { beatsOf }   from './session.ts'

/**
 * The console playing one run: the frame it stands on, the run it shows, and
 * the call typing another.
 */
export interface Console {
  frame  : ComputedRef<Frame>
  pick   : (run: number) => void
  picked : ShallowRef<number>
}

/**
 * One frame of the console: how many of the command's characters are typed,
 * whether Enter has been pressed, and how many of the printed lines show.
 */
export interface Frame {
  done  : boolean
  shown : number
  typed : number
}

/**
 * The kind each word of a command is set in: the program, the subcommand
 * words straight after it, an option with any number it takes, and every
 * other argument.
 */
export type Kind = 'arg' | 'flag' | 'program' | 'sub'

/**
 * One example run of Studying a Match: the heading of its section, the command
 * it runs, the short name the menu gives it, the lines it prints, the line
 * carrying its answer, and whether its output sets its figures in columns,
 * which hold their places unwrapped.
 */
export interface Run {
  answer  : number
  columns : boolean
  command : string
  heading : string
  lines   : readonly string[]
  short   : string
}

/**
 * The line of each run a reader looks for first, counted from the end where
 * negative, and whether its output sets its figures in columns, in the order
 * Studying a Match sets out the runs.
 */
const SHOWN = {
  'plies'         : { answer: 3, columns: false },
  'match-game'    : { answer: -3, columns: false },
  'match-games'   : { answer: 0, columns: false },
  'show-game'     : { answer: -1, columns: false },
  'show-position' : { answer: 0, columns: true },
  'show-store'    : { answer: 1, columns: false }
} as const satisfies Partial<Record<keyof typeof runs, { answer: number, columns: boolean }>>
/**
 * The milliseconds between two frames.
 */
const PACE = 55
/**
 * Each run of Studying a Match, its heading the one its section of the page
 * opens on and its command and lines the ones `docs:render` prints there.
 */
export const RUNS: readonly Run[] = Object.entries(SHOWN).map(([name, { answer, columns }]) => {
  const { command, lines } = runs[name as keyof typeof SHOWN]
  const before             = page.slice(0, page.indexOf(`<!-- run-${name} -->`))
  const typed              = command.replace(' docs/public/games/', ' ')
  return {
    answer  : answer < 0 ? lines.length + answer : answer,
    columns : columns,
    command : typed,
    heading : [...before.matchAll(/^## (.+)$/gmu)].at(-1)![1]!,
    lines   : lines,
    short   : typed
      .replace(/^scotch /u, '')
      .replace(' demo.pgn', '')
      .replace(/^(show (?:game|position)) .*/u, '$1')
  }
})
/**
 * The frames the console plays for each run.
 */
const frames = RUNS.map(run => framesOf(run))

/**
 * Lists the frames the console plays for a run: the command typed through the
 * front page's own beats, Enter, then each printed line in turn.
 */
export function framesOf(run: Run): Frame[] {
  const beats = beatsOf([{ command: run.command, figure: '', out: run.lines, unit: '', verb: '' }])
  return [
    ...beats.map(({ done, typed }) => ({ done, shown: 0, typed })),
    ...run.lines.map((_, at) => ({ done: true, shown: at + 1, typed: run.command.length }))
  ]
}

/**
 * Holds which run the console shows and the frame it stands on. A pick
 * restarts the typing from the first frame, cutting short any run still
 * typing, and prints its run whole at once while the site's drawings hold
 * still. The first run starts printed whole, so the console reads before any
 * pick.
 */
export function useConsole(pace = PACE): Console {
  const { moving } = useMotion()
  const picked     = shallowRef(0)
  const at         = shallowRef(frames[0]!.length - 1)
  const timer      = useIntervalFn(() => {
    if (at.value < frames[picked.value]!.length - 1) at.value += 1
    else timer.pause()
  }, pace, { immediate: false })
  const finish = (): void => {
    timer.pause()
    at.value = frames[picked.value]!.length - 1
  }

  watch(moving, now => {
    if (!now) finish()
  })

  return {
    frame : computed(() => frames[picked.value]![at.value]!),
    pick  : (run: number): void => {
      picked.value = run
      if (!moving.value) return finish()
      at.value = 0
      timer.resume()
    },
    picked
  }
}

/**
 * Splits a command into its words and the spaces between them, each word
 * marked with its kind, the subcommand running from the start or after the
 * program until the first word that is not a lowercase name.
 */
export function wordsOf(text: string): [string, Kind | null][] {
  let sub   = true
  let after = false
  return text.split(/( +)/u).map((word): [string, Kind | null] => {
    if (word.trim() === '') return [word, null]
    const flag      = word.startsWith('--') || after && /^\d+$/u.test(word)
    const kind: Kind = word === 'scotch'
      ? 'program'
      : flag ? 'flag' : sub && /^[a-z]+$/u.test(word) ? 'sub' : 'arg'
    if (kind !== 'program' && kind !== 'sub') sub = false
    after = word.startsWith('--')
    return [word, kind]
  })
}
