import { contrast }                         from '../identity/colors.ts'
import { type Paint, ROLES, resolve }       from '../identity/roles.ts'
import { IDENTITY, type Token, hexOf }      from '../identity/tokens.ts'

export type RoleName = keyof typeof ROLES
export type Scheme   = (typeof SCHEMES)[number]

/**
 * The palette's colors in the order the rank sets them, the lead and the grounds
 * first, then the series, then the two states.
 */
export const TOKENS = [
  'primary', 'light', 'ground', 'dark', 'series_1', 'series_2',
  'series_3', 'series_4', 'series_5', 'series_6', 'warning', 'critical'
] as const satisfies readonly Token[]
/**
 * The site's two schemes, in the order every drawing sets them.
 */
export const SCHEMES = ['light', 'dark'] as const
/**
 * The roles every other role sits on, each a ground a color's contrast is read
 * against.
 */
export const GROUNDS = (Object.keys(ROLES) as RoleName[]).filter(role => ROLES[role].kind === 'ground')
/**
 * The ratios the scale of contrast marks, the two a role's kind holds to among
 * them.
 */
export const GATES = { mark: 3, text: 4.5 } as const
export const TICKS = [1, GATES.mark, GATES.text, 7, 21] as const

function partsOf(paint: Paint): readonly string[] {
  return typeof paint === 'string' ? [paint] : [paint[0], paint[2]]
}

/**
 * Reads a role's color in one scheme as a hex.
 */
export function colorOf(role: RoleName, scheme: Scheme): string {
  return resolve(ROLES[role][scheme])
}

/**
 * Reads what a palette color holds against a ground in one scheme.
 */
export function heldOf(token: Token, ground: RoleName, scheme: Scheme): number {
  return contrast(hexOf(token), colorOf(ground, scheme))
}

/**
 * Names what a contrast ratio is good for, text from 4.5 to 1, a mark from 3 to
 * 1, and a fill below that.
 */
export function levelOf(ratio: number): 'fill' | 'mark' | 'text' {
  if (ratio >= GATES.text) return 'text'
  return ratio >= GATES.mark ? 'mark' : 'fill'
}

/**
 * Places a contrast ratio along the scale of contrast, as a share from 1:1 to
 * 21:1 on a logarithmic scale.
 */
export function logShare(ratio: number): number {
  return Math.log(ratio) / Math.log(21)
}

/**
 * Places a tick of the scale as a percentage of its width, inset so the figures
 * at either end stay inside it, the last one standing at the far edge.
 */
export function tickAt(ratio: number): number {
  return ratio === TICKS.at(-1) ? 100 : logShare(ratio) * 96 + 2
}

/**
 * Reads what a palette color is for, on one line.
 */
export function meaningOf(token: Token): string {
  return IDENTITY.meanings.palette[token]
}

/**
 * Picks the palette's lighter or darker ground for text set on a color, by which
 * of them holds more against it.
 */
export function onColorOf(token: Token): string {
  const [light, dark] = [hexOf('ground'), hexOf('dark')]
  return contrast(light, hexOf(token)) >= contrast(dark, hexOf(token)) ? light : dark
}

/**
 * Writes a paint as a reader reads it, a token as it stands and a mix as its
 * first token, its share, and its second token.
 */
export function paintWord(paint: Paint): string {
  return typeof paint === 'string' ? paint : `${paint[0]} ${paint[1]}% ${paint[2]}`
}

/**
 * Reads the roles a palette color takes in either scheme, each beside whether a
 * scheme takes the color in a mix.
 */
export function rolesOf(token: Token): (readonly [RoleName, boolean])[] {
  return (Object.keys(ROLES) as RoleName[]).flatMap(role => {
    const paints = SCHEMES.map(scheme => ROLES[role][scheme]).filter(paint => partsOf(paint).includes(token))
    return paints.length > 0 ? [[role, paints.some(paint => typeof paint !== 'string')] as const] : []
  })
}
