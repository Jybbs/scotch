import { EXAMPLES } from './examples.ts'

/**
 * The form a value read from JSON takes, a list for an array.
 */
type Form = 'boolean' | 'list' | 'number' | 'object' | 'string'

/**
 * The shape every match file holds, read off the two examples: the form each
 * key's value takes, the keys an object under each key holds in both examples,
 * and the keys either example holds as `null`, each key named as it is written
 * and the items of a list under its name behind `[]`.
 */
interface Shape {
  forms    : ReadonlyMap<string, Form>
  keys     : ReadonlyMap<string, readonly string[]>
  nullable : ReadonlySet<string>
}

/**
 * How the line naming what a file lacks names each form.
 */
const WORDS = {
  boolean : 'true or false',
  list    : 'a list',
  number  : 'a number',
  object  : 'an object',
  string  : 'a string'
} as const satisfies Record<Form, string>
const SHAPE = shapeOf(Object.values(EXAMPLES))

function formOf(value: unknown): Form {
  if (Array.isArray(value)) return 'list'
  return typeof value as Exclude<Form, 'list'>
}

function shapeOf(examples: readonly unknown[]): Shape {
  const forms    = new Map<string, Form>()
  const keys     = new Map<string, readonly string[]>()
  const nullable = new Set<string>()
  const visit    = (value: unknown, key: string): void => {
    if (value === null) {
      nullable.add(key)
      return
    }
    forms.set(key, formOf(value))
    if (Array.isArray(value)) visit(value[0], `${key}[]`)
    if (formOf(value) !== 'object') return
    const own = Object.keys(value as object)
    keys.set(key, keys.get(key)?.filter(name => own.includes(name)) ?? own)
    for (const [name, inner] of Object.entries(value as object)) visit(inner, name)
  }
  for (const example of examples) visit(example, '')
  return { forms, keys, nullable }
}

/**
 * Names the first thing a value read from a match file lacks against the shape
 * the two examples hold, or returns `undefined` for a value holding all of it,
 * an object holding every key both examples hold under its name, each value
 * taking the form theirs takes, and `null` only where an example holds `null`.
 *
 * Args:
 *   value : The value read from the file.
 *   key   : The name the value is held under, the file's own value under none.
 *   path  : Where the value sits in the file, which the line names it by.
 */
export function lacking(value: unknown, key = '', path = ''): string | undefined {
  const form  = SHAPE.forms.get(key)!
  const where = path ? `\`${path}\`` : 'The file'

  if (value === null) {
    return SHAPE.nullable.has(key) ? undefined : `${where} holds null rather than ${WORDS[form]}`
  }
  if (formOf(value) !== form) return `${where} holds ${WORDS[formOf(value)]} rather than ${WORDS[form]}`
  if (Array.isArray(value)) {
    return value.values()
      .map((item, at) => lacking(item, `${key}[]`, `${path}[${at}]`))
      .find(Boolean)
  }
  if (form !== 'object') return undefined
  return SHAPE.keys.get(key)!.values()
    .map(name => {
      const at = path ? `${path}.${name}` : name
      if (!(name in (value as object))) return `The file lacks \`${at}\``
      return lacking((value as Record<string, unknown>)[name], name, at)
    })
    .find(Boolean)
}
