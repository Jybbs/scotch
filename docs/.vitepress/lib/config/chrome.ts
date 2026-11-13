import type { DefaultTheme } from 'vitepress'

import { IDENTITY }                    from '../identity/tokens.ts'
import type { ProjectFacts, Provider } from '../site/manifest.ts'
import type { Piece }                  from '../site/pieces.ts'

/**
 * The set the colophon lays out, each credit in its well, beside the line it
 * reads until a piece is chosen.
 */
export interface Colophon {
  credits : readonly Credit[]
  rest    : readonly Run[]
}

/**
 * One fact the colophon sets beneath every page, standing under a white piece:
 * the piece and its name, the label over the fact, the fact in short beneath
 * the label, and the line spelling the fact out in full once the piece is
 * chosen.
 */
export interface Credit {
  full  : readonly Run[]
  name  : string
  part  : string
  piece : Piece
  short : string
}

/**
 * One run of a line the colophon spells out, plain text or text set apart,
 * linking an address where `href` names one, in code where `code` is true, and
 * in italics where `italic` is true.
 */
export type Run = string | { code?: boolean, href?: string, italic?: boolean, text: string }

/**
 * The default theme's configuration beside the colophon the site sets beneath
 * every page in place of the default theme's footer.
 */
export interface SiteTheme extends DefaultTheme.Config {
  colophon: Colophon
}

/**
 * The page each license the site names is published at, beside the short name
 * the colophon's well sets where it differs from the name, keyed by the name
 * the manifest or the identity gives it.
 */
const LICENSES: Readonly<Record<string, { href: string, short?: string }>> = {
  'GPL-3.0-or-later'          : { href: 'https://www.gnu.org/licenses/gpl-3.0.html' },
  'SIL Open Font License 1.1' : { href: 'https://openfontlicense.org', short: 'SIL OFL 1.1' }
}
/**
 * The words the page a reader meets at an address the site carries no page for
 * sets in place of the default theme's, and the address its one link leads to.
 */
export const NOT_FOUND: DefaultTheme.NotFoundOptions = {
  link      : '/',
  linkLabel : 'Go to the front page',
  linkText  : 'Back to the Front Page',
  quote     : 'The site carries no page at this address, which may name a page since renamed.',
  title     : 'No Page Here'
}
/**
 * The chess pieces python-chess draws, by Cburnett, beside the license and the
 * page Wikimedia Commons lists them under.
 */
const PIECES = {
  author  : 'Cburnett',
  href    : 'https://commons.wikimedia.org/wiki/File:Chess_klt45.svg',
  license : '3-clause BSD license',
  short   : 'Cburnett, BSD'
}
/**
 * Joins items as an English list, with a comma before *and* once three or more
 * are listed.
 */
const conjunction = new Intl.ListFormat('en-US', { type: 'conjunction' })

/**
 * Sets the King over the commit the site was built from, linking the commit
 * on the repository's host.
 */
function builtFrom(commit: string, repo: { href: string, text: string }): Credit {
  const link = { code: true, href: `${repo.href}/commit/${commit}`, text: commit }
  return {
    full  : ['Built from ', link, ' of ', repo, '.'],
    name  : 'King',
    part  : 'Built from',
    piece : 'K',
    short : commit
  }
}

/**
 * Reads the page a license is published at and its short name, by the name the
 * manifest or the identity gives it, failing by name where the site knows no
 * page for it.
 */
function licenseOf(name: string): { link: Run, short: string } {
  const known = LICENSES[name]
  if (known === undefined) throw new TypeError(`no page known for the license ${name}`)
  return { link: { href: known.href, text: name }, short: known.short ?? name }
}

/**
 * Sets runs out as an English list, a comma between each and the next, and
 * *and* before the last, with no comma before it where only two are listed.
 */
function listed(runs: readonly Run[]): Run[] {
  const parts = conjunction.formatToParts(runs.map((_, i) => String(i)))
  return parts.flatMap(({ type, value }) => type === 'element' ? runs.slice(+value, +value + 1) : value)
}

/**
 * Lays out the colophon closing every page: the commit the site was built from
 * where the build knows one, the repository and the license its code carries,
 * the providers the store's games come from, the faces and their license, and
 * the pieces by their author, over a line naming the version and the license
 * until a piece is chosen.
 *
 * Args:
 *   commit    : The commit the site was built from, or `undefined` where the
 *     build knows none.
 *   facts     : What the manifest states about the project.
 *   providers : The sites the declared sources name.
 */
export function colophonOf(
  commit    : string | undefined,
  facts     : ProjectFacts,
  providers : readonly Provider[]
): Colophon {
  const code   = licenseOf(facts.license)
  const repo   = { href: facts.repository, text: new URL(facts.repository).pathname.slice(1) }
  const faces  = Object.values(IDENTITY.faces)
  const fonts  = [...new Set(faces.map(face => face.license))].map(name => licenseOf(name))
  const family = listed(faces.map(face => face.family))
  const games  = providers.map(provider => ({ href: provider.home, text: provider.name }))
  const pieces = { href: PIECES.href, text: PIECES.license }

  return {
    credits: [...commit === undefined ? [] : [builtFrom(commit, repo)], {
      full  : ['The code at ', repo, ', under the ', code.link, '.'],
      name  : 'Queen',
      part  : 'Code',
      piece : 'Q',
      short : repo.text
    }, {
      full  : ['Every game from the grandmaster files of ', ...listed(games), '.'],
      name  : 'Rook',
      part  : 'Games',
      piece : 'R',
      short : conjunction.format(providers.map(provider => provider.name))
    }, {
      full  : [...family, ', under the ', ...listed(fonts.map(font => font.link)), '.'],
      name  : 'Knight',
      part  : 'Faces',
      piece : 'N',
      short : conjunction.format(fonts.map(font => font.short))
    }, {
      full  : [`Pieces drawn by ${PIECES.author}, under the `, pieces, '.'],
      name  : 'Pawn',
      part  : 'Pieces',
      piece : 'P',
      short : PIECES.short
    }],
    rest: [{ italic: true, text: 'Scotch' }, ` ${facts.version}, under the `, code.link, '.']
  }
}
