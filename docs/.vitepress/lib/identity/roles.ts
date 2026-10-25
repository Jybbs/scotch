import { mix }     from './colors.ts'
import * as tokens from './tokens.ts'

/**
 * A color a role takes in one scheme: a palette token, the white or the black
 * at either end, or a mix in OKLab taking a share in percent of the first and
 * the rest of the second.
 */
export type Paint = Pure | readonly [Pure, number, Pure]

type Pure = tokens.Token | 'black' | 'white'

/**
 * The color a role takes in the light scheme and in the dark one, beside what
 * it is drawn as.
 */
interface Role {
  dark  : Paint
  kind  : RoleKind
  light : Paint
}

/**
 * What a role is drawn as, which sets the contrast it holds: a ground every
 * other role sits on, text at 4.5:1 against each ground, a mark carrying
 * meaning at 3:1 against the page, and a rule or a fill that carries none, a
 * fill being set apart by the outline or the fill beside it.
 */
type RoleKind = 'fill' | 'ground' | 'mark' | 'rule' | 'text'

const EXTREMES = { black: '#000000', white: '#ffffff' } as const
/**
 * Each color the site draws with, by the role it plays, in the light scheme and
 * the dark one, which the stylesheet the identity's plugin serves sets as one
 * custom property per role and the theme maps the default theme's own variables
 * onto.
 */
export const ROLES = {
  alert        : { dark: ['critical', 58, 'ground'], kind: 'text', light: ['critical', 76, 'dark'] },
  data_black   : { dark: ['dark', 30, 'black'], kind: 'fill', light: 'dark' },
  data_edge    : { dark: ['ground', 50, 'dark'], kind: 'mark', light: 'dark' },
  front_hollow : { dark: 'black', kind: 'fill', light: 'dark' },
  front_paper  : { dark: 'ground', kind: 'fill', light: 'white' },
  glyph_dark   : { dark: ['dark', 86, 'light'], kind: 'fill', light: ['ground', 77, 'primary'] },
  glyph_light  : { dark: ['dark', 78, 'light'], kind: 'fill', light: ['ground', 72, 'light'] },
  ink          : { dark: 'ground', kind: 'text', light: 'dark' },
  page         : { dark: 'dark', kind: 'ground', light: 'ground' },
  quiet        : { dark: ['ground', 66, 'dark'], kind: 'text', light: ['dark', 72, 'ground'] },
  raised       : { dark: ['dark', 94, 'white'], kind: 'ground', light: ['ground', 45, 'white'] },
  rule         : { dark: ['dark', 76, 'ground'], kind: 'rule', light: ['ground', 78, 'dark'] },
  run          : { dark: 'light', kind: 'text', light: 'primary' },
  side         : { dark: ['dark', 66, 'black'], kind: 'ground', light: ['ground', 45, 'white'] },
  stored       : { dark: 'series_3', kind: 'mark', light: 'series_3' },
  submitted    : { dark: 'series_2', kind: 'mark', light: 'series_2' },
  tint         : { dark: ['dark', 88, 'light'], kind: 'ground', light: ['ground', 88, 'primary'] }
} as const satisfies Record<string, Role>

function cssOf(paint: Paint): string {
  if (typeof paint !== 'string') {
    const [first, share, second] = paint
    return `color-mix(in oklab, ${cssOf(first)} ${share}%, ${cssOf(second)})`
  }
  return paint in EXTREMES ? paint : `var(${tokens.propertyOf(paint as tokens.Token)})`
}

/**
 * Resolves the color a paint draws as a hex, mixing in OKLab as `color-mix()`
 * does, so a card and a test each read the color a browser draws.
 */
export function resolve(paint: Paint): string {
  if (typeof paint !== 'string') {
    const [first, share, second] = paint
    return mix(resolve(first), share, resolve(second))
  }
  return paint in EXTREMES ? EXTREMES[paint as keyof typeof EXTREMES] : tokens.hexOf(paint as tokens.Token)
}

/**
 * Writes the stylesheet setting one custom property per role, each through
 * `light-dark()`, which follows the `color-scheme` the default theme sets from
 * its `dark` class.
 */
export function rolesSheet(roles: Record<string, Role> = ROLES): string {
  return tokens.rootRule(Object.entries(roles).map(([role, { dark, light }]): [string, string] =>
    [role, `light-dark(${cssOf(light)}, ${cssOf(dark)})`]))
}
