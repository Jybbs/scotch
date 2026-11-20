import { type VNode, h } from 'vue'

import * as commands from '../../../lib/data/commands.ts'

/**
 * The handlers a header or a square takes so a pointer or the focus resting
 * on it aims the grid at `to`.
 */
export type Aiming = (to: commands.Aim) => Record<string, unknown>

/**
 * What the rows of one verb are drawn from: the aim, the handlers that move it,
 * and whether the picked tab shows the verb, picked alone or among them all.
 */
interface Verbed {
  aim    : commands.Aim
  aimAt  : Aiming
  shown  : boolean
  single : boolean
}

/**
 * The code face every name in the grid is set in, clear of the page's chip.
 */
export const CODE = 'bg-transparent! p-0! font-code! not-italic normal-nums'
/**
 * The verb's dot beside its name, in its hue.
 */
export const DOT = 'inline-block size-2 rounded-full bg-(--sc-commands-hue)'
/**
 * The colors a cell of the grid fills with: clear in a gap, beneath a verb, and
 * on a row the picked tab leaves out, the folder's ground over the files, the
 * verb's hue on its rows, stronger on the rows of the picked verb, the tint on
 * an aimed row or file, and the link's color on an aimed square.
 */
export const FILLS = {
  aimed  : 'bg-(--sc-data-tint)!',
  clear  : 'bg-transparent!',
  ground : 'bg-raised!',
  hue    : 'bg-[color-mix(in_oklab,var(--sc-commands-hue)_7%,var(--sc-data-page))]!',
  picked : 'bg-[color-mix(in_oklab,var(--sc-commands-hue)_16%,var(--sc-data-page))]!',
  square : 'bg-[color-mix(in_oklab,var(--sc-data-link)_22%,var(--sc-data-page))]!'
}
/**
 * The ring a cell takes while it holds the focus.
 */
export const FOCUS = 'focus-visible:outline-2 focus-visible:-outline-offset-2 '
                   + 'focus-visible:outline-(--sc-data-link)'
/**
 * A cell clear of the page's table rules, its type in the body weight.
 */
export const FRAME = '[border:0]! font-normal!'
/**
 * The mark of what a command does to a file, a square ruled in its color.
 */
const MARK = 'box-border inline-block flex-none rounded-[2px] border-[1.5px] transition-opacity '
           + 'duration-fade ease-glide'
/**
 * The colors of a mark, ruled and filled for a write and hollow for a read, in
 * the link's color in the key and larger in the verb's hue in the grid.
 */
const MARKS = {
  cell : {
    reads  : 'size-3.5 align-middle border-(--sc-commands-hue) bg-(--sc-data-page)',
    writes : 'size-3.5 align-middle border-(--sc-commands-hue) bg-(--sc-commands-hue)'
  },
  key  : {
    reads  : 'size-2.5 border-(--sc-data-link) bg-(--sc-data-page)',
    writes : 'size-2.5 border-(--sc-data-link) bg-(--sc-data-link)'
  }
} satisfies Record<string, Record<commands.Kind, string>>
/**
 * The noun ending a command's path, set one line under its verb in a narrow
 * grid.
 */
const NOUN = 'font-bold whitespace-nowrap @max-[36rem]:block'
/**
 * A row clear of the page's table rules and its stripes.
 */
export const ROW = '[border:0]! bg-transparent!'
/**
 * The fade a cell's fill takes as the aim moves.
 */
export const SHIFT = 'cursor-default transition-[background-color] duration-fade ease-glide'
/**
 * What a square holds, kept out of sight for a screen reader.
 */
const SPOKEN = 'absolute h-px w-px overflow-hidden [clip-path:inset(50%)] whitespace-nowrap'
/**
 * The parts of a command's path before its noun, each followed by the arrow
 * that leads to the next, set one over the next in a narrow grid.
 */
const STEP = "whitespace-nowrap text-(--sc-data-quiet) after:whitespace-normal after:content-[' ›__'] "
           + "@max-[36rem]:block @max-[36rem]:after:content-[' ›']"
/**
 * The columns a verb's row spans: the commands', each file's, and the gap
 * between each two folders.
 */
const WIDTH = commands.FILES.length + commands.FOLDERS.length
/**
 * The gap between two folders, clear and unpadded.
 */
export const GAP = [FRAME, FILLS.clear, 'p-0! text-center!']
/**
 * The header of a command's row, edged in its verb's hue.
 */
const NAME = [
  FRAME, FOCUS, SHIFT, 'pt-1! pr-1.5! pb-1! pl-3! text-left! @max-[36rem]:py-[7px]!',
  'shadow-[inset_3px_0_0_var(--sc-commands-hue)]'
]
/**
 * A command's path, smaller in a narrow grid.
 */
const PATH = [CODE, 'text-[0.8125rem]/[24px]! whitespace-normal @max-[36rem]:text-[0.75rem]/[18px]!']
/**
 * A square where a command meets a file.
 */
const SQUARE = [FRAME, FOCUS, 'px-1.5! py-1! text-center!']
/**
 * The header of a verb's rows, its dot and name over the line its group's help
 * gives.
 */
const VERB = [
  FRAME, FILLS.clear, 'pt-[18px]! pr-1.5! pb-1.5! pl-3! -indent-3 text-left! font-body!',
  'text-[0.8125rem]/[20px]! text-(--sc-data-quiet)! not-italic normal-nums'
]
/**
 * A verb's name in its header.
 */
