import type { RoleName } from './palette.ts'

/**
 * The roles in the order the drawing steps through them, the grounds first, then
 * the rule and the text, then what a chart and a board draw.
 */
export const ORDER = [
  'page', 'side', 'raised', 'tint', 'rule', 'ink', 'quiet', 'run', 'alert', 'submitted', 'stored',
  'data_black', 'data_edge', 'front_paper', 'front_hollow', 'glyph_light', 'glyph_dark'
] as const satisfies readonly RoleName[]
/**
 * The place of the role the drawing opens on and closes on.
 */
export const START = ORDER.indexOf('run')

/**
 * Writes what a role holds against the page in one scheme, which the page itself
 * does not state.
 */
export function heldLine(role: RoleName, ratio: number): string {
  return role === 'page' ? 'The page itself' : `${ratio.toFixed(2)}:1 on the page`
}
