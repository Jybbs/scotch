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
  'data/omitted.md' : [{ draw: 'ledger', region: 'ledger' }, { draw: 'floor', region: 'floors' }],
  'data/tags.md'    : [{ draw: 'carried', region: 'carried' }, { draw: 'dated', region: 'dated' }],
  'guide/store.md'  : [{ draw: 'archives', region: 'archives' }],
  'methods/runs.md' : [{ after: 'Stepping Through a Match', draw: 'run' }],

  'data/shared.md': [
    { draw: 'parting', region: 'parting' },
    { draw: 'partings', region: 'partings' },
    { draw: 'crowding', region: 'crowding' }
  ],

  'index.md': [
    { after: 'Data', draw: 'store' },
    { after: 'Guide', draw: 'session' },
    { after: 'Methods', draw: 'prints' },
    { after: 'Viewer', draw: 'split' }
  ],

  'reference/identity.md': [
    { draw: 'palette', region: 'palette' },
    { draw: 'roles', region: 'roles' },
    { draw: 'series', region: 'series' },
    { draw: 'faces', region: 'faces' },
    { draw: 'pieces', region: 'pieces' },
    { draw: 'marks', region: 'marks' },
    { draw: 'construction', region: 'construction' }
  ]
}