const VERB_NAME = [CODE, 'mr-2.5 text-[0.875rem]/[24px]! font-bold!']

/**
 * Draws the row of one command: its path beside a square for each file, with a
 * gap between two folders.
 */
function commandRow(command: commands.Command, verb: commands.Verb, verbed: Verbed): VNode {
  const on = commands.reaches(verbed.aim, command.name, null)
  return h('tr', { 'class': ROW, 'data-on': on || undefined }, [
    h('th', {
      ...verbed.aimAt({ command: command.name }),
      class : [NAME, filled(on, verbed)],
      scope : 'row'
    }, h('code', { class: [PATH, on ? 'font-bold!' : 'font-medium!', inked(on, verbed.shown)] }, [
      h('span', { class: STEP }, 'scotch'), h('span', { class: STEP }, verb),
      h('b', { class: [NOUN, on ? 'text-(--sc-data-link)' : ''] }, command.noun)
    ])),
    ...commands.FILES.flatMap((file, column) => [
      column > 0 && file.folder !== commands.FILES[column - 1]!.folder
        ? h('td', { 'aria-hidden': 'true', 'class': GAP })
        : null,
      square(column, command, file, on, verbed)
    ])
  ])
}

/**
 * Reads the fill of a cell on a command's row: the tint while the row is
 * aimed, clear where the picked tab leaves the verb out, and the verb's hue
 * otherwise, stronger where its verb is picked alone.
 */
function filled(on: boolean, verbed: Verbed): string {
  if (on) return FILLS.aimed
  if (!verbed.shown) return FILLS.clear
  return verbed.single ? FILLS.picked : FILLS.hue
}

/**
 * Reads the color of a command's name: the link's while it is aimed, quiet on
 * a row the picked tab leaves out, and the ink otherwise.
 */
function inked(on: boolean, shown: boolean): string {
  if (!shown) return 'text-(--sc-data-quiet)!'
  return on ? 'text-(--sc-data-link)!' : 'text-(--sc-data-ink)!'
}

/**
 * Says what a square holds, for a screen reader.
 */
function spoken(command: commands.Command, file: commands.File, kind: commands.Kind): string {
  return `scotch ${command.name} ${kind} ${file.path}`
}

/**
 * Draws the square where a command meets a file, a mark where the command
 * writes or reads it, in the link's color while it is aimed.
 */
function square(
  column  : number,
  command : commands.Command,
  file    : commands.File,
  on      : boolean,
  verbed  : Verbed
): VNode {
  const kind = commands.edgeOf(command.name, file.path)
  const aim  = commands.reaches(verbed.aim, command.name, file.path)
  return h('td', {
    ...verbed.aimAt({ square: [commands.COMMANDS.indexOf(command), column] }),
    'class'     : [SQUARE, aim ? FILLS.square : filled(on, verbed), kind ? SHIFT : ''],
    'data-kind' : kind,
    'data-on'   : aim || undefined,
    'tabindex'  : kind ? 0 : -1
  }, kind
    ? [mark(kind, 'cell', verbed.shown), h('span', { class: SPOKEN }, spoken(command, file, kind))]
    : [])
}

/**
 * Draws the header of a verb's rows: its dot and name over the line its group's
 * help gives, quiet where the picked tab leaves it out.
 */
function verbHead(shown: boolean, verb: commands.Verb): VNode {
  return h('tr', { class: ROW }, h('th', { class: VERB, colspan: WIDTH, scope: 'rowgroup' }, [
    h('i', { 'aria-hidden': 'true', 'class': [DOT, 'mr-1'] }),
    h('code', { class: [VERB_NAME, shown ? 'text-(--sc-data-ink)!' : 'text-(--sc-data-quiet)!'] }, verb),
    h('span', commands.GROUPS[verb])
  ]))
}

/**
 * Draws the rows of one verb: the verb over the line its group's help gives,
 * then each of its commands beside a square for each file, a write a filled
 * mark and a read a hollow one, with a gap between two folders.
 */
export function group(aim: commands.Aim, aimAt: Aiming, tab: commands.Tab, verb: commands.Verb): VNode {
  const shown  = tab === 'all' || tab === verb
  const verbed = { aim, aimAt, shown, single: tab !== 'all' }
  return h('tbody', { 'data-in': shown ? '' : undefined, 'style': hue(verb) }, [
    verbHead(shown, verb),
    ...commands.commandsOf(verb).map(command => commandRow(command, verb, verbed))
  ])
}

/**
 * Sets the hue of a verb's rows, the series color of its place in the run.
 */
export function hue(verb: commands.Verb): Record<string, string> {
  return { '--sc-commands-hue': `var(--sc-series-${commands.RUN_ORDER.indexOf(verb) + 1})` }
}

/**
 * Draws the mark of what a command does to a file, in the key or in a square of
 * the grid, faded on a row the picked tab leaves out.
 */
export function mark(kind: commands.Kind, place: keyof typeof MARKS, shown: boolean = true): VNode {
  return h('i', {
    'aria-hidden' : 'true',
    'class'       : [MARK, MARKS[place][kind], shown ? '' : 'opacity-30'],
    'data-kind'   : kind
  })
}
