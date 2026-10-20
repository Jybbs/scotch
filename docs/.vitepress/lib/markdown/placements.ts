export interface Placement {
  draw    : string
  after?  : string
  region? : string
}

/**
 * The name the theme registers the component placing a widget under, which a
 * page never writes, since the renderer inserts it.
 */
export const FIGURE = 'ScotchFigure'
/**
 * Which widget sits after which section of which page, matched on the heading's
 * own words, or over which region, matched on the name its markers carry, so
 * renaming a section or a region moves its widget or fails the suite.
 */
export const PLACED: Readonly<Record<string, readonly Placement[]>> = {
  'data/index.md'   : [{ draw: 'decades', region: 'decades' }, { draw: 'files', region: 'sources' }],
  'data/lengths.md' : [{ draw: 'eras', region: 'lengths' }, { draw: 'results', region: 'outcomes' }],
  'guide/store.md'  : [{ draw: 'archives', region: 'archives' }],
  'methods/runs.md' : [{ after: 'Stepping Through a Match', draw: 'run' }]
}
