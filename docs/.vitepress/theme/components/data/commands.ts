import { type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import * as commands from '../../../lib/data/commands.ts'
import * as grid     from './grid.ts'
import { Plate }     from './plate.ts'
import { Tabs }      from './tabs.ts'

/**
 * The commands' plate, its readings set in four columns on the raised ground
 * and in two in a narrow grid, its tabs and key spread to either side.
 */
const BOARD = [
  '@container min-w-0 *:gap-y-[18px] [&>div>div:first-child]:justify-between',
  '[&>div>div:first-child]:gap-x-4 [&_dl]:grid-cols-[calc(13.5rem_-_28px)_repeat(3,minmax(0,1fr))]',
  '[&_dl]:rounded-md [&_dl]:bg-raised [&_dl]:px-3 [&_dl]:py-2.5 [&_dl]:[border-top:0]',
  '@max-[36rem]:[&_dl]:grid-cols-[repeat(2,minmax(0,1fr))]'
]
/**
 * The caption over the commands, in capitals of the code face.
 */
const CAPTION = 'font-code text-[0.65rem]/[18px] font-medium tracking-[0.1em] text-(--sc-data-quiet) '
              + 'uppercase not-italic normal-nums'
/**
 * The cell heading the commands, its caption at the foot.
 */
const CORNER = [grid.FRAME, grid.FILLS.clear, 'pt-0! pr-1.5! pb-2.5! pl-3! text-left! align-bottom!']
/**
 * A file's name over its column, turned on its side in a narrow grid.
 */
const FILE = [
  grid.CODE, 'inline-block rotate-180 text-[0.75rem]/[16px]! whitespace-nowrap [writing-mode:vertical-rl]',
  '@min-[36rem]:rotate-none @min-[36rem]:whitespace-normal @min-[36rem]:[writing-mode:horizontal-tb]'
]
/**
 * The header of a file's column, as tall as the longest name it turns.
 */
const FILE_HEAD = [
  grid.FRAME, grid.FOCUS, grid.SHIFT,
  'h-[9.5rem]! px-1! pt-1! pb-2.5! text-center! align-bottom! @min-[36rem]:h-auto!'
]
/**
 * The header of a folder over its files, on the folder's ground.
 */
const FOLDER = [
  grid.FRAME, grid.FILLS.ground,
  'rounded-t-md! px-1.5! pt-2! pb-0.5! text-center! font-body! text-[0.75rem]/[18px]!',
  'text-(--sc-data-quiet)! not-italic normal-nums @max-[36rem]:px-0! @max-[36rem]:pt-1.5!'
]
/**
 * A folder's name over its size.
 */
const FOLDER_NAME = [
  grid.CODE, 'block text-[0.875rem]/[24px]! font-medium! text-(--sc-data-ink)! @max-[36rem]:text-[0.6875rem]!'
]
/**
 * The key naming the two marks, in capitals of the code face.
 */
const KEY = 'm-0! flex flex-wrap gap-x-4 gap-y-1.5 font-code text-[0.65rem]/[18px]! font-medium '
          + 'tracking-[0.1em] text-(--sc-data-quiet) uppercase not-italic normal-nums'
/**
 * The grid of commands and files, its columns fixed and its cells unruled.
 */
const TABLE = 'm-0! table! w-full! table-fixed! border-separate! border-spacing-0!'

/**
 * Sets a file name with a break allowed before each dot, so a narrow column
 * wraps it there.
 */
function broken(name: string): (VNode | string)[] {
  return name.split(/(?=\.)/u).flatMap<VNode | string>((part, at) => at ? [h('wbr'), part] : [part])
}

/**
 * Draws the header of a file's column, its name in the link's color while it
 * is aimed, the first and last of a folder rounding its ground.
 */
function fileHead(aim: commands.Aim, aimAt: grid.Aiming, file: commands.File): VNode {
  const on    = commands.reaches(aim, null, file.path)
  const files = commands.filesOf(file.folder)
  return h('th', {
    ...aimAt({ file: file.path }),
    'class'   : [
      FILE_HEAD, on ? grid.FILLS.aimed : grid.FILLS.ground, files[0] === file ? 'rounded-bl-md!' : '',
      files.at(-1) === file ? 'rounded-br-md!' : ''
    ],
    'data-on' : on || undefined,
    'scope'   : 'col'
  }, h('code', {
    class: [FILE, on ? 'font-bold! text-(--sc-data-link)!' : 'font-medium! text-(--sc-data-quiet)!']
  }, broken(file.name)))
}

/**
 * Draws the two header rows over the files: each folder over its size, then
 * each file's name, with a gap between two folders.
 */
function head(aim: commands.Aim, aimAt: grid.Aiming): VNode {
  return h('thead', [
    h('tr', { class: grid.ROW }, [
      h('td', { class: CORNER, rowspan: 2 }, [h('span', { class: CAPTION }, 'Command')]),
      ...commands.FOLDERS.flatMap((folder, at) => [
        at ? h('td', { 'aria-hidden': 'true', 'class': grid.GAP, 'rowspan': 2 }) : null,
        h('th', { class: FOLDER, colspan: commands.filesOf(folder).length, scope: 'colgroup' }, [
          h('code', { class: FOLDER_NAME }, folder), h('span', commands.SIZES[folder])
        ])
      ])
    ]),
    h('tr', { class: grid.ROW }, commands.FILES.map(file => fileHead(aim, aimAt, file)))
  ])
}

/**
 * Draws the key naming the two marks.
 */
function key(): VNode {
  return h('p', { class: KEY }, (['writes', 'reads'] as const).map(kind => h('span', {
    class: 'inline-flex items-center gap-[7px]'
  }, [grid.mark(kind, 'key'), kind === 'writes' ? 'Writes' : 'Reads'])))
}

/**
 * Draws the tools over the grid: a tab for each verb, every command's first,
 * each beside its count of commands, then the key naming the two marks.
 */
function tools(id: string, pick: (to: commands.Tab) => void, tab: commands.Tab): VNode[] {
  return [
    h(Tabs, {
      'controls'    : () => id,
      'label'       : 'Verbs',
      'look'        : 'pill',
      'names'       : commands.TABS,
      'on'          : tab,
      'onUpdate:on' : (name: string) => { pick(name as commands.Tab) }
    }, {
      default: ({ name }: { name: commands.Tab }) => name === 'all'
        ? ['All', h('small', String(commands.COMMANDS.length))]
        : [
            h('i', { 'aria-hidden': 'true', 'class': [grid.DOT, 'mr-1.5'], 'style': grid.hue(name) }),
            name,
            h('small', String(commands.commandsOf(name).length))
          ]
    }),
    key()
  ]
}

/**
 * The commands and the files of the data directory on the plate every Data
 * widget sits on: a row for each command under its verb, a column for each
 * file under its folder, and a mark where the command writes or reads the
 * file. A tab for each verb lights its commands' rows, and beneath the grid a
 * row of readings follows the command, the file, or the square a pointer or
 * the focus rests on. The arrow keys, Home, and End move between the tabs.
 */
export const Commands = defineComponent({
  name: 'ScotchDataCommands',

  setup: () => {
    const id            = useId()
    const tab           = shallowRef<commands.Tab>('all')
    const aim           = shallowRef<commands.Aim>(null)
    const aimAt: grid.Aiming = to => ({
      onBlur         : () => { aim.value = null },
      onFocus        : () => { aim.value = to },
      onPointerenter : () => { aim.value = to },
      onPointerleave : () => { aim.value = null },
      tabindex       : 0
    })

    return (): VNode => h('div', { class: BOARD }, h(Plate, {
      readings: commands.readingsOf(aim.value, tab.value)
    }, {
      default: () => h('table', {
        'aria-label' : 'What each command writes and reads',
        'class'      : TABLE,
        'id'         : id
      }, [
        h('colgroup', [
          h('col', { class: 'w-[13.5rem] @max-[36rem]:w-[4.75rem]' }),
          ...commands.FOLDERS.flatMap((folder, at) => [
            at ? h('col', { class: 'w-5 @max-[36rem]:w-2' }) : null,
            ...commands.filesOf(folder).map(() => h('col'))
          ])
        ]),
        head(aim.value, aimAt),
        ...commands.RUN_ORDER.map(verb => grid.group(aim.value, aimAt, tab.value, verb))
      ]),

      tools: () => tools(id, to => { tab.value = to }, tab.value)
    }))
  }
})
