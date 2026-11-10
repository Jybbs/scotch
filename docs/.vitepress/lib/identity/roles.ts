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
export interface Role {
  dark  : Paint
  kind  : 'fill' | 'ground' | 'mark' | 'rule' | 'text'
  light : Paint
}

const EXTREMES = { black: '#000000', white: '#ffffff' } as const
/**
 * Each color the site draws with, by the role it plays, in the light scheme and
 * the dark one, as `Identity` declares them, which the stylesheet the identity's
 * plugin serves sets as one custom property per role and the theme maps the
 * default theme's own variables onto.
 */
export const ROLES = tokens.IDENTITY.roles as unknown as Readonly<Record<keyof typeof tokens.IDENTITY.roles, Role>>

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
