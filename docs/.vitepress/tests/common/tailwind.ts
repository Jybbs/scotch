import { readFileSync }     from 'node:fs'
import { readFile }         from 'node:fs/promises'
import { createRequire }    from 'node:module'
import { dirname, resolve } from 'node:path'

import { compile } from 'tailwindcss'

/**
 * The values of Tailwind's `Polyfills` flags, every fallback and none, which its
 * declarations keep in an ambient const enum no import reaches.
 */
const POLYFILLS = { all: 3, none: 0 } as const
/**
 * The site's Tailwind entry sheet.
 */
export const SHEET = resolve(import.meta.dirname, '../../theme/styles/tailwind.css')
const require      = createRequire(import.meta.url)

/**
 * Compiles `source` as the entry sheet afresh, since a compiler keeps every
 * class it has built and writes them all again on each later build, writing
 * the fallbacks `polyfills` names.
 */
export const compiled = (
  source    : string,
  polyfills : number = POLYFILLS.all
): ReturnType<typeof compile> => compile(source, {
  base           : dirname(SHEET),
  polyfills      : polyfills,
  loadStylesheet : async (id, base) => {
    const path = id.startsWith('.') ? resolve(base, id) : require.resolve(id)
    return { base: dirname(path), content: await readFile(path, 'utf8'), path }
  }
})

/**
 * Builds the utilities every element under `root` carries into a sheet the
 * document holds.
 */
export async function styled(root: Element): Promise<HTMLStyleElement> {
  const sheet = document.createElement('style')
  const all   = [root, ...root.querySelectorAll('*')]
  sheet.textContent = await utilities(all.flatMap(element => Array.from(element.classList)))
  document.head.append(sheet)
  return sheet
}

/**
 * Builds the utilities `classes` name, with the entry sheet's layers and the
 * fallbacks nested in `@supports` dropped, since happy-dom applies no rule
 * inside an `@layer` and reads no nested rule.
 */
export async function utilities(classes: string[]): Promise<string> {
  const unlayered = readFileSync(SHEET, 'utf8')
    .replace(/^@layer [^;]+;$/mu, '')
    .replaceAll(/ layer\(\w+\)/gu, '')
  return (await compiled(unlayered, POLYFILLS.none)).build([...new Set(classes)])
}
