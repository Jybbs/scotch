import { readFileSync, readdirSync } from 'node:fs'
import { createRequire }             from 'node:module'
import { dirname, resolve }          from 'node:path'

import { describe, expect, it } from 'vitest'

import { ROLES }                from '../../../lib/identity/roles.ts'
import { IDENTITY, propertyOf } from '../../../lib/identity/tokens.ts'
import * as timing              from '../../../lib/motion/timing.ts'
import * as tailwind            from '../../common/tailwind.ts'

const CLASS_NAMES = /\sclass="([^"]+)"|'([\w -]+)'/gu
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
const source    = readFileSync(tailwind.SHEET, 'utf8')
const templates = resolve(dirname(require.resolve('vitepress')), '../client/theme-default')

/**
 * Each name the default theme’s templates can write as a class, read from a
 * `class` attribute or a quoted name a binding or a computed class list holds,
 * such as `container` on the column a page sits in and `fixed` on the local
 * navigation.
 */
const themeClasses = (): string[] => [...new Set(readdirSync(templates, { encoding: 'utf8', recursive: true })
  .filter(file => file.endsWith('.vue'))
  .flatMap(file => Array.from(readFileSync(resolve(templates, file), 'utf8').matchAll(CLASS_NAMES)))
  .flatMap(([, attribute, quoted]) => (attribute ?? quoted)!.split(/\s+/u)))]

/**
 * The CSS Tailwind writes for the entry sheet when `candidate` is the one
 * class a module carries, or none.
 */
const built = async (candidate?: string): Promise<string> =>
  (await compiled()).build(candidate === undefined ? [] : [candidate])

/**
 * Compiles the entry sheet afresh.
 */
const compiled = (): ReturnType<typeof tailwind.compiled> => tailwind.compiled(source)

it('maps every token, role, face, curve, and duration the identity serves, and nothing else', () => {
  const mapped = [...source.matchAll(/^ {2}(--[a-z0-9-]+) +: ([^;]+);$/gmu)]
    .filter(([, theme]) => !theme!.startsWith('--breakpoint-'))
    .map(([, theme, value]) => `${theme!} ${value!}`)
  expect(mapped.toSorted()).toStrictEqual([
    ...colors.map(name => `--color-${name} var(--sc-${name})`),
    ...faces.map(face => `--font-${face} var(--sc-face-${face})`),
    ...curves.map(curve => `--ease-${curve} var(--sc-curve-${curve})`),
    ...durations.map(name => `--transition-duration-${name} var(--sc-duration-${name})`),
    ...durations.map(name => `--transition-delay-${name} var(--sc-duration-${name})`),
    '--animate-blink sc-front-blink 1s steps(1) infinite',
    '--animate-rise sc-data-rise var(--sc-duration-settle) var(--sc-curve-glide) backwards',
    '--animate-unfold sc-refused-in var(--sc-duration-fade) var(--sc-curve-glide)',
    '--animate-wait sc-front-wait 1.2s var(--sc-curve-sway) infinite alternate',
    '--default-transition-duration var(--sc-duration-fade)',
    '--default-transition-timing-function var(--sc-curve-glide)'
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

  it('times and eases a bare transition by the fade duration and the glide curve, so it too stops under reduced motion', async () => {
    const css = await built('transition-colors')
    expect(css).toContain('transition-duration: var(--tw-duration, var(--sc-duration-fade));')
    expect(css).toContain('transition-timing-function: var(--tw-ease, var(--sc-curve-glide));')
  })

  it('reads the dark scheme from the class the site’s switch sets on the root, not the system scheme', async () => {
    const css = await built('dark:block')
    expect(css).toContain(':root.dark .dark\\:block')
    expect(css).not.toContain('prefers-color-scheme')
  })

  it.each([['rise', 'sc-data-rise'], ['unfold', 'sc-refused-in']])(
    'draws the %s animation from the %s keyframes the sheet declares',
    async (name, frames) => {
      const css = await built(`animate-${name}`)
      expect(css).toContain(`animation: ${frames} `)
      expect(css).toContain(`@keyframes ${frames}`)
    }
  )
})

describe('Tailwind’s defaults', () => {
  it.each([
    'bg-red-500', 'text-white', 'font-sans', 'font-mono', 'ease-in-out', 'animate-spin', 'xl:block',
    '2xl:block'
  ])(
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

describe('the class scan', () => {
  it('reads every module under docs/.vitepress, two folders above the entry sheet', async () => {
    expect((await compiled()).root).toStrictEqual({ base: dirname(tailwind.SHEET), pattern: '../..' })
  })

  it('builds nothing for a class the default theme writes, so no utility restyles its markup', async () => {
    expect((await compiled()).build(themeClasses())).toBe(await built())
  })
})
