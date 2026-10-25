/**
 * The icons the Viewer's actions carry, each drawn on a 24-unit square in the
 * current color's stroke: the link the link's copy carries, the check a copy
 * turns into once done, the file the picker opens, the page of moves the PGN
 * copy carries, and the page the PGN entry takes.
 */
export const ICONS = {
  done  : '<svg class="sc-viewer-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 '
        + '6.5"/></svg>',
  file  : '<svg class="sc-viewer-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 '
        + '2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14l3 3 '
        + '3-3"/></svg>',
  link  : '<svg class="sc-viewer-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 '
        + '7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 '
        + '7l1.7-1.7"/></svg>',
  pgn   : '<svg class="sc-viewer-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 '
        + '2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
  paste : '<svg class="sc-viewer-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="4" width="10" '
        + 'height="4" rx="1"/><path d="M7 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 '
        + '0-2-2h-1"/><path d="M8 13h8M8 17h5"/></svg>'
} as const
