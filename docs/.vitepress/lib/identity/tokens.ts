import identity from '../rendered/identity.json' with { type: 'json' }

export type Face  = keyof typeof identity.faces
export type Token = keyof typeof identity.palette

export const IDENTITY = identity

/**
 * Reads the hex of a palette token, such as `#764017` for `primary`.
 */
export function hexOf(token: Token): string {
  return identity.palette[token].hex
}

/**
 * Names the custom property a palette token, a face, or a role takes, such as
 * `--sc-series-1` for `series_1`, `--sc-face-body` for `face-body`, and
 * `--sc-quiet` for `quiet`.
 */
export function propertyOf(name: string): string {
  return `--sc-${name.replaceAll('_', '-')}`
}

/**
 * Writes a `:root` rule setting the custom property each name takes to its
 * value, each on a row of its own.
 */
export function rootRule(properties: readonly (readonly [string, string])[]): string {
  const rows = properties.map(([name, value]) => `  ${propertyOf(name)}: ${value};`)
  return `:root {\n${rows.join('\n')}\n}\n`
}
