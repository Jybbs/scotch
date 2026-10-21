/**
 * Names the card a page's link preview shows, one per page named for its
 * address, where the front page and the not-found page share the site's.
 */
export function cardOf(relativePath: string): string {
  const route = routeOf(relativePath)
  if (route === '/' || route === '/404') return '/cards/site.png'
  return `/cards/${route.replaceAll(/^\/|\/$/gu, '').replaceAll('/', '-')}.png`
}

/**
 * Writes the clean address of a page from its path under `docs/pages/`, an
 * overview taking its folder's address with a closing slash and every other
 * page its name with no `.html`, as `cleanUrls` serves them.
 */
export function routeOf(relativePath: string): string {
  const route = `/${relativePath.replace(/\.md$/u, '')}`
  return route.endsWith('/index') ? route.slice(0, -'index'.length) : route
}
