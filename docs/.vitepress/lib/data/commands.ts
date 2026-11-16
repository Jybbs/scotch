import rendered from '../rendered/commands.json' with { type: 'json' }
import disk     from '../rendered/disk.json' with { type: 'json' }

/**
 * What a reader points at or holds: a command, a file, or the square of one
 * command's row and one file's column, each counted from 0.
 */
export type Aim = { command: string } | { file: string } | { square: readonly [number, number] } | null

/**
 * What a command does to a file: writes it, or reads it.
 */
export type Kind = 'reads' | 'writes'

/**
 * A tab over the grid: every command, or the commands of one verb.
 */
export type Tab = (typeof TABS)[number]

/**
 * A verb the help of `scotch` lists as a group.
 */
export type Verb = (typeof RUN_ORDER)[number]

/**
 * One command the help of `scotch` lists, its name the verb and the noun.
 */
export interface Command {
  name : string
  noun : string
  verb : Verb
}

/**
 * One file a run writes under the data directory: its folder, its name under
 * the folder, its path from the folder, the command writing it, and the
 * commands reading it, each without the `scotch` they open on.
 */
export interface File {
  folder  : string
  name    : string
  path    : string
  readers : readonly string[]
  writer  : string
}

/**
 * Every command the help of `scotch` lists, in the help's order.
 */
export const COMMANDS: readonly Command[] = rendered.commands.map(({ noun, verb }) => ({
  name : `${verb} ${noun}`,
  noun : noun,
  verb : verb as Verb
}))
/**
 * Every file of the data directory's layout, its path split at the folder
 * holding it.
 */
export const FILES: readonly File[] = rendered.files.map(({ path, readers, writer }) => {
  const [, folder = '', name = ''] = /^\.cache\/data\/([^/]+\/)(.*)$/u.exec(path) ?? []
  return {
    folder  : folder,
    name    : name.replace(/^www\./u, ''),
    path    : folder + name,
    readers : readers.map(reader => reader.replace(/^scotch /u, '')),
    writer  : writer.replace(/^scotch /u, '')
  }
})
/**
 * The line the help gives each verb's group.
 */
export const GROUPS = Object.fromEntries(rendered.commands.map(({ group, verb }) => [verb, group])) as
  Record<Verb, string>
/**
 * The verbs in the order a first run reaches them.
 */
export const RUN_ORDER = ['fetch', 'index', 'match', 'show', 'cite'] as const
/**
 * The size of each folder on disk, as `docs:render` measures it.
 */
export const SIZES: Record<string, string> = disk
/**
 * The folders of the data directory, in the order the layout lists them.
 */
export const FOLDERS = [...new Set(FILES.map(({ folder }) => folder))]
/**
 * The tabs over the grid, every command first and then each verb in the order
 * a first run reaches it.
 */
export const TABS = ['all', ...RUN_ORDER] as const

/**
 * Counts the `kinds` that are `kind`.
 */
function tallied(kinds: readonly (Kind | undefined)[], kind: Kind): string {
  return String(kinds.filter(each => each === kind).length)
}

/**
 * Reads the readings beneath the grid for the commands `shown`: how many
 * writes and reads they make, and how many of the files they touch.
 */
function touching(shown: readonly Command[]): string[][] {
  const kinds = shown.flatMap(command => FILES.map(file => edgeOf(command.name, file.path)))
  const files = FILES.filter(file => shown.some(command => edgeOf(command.name, file.path))).length
  return [
    shown.length === 1 ? ['Command', shown[0]!.name] : ['Commands', String(shown.length)],
    ['Writes', tallied(kinds, 'writes')],
    ['Reads', tallied(kinds, 'reads')],
    ['Touches', `${files} of ${FILES.length}`, 'files']
  ]
}

/**
 * Lists the commands of `verb`, in the help's order.
 */
export function commandsOf(verb: Verb): readonly Command[] {
  return COMMANDS.filter(command => command.verb === verb)
}

/**
 * Reads what `command` does to the file at `file`, if anything.
 */
export function edgeOf(command: string, file: string): Kind | undefined {
  const found = FILES.find(each => each.path === file)
  if (found?.writer === command) return 'writes'
  return found?.readers.includes(command) ? 'reads' : undefined
}

/**
 * Lists the files of `folder`, in the layout's order.
 */
export function filesOf(folder: string): readonly File[] {
  return FILES.filter(file => file.folder === folder)
}

/**
 * Reads whether `aim` reaches the command `command`, the file `file`, or the
 * square of both, a command reaching each file it writes or reads and a file
 * each command writing or reading it.
 */
export function reaches(aim: Aim, command: string | null, file: string | null): boolean {
  if (!aim) return false
  if ('square' in aim) {
    const [row, column] = aim.square
    return (command === null || COMMANDS[row]!.name === command)
      && (file === null || FILES[column]!.path === file)
  }
  if ('command' in aim) {
    if (command !== null) return aim.command === command && (file === null || Boolean(edgeOf(command, file)))
    return Boolean(file && edgeOf(aim.command, file))
  }
  if (file !== null) return aim.file === file && (command === null || Boolean(edgeOf(command, file)))
  return Boolean(command && edgeOf(command, aim.file))
}

/**
 * Reads the readings beneath the grid: for a file, who writes it, how many
 * commands read it, and its folder's size; for a square, its command, its file,
 * what the one does to the other, and the folder's size; and otherwise what the
 * command aimed at, or the commands of the tab, write, read, and touch.
 */
export function readingsOf(aim: Aim, tab: Tab): string[][] {
  if (aim && 'file' in aim) {
    const file = FILES.find(found => found.path === aim.file)!
    return [
      ['File', file.name], ['Written by', file.writer], ['Read by', String(file.readers.length), 'commands'],
      ['Folder', SIZES[file.folder] ?? '']
    ]
  }
  if (aim && 'square' in aim) {
    const command = COMMANDS[aim.square[0]]!
    const file    = FILES[aim.square[1]]!
    return [
      ['Command', command.name], ['File', file.name], ['Does', edgeOf(command.name, file.path) ?? 'Neither'],
      ['Folder', SIZES[file.folder] ?? '']
    ]
  }
  if (aim) return touching(COMMANDS.filter(command => command.name === aim.command))
  return touching(COMMANDS.filter(command => tab === 'all' || command.verb === tab))
}
