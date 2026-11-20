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
 * Reads the `data-off` a part of a figure takes while a mark of its corner is
 * lit, set on every part the lit mark does not name and absent otherwise.
 */
export function dimmed(key: string, lit: string | null): '' | undefined {
  return lit !== null && lit !== key ? '' : undefined
}
