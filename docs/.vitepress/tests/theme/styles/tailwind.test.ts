import { readFileSync }     from 'node:fs'
import { readFile }         from 'node:fs/promises'
import { createRequire }    from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath }    from 'node:url'

import { compile }              from 'tailwindcss'
import { describe, expect, it } from 'vitest'

import { ROLES }                from '../../../lib/identity/roles.ts'
import { IDENTITY, propertyOf } from '../../../lib/identity/tokens.ts'
import * as timing              from '../../../lib/motion/timing.ts'

const SHEET = fileURLToPath(new URL('../../../theme/styles/tailwind.css', import.meta.url))
/**
 * The name each color takes after its utility's prefix, such as `series-1`
 * for the `series_1` token and `data-black` for the `data_black` role.
 */
const colors = [...Object.keys(IDENTITY.palette), ...Object.keys(ROLES)]
  .map(name => propertyOf(name).slice('--sc-'.length))
const curves    = Object.keys(timing.CURVES)
const durations = Object.keys(timing.DURATIONS)
const faces     = Object.keys(IDENTITY.faces)
const require   = createRequire(import.meta.url)
const source    = readFileSync(SHEET, 'utf8')

/**
 * The CSS Tailwind writes for the entry sheet when `candidate` is the one
 * class a module carries, or none.
 */
const built = async (candidate?: string): Promise<string> =>
  (await compiled()).build(candidate === undefined ? [] : [candidate])

/**
 * Compiles the entry sheet afresh, since a compiler keeps every class it has
 * built and writes them all again on each later build.
 */
const compiled = (): ReturnType<typeof compile> => compile(source, {
  base           : dirname(SHEET),
  loadStylesheet : async (id, base) => {
    const path = id.startsWith('.') ? resolve(base, id) : require.resolve(id)
    return { base: dirname(path), content: await readFile(path, 'utf8'), path }
  }
})

it('maps every token, role, face, curve, and duration the identity serves, and nothing else', () => {
  const mapped = [...source.matchAll(/^ {2}(--[a-z-]+-[a-z0-9]+) +: var\((--sc-[a-z0-9-]+)\);$/gmu)]
    .map(([, theme, property]) => `${theme!} ${property!}`)
  expect(mapped.toSorted()).toStrictEqual([
    ...colors.map(name => `--color-${name} --sc-${name}`),
    ...faces.map(face => `--font-${face} --sc-face-${face}`),
    ...curves.map(curve => `--ease-${curve} --sc-curve-${curve}`),
    ...durations.map(name => `--transition-duration-${name} --sc-duration-${name}`),
    ...durations.map(name => `--transition-delay-${name} --sc-duration-${name}`)
  ].toSorted())
})

describe('the identity’s utilities', () => {
  it.each(colors)('paints %s through its custom property, so a role follows the scheme', async name => {
    expect(await built(`bg-${name}`)).toContain(`background-color: var(--sc-${name});`)
  })

  it.each(faces)('sets the %s face through its custom property', async face => {
    expect(await built(`font-${face}`)).toContain(`font-family: var(--sc-face-${face});`)
  })

  it.each(curves)('eases along the %s curve through its custom property', async curve => {
    expect(await built(`ease-${curve}`)).toContain(`transition-timing-function: var(--sc-curve-${curve});`)
  })

  it.each(durations)('times and delays by the %s duration, which reduced motion sets to zero', async name => {
    expect(await built(`duration-${name}`)).toContain(`transition-duration: var(--sc-duration-${name});`)
    expect(await built(`delay-${name}`)).toContain(`transition-delay: var(--sc-duration-${name});`)
  })
})

describe('Tailwind’s defaults', () => {
  it.each(['bg-red-500', 'text-white', 'font-sans', 'font-mono', 'ease-in-out', 'xl:block', '2xl:block'])(
    'builds nothing for %s, which no identity token names',
    async candidate => {
      expect(await built(candidate)).toBe(await built())
    }
  )

  it('keeps the weights, whose namespace sits outside the cleared faces', async () => {
    expect(await built('font-bold')).toContain('font-weight: var(--font-weight-bold);')
  })

  it.each([['sm', '40rem'], ['md', '48rem'], ['lg', '60rem']])(
    'switches %s at VitePress’s %s',
    async (breakpoint, width) => {
      expect(await built(`${breakpoint}:block`)).toContain(`@media (width >= ${width})`)
      expect(await built(`max-${breakpoint}:block`)).toContain(`@media (width < ${width})`)
    }
  )

  it('leaves the base styles to VitePress, importing no Preflight', () => {
    const imported = [...source.matchAll(/^@import '([^']+)'/gmu)].map(([, sheet]) => sheet)
    expect(imported).toStrictEqual(['tailwindcss/theme.css', 'tailwindcss/utilities.css'])
  })
})

it('scans no module for classes, so the build writes no utility before a component carries one', async () => {
  const { root, sources } = await compiled()
  expect({ root, sources }).toStrictEqual({ root: 'none', sources: [] })
})
