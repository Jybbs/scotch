import demo     from '../../../public/matches/demo.json' with { type: 'json' }
import exported from '../rendered/exported.json' with { type: 'json' }

import { counted } from './numbers.ts'

/**
 * One field of the match file.
 */
export type Field = (typeof FIELDS)[number]

/**
 * One line of a field's part of the demo's file, indented `depth` steps, and
 * dim where it stands for items the listing leaves out.
 */
interface Line {
  depth : number
  text  : string
  dim?  : boolean
}

/**
 * A field's part of the demo's file as rows, each row's lines beside the type
 * and the meaning of the field they write, and the closing line on a row of its
 * own with no gloss.
 */
export interface Row {
  lines : readonly Line[]
  note? : { meaning: string, type: string }
}

/**
 * The fields of the match file, in the order `scotch match game --json`
 * writes them.
 */
export const FIELDS = ['submitted', 'span', 'stored', 'ties'] as const
/**
 * How many items of an array the listing shows before counting the rest, and
 * how many tags of an object.
 */
const SHOWN = { items: 4, placements: 1, tags: 3 } as const

/**
 * Reads the type and the meaning of the field `name` of the table `table`
 * `docs:render` writes from the record declaring it.
 */
function noteOf(name: string, table: keyof typeof exported): { meaning: string, type: string } {
  const { meaning, type } = exported[table].find(row => row.name === name)!
  return { meaning, type }
}

/**
 * Writes one inner field of the demo's file as lines, an array cut to its
 * first items and an object to its first tags, each beside the count of the
 * rest.
 */
function linesOf(item: unknown, key: string, last: boolean, shown = SHOWN): Line[] {
  const comma = last ? '' : ','
  if (Array.isArray(item)) {
    const count = key === 'placements' ? shown.placements : shown.items
    const first = item.slice(0, count).map(each => JSON.stringify(each)).join(', ')
    return [{ depth: 1, text: `"${key}": [${first}, … ${counted(item.length - count)} more]${comma}` }]
  }
  if (item !== null && typeof item === 'object') {
    const tags = Object.entries(item)
    return [
      { depth: 1, text: `"${key}": {` },
      ...tags
        .slice(0, shown.tags)
        .map(([tag, said]) => ({ depth: 2, text: `"${tag}": ${JSON.stringify(said)},` })),
      { depth: 2, dim: true, text: `… ${tags.length - shown.tags} more` },
      { depth: 1, text: `}${comma}` }
    ]
  }
  return [{ depth: 1, text: `"${key}": ${JSON.stringify(item)}${comma}` }]
}

/**
 * Sets out the field `field` of the demo's file as rows: the line opening it
 * beside the field's type and meaning, each inner field's lines beside its
 * own, and the line closing it, which a number such as `ties` writes none of.
 */
export function rowsOf(field: Field, match: object = demo): Row[] {
  const value: unknown = match[field as keyof typeof match]
  const note           = noteOf(field, 'export')
  if (value === null || typeof value !== 'object') {
    return [{ lines: [{ depth: 0, text: `"${field}": ${JSON.stringify(value)}` }], note }]
  }
  const entries = Object.entries(value)
  return [
    { lines: [{ depth: 0, text: `"${field}": {` }], note },
    ...entries.map(([key, item], at) => ({
      lines : linesOf(item, key, at === entries.length - 1),
      note  : noteOf(key, field === 'span' ? 'span' : 'side')
    })),
    { lines: [{ depth: 0, text: '}' }] }
  ]
}
