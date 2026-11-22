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
  'data/files.md'         : [{ draw: 'commands', region: 'layout' }],
  'data/lengths.md'       : [{ draw: 'eras', region: 'lengths' }, { draw: 'results', region: 'outcomes' }],
  'data/omitted.md'       : [{ draw: 'ledger', region: 'ledger' }, { draw: 'floor', region: 'floors' }],
  'data/sources.md'       : [{ draw: 'files', region: 'sources' }],
  'develop/index.md'      : [{ after: 'Develop', draw: 'rails' }],
  'guide/index.md'        : [{ after: 'A First Match', draw: 'rails' }],
  'guide/matching.md'     : [{ draw: 'refused', region: 'refused' }],
  'guide/studying.md'     : [{ after: 'Studying a Match', draw: 'menu' }],
  'identity/faces.md'     : [{ draw: 'faces', region: 'faces' }, { draw: 'pieces', region: 'pieces' }],
  'identity/index.md'     : [{ after: 'Identity', draw: 'rails' }],
  'methods/index.md'      : [{ after: 'Methods', draw: 'stops' }],
  'methods/runs.md'       : [{ after: 'Stepping Through a Match', draw: 'run' }],
  'reference/commands.md' : [{ after: 'The Commands', draw: 'commands' }],
  'reference/index.md'    : [{ after: 'Reference', draw: 'rails' }],
  'reference/match.md'    : [{ draw: 'exported', region: 'export' }],

  'data/index.md': [
    { after: 'Data', draw: 'rails' },
    { after: 'Data', draw: 'sieve' },
    { draw: 'decades', region: 'decades' }
  ],

  'data/shared.md': [
    { draw: 'parting', region: 'parting' },
    { draw: 'partings', region: 'partings' },
    { draw: 'crowding', region: 'crowding' }
  ],

  'data/tags.md': [
    { draw: 'carried', region: 'carried' },
    { draw: 'dated', region: 'dated' },
    { draw: 'tie', region: 'order' }
  ],

  'guide/store.md': [
    { after: 'Fetching the Files', draw: 'handoff' },
    { draw: 'archives', region: 'archives' }
  ],

  'identity/marks.md': [
    { draw: 'marks', region: 'marks' },
    { draw: 'construction', region: 'construction' }
  ],

  'identity/palette.md': [
    { draw: 'palette', region: 'palette' },
    { draw: 'roles', region: 'roles' },
    { draw: 'series', region: 'series' }
  ],

  'index.md': [
    { after: 'Scotch', draw: 'opening' },
    { after: 'Data', draw: 'store' },
    { after: 'Guide', draw: 'session' },
    { after: 'Methods', draw: 'prints' },
    { after: 'Viewer', draw: 'split' }
  ]
}
