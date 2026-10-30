import type { DefaultTheme } from 'vitepress'

/**
 * The line every page closes on, naming the license the code carries, the one
 * the faces carry, and the one the chess pieces carry beside their author, as
 * Wikimedia Commons lists them, each part set apart by a middle dot.
 */
export const FOOTER: DefaultTheme.Footer = {
  message: [
    'Code under the <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-or-later</a>',
    'faces under the <a href="https://openfontlicense.org">SIL Open Font License</a>',
    'pieces by Cburnett under the '
      + '<a href="https://commons.wikimedia.org/wiki/File:Chess_klt45.svg">3-clause BSD license</a>'
  ].join(' · ')
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
