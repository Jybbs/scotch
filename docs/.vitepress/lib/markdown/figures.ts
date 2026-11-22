/**
 * Reads the figure a page sets between `<!-- name -->` and `<!-- /name -->`,
 * the value `scotch render docs` writes there.
 *
 * Raises:
 *   Error: Where the page carries no such pair of markers.
 */
export function figureOf(page: string, name: string): string {
  const open  = `<!-- ${name} -->`
  const start = page.indexOf(open)
  const end   = page.indexOf(`<!-- /${name} -->`, start)
  if (start === -1 || end === -1) throw new Error(`no figure ${name}`)
  return page.slice(start + open.length, end).trim()
}
