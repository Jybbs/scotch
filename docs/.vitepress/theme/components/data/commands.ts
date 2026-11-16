import { type VNode, defineComponent, h, shallowRef, useId } from 'vue'

import * as commands from '../../../lib/data/commands.ts'
import { Plate }     from './plate.ts'
import { Tabs }      from './tabs.ts'

/**
 * The handlers a header or a square takes so a pointer or the focus resting
 * on it aims the grid at `to`.
 */
type Aiming = (to: commands.Aim) => Record<string, unknown>

/**
 * The columns a verb's row spans: the commands', each file's, and the gap
 * between each two folders.
 */
const WIDTH = commands.FILES.length + commands.FOLDERS.length

/**
 * Sets a file name with a break allowed before each dot, so a narrow column
 * wraps it there.
 */
function broken(name: string): (VNode | string)[] {
  return name.split(/(?=\.)/u).flatMap<VNode | string>((part, at) => at ? [h('wbr'), part] : [part])
}

/**
 * Draws the rows of one verb: the verb over the line its group's help gives,
 * then each of its commands beside a square for each file, a write a filled
 * mark and a read a hollow one, with a gap between two folders.
 */
function group(aim: commands.Aim, aimAt: Aiming, tab: commands.Tab, verb: commands.Verb): VNode {
  return h('tbody', { 'data-in': tab === 'all' || tab === verb ? '' : undefined, 'style': hue(verb) }, [
    h('tr', { class: 'sc-commands-verb' }, h('th', { colspan: WIDTH, scope: 'rowgroup' }, [
      h('i', { 'aria-hidden': 'true', 'class': 'sc-commands-dot' }),
      h('code', verb),
      h('span', commands.GROUPS[verb])
    ])),
    ...commands.commandsOf(verb).map(command => {
      const row = commands.COMMANDS.indexOf(command)
      return h('tr', { 'data-on': commands.reaches(aim, command.name, null) || undefined }, [
        h('th', { ...aimAt({ command: command.name }), scope: 'row' }, [
          h('code', { class: 'sc-commands-path' }, [
            h('span', 'scotch'), h('span', verb), h('b', command.noun)
          ])
        ]),
        ...commands.FILES.flatMap((file, column) => {
          const kind = commands.edgeOf(command.name, file.path)
          const gap  = column > 0 && file.folder !== commands.FILES[column - 1]!.folder
          return [
            gap ? h('td', { 'aria-hidden': 'true', 'class': 'sc-commands-gap' }) : null,
            h('td', {
              ...aimAt({ square: [row, column] }),
              'data-kind' : kind,
              'data-on'   : commands.reaches(aim, command.name, file.path) || undefined,
              'tabindex'  : kind ? 0 : -1
            }, kind
              ? [mark(kind), h('span', { class: 'sc-commands-spoken' }, spoken(command, file, kind))]
              : [])
          ]
        })
      ])
    })
  ])
}

/**
 * Draws the two header rows over the files: each folder over its size, then
 * each file's name, with a gap between two folders.
 */
function head(aim: commands.Aim, aimAt: Aiming): VNode {
  return h('thead', [
    h('tr', [
      h('td', { class: 'sc-commands-corner', rowspan: 2 }, [
        h('span', { class: 'sc-commands-caption' }, 'Command')
      ]),
      ...commands.FOLDERS.flatMap((folder, at) => [
        at ? h('td', { 'aria-hidden': 'true', 'class': 'sc-commands-gap', 'rowspan': 2 }) : null,
        h('th', {
          class   : 'sc-commands-folder',
          colspan : commands.filesOf(folder).length,
          scope   : 'colgroup'
        }, [
          h('code', folder), h('span', commands.SIZES[folder])
        ])
      ])
    ]),
    h('tr', commands.FILES.map(file => h('th', {
      ...aimAt({ file: file.path }),
      'class'      : 'sc-commands-file',
      'data-first' : commands.filesOf(file.folder)[0] === file || undefined,
      'data-last'  : commands.filesOf(file.folder).at(-1) === file || undefined,
      'data-on'    : commands.reaches(aim, null, file.path) || undefined,
      'scope'      : 'col'
    }, h('code', broken(file.name)))))
  ])
}

/**
 * Sets the hue of a verb's rows, the series color of its place in the run.
 */
function hue(verb: commands.Verb): Record<string, string> {
  return { '--sc-commands-hue': `var(--sc-series-${commands.RUN_ORDER.indexOf(verb) + 1})` }
}

/**
 * Draws the key naming the two marks.
 */
function key(): VNode {
  return h('p', { class: 'sc-commands-key' }, (['writes', 'reads'] as const).map(kind =>
    h('span', [mark(kind), kind === 'writes' ? 'Writes' : 'Reads'])))
}

/**
 * Draws the mark of what a command does to a file: a filled square for a
 * write, a hollow one for a read.
 */
function mark(kind: commands.Kind): VNode {
  return h('i', { 'aria-hidden': 'true', 'class': 'sc-commands-mark', 'data-kind': kind })
}

/**
 * Says what a square holds, for a screen reader.
 */
function spoken(command: commands.Command, file: commands.File, kind: commands.Kind): string {
  return `scotch ${command.name} ${kind} ${file.path}`
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
      'names'       : commands.TABS,
      'on'          : tab,
      'onUpdate:on' : (name: string) => { pick(name as commands.Tab) }
    }, {
      default: ({ name }: { name: commands.Tab }) => name === 'all'
        ? ['All', h('small', String(commands.COMMANDS.length))]
        : [
            h('i', { 'aria-hidden': 'true', 'class': 'sc-commands-dot', 'style': hue(name) }),
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
    const aimAt: Aiming = to => ({
      onBlur         : () => { aim.value = null },
      onFocus        : () => { aim.value = to },
      onPointerenter : () => { aim.value = to },
      onPointerleave : () => { aim.value = null },
      tabindex       : 0
    })

    return (): VNode => h('div', { class: 'sc-data-commands' }, h(Plate, {
      readings: commands.readingsOf(aim.value, tab.value)
    }, {
      default: () => h('table', {
        'aria-label' : 'What each command writes and reads',
        'class'      : 'sc-commands',
        'data-tab'   : tab.value,
        'id'         : id
      }, [
        h('colgroup', [h('col', { class: 'sc-commands-lead' }), ...commands.FOLDERS.flatMap((folder, at) => [
          at ? h('col', { class: 'sc-commands-gap' }) : null,
          ...commands.filesOf(folder).map(() => h('col'))
        ])]),
        head(aim.value, aimAt),
        ...commands.RUN_ORDER.map(verb => group(aim.value, aimAt, tab.value, verb))
      ]),

      tools: () => tools(id, to => { tab.value = to }, tab.value)
    }))
  }
})
