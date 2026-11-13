/**
 * One mark of a figure's corner: the part of the figure it lights, or `null`
 * for one naming a color alone, its label, and the color its swatch takes,
 * beside the glyph it shows in the swatch's place where it shows one.
 */
export interface CornerMark {
  key    : string | null
  label  : string
  tone   : string
  glyph? : string
}

/**
 * Reads the class a part of a figure takes while a mark of its corner is lit,
 * dimming every part the lit mark does not name.
 */
export function dimmed(key: string, lit: string | null): { 'sc-data-off': boolean } {
  return { 'sc-data-off': lit !== null && lit !== key }
}
