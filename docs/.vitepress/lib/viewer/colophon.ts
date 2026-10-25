/**
 * One figure the strip closing the Viewer names, beside its label.
 */
export interface Stat {
  label : string
  value : string
}

/**
 * Lists the figures the strip closing the Viewer names: the version the
 * manifest declares, the commit the site was built from where the build knows
 * one, and the games and positions the index holds, each count grouped by
 * thousands.
 *
 * Args:
 *   commit  : The commit the site was built from, or `undefined` where the
 *     build knows none.
 *   held    : The games and the positions the index holds.
 *   version : The version the manifest declares.
 */
export function statsOf(
  commit  : string | undefined,
  held    : { games: number, positions: number },
  version : string
): Stat[] {
  return [
    { label: 'Version', value: version },
    ...commit ? [{ label: 'Commit', value: commit }] : [],
    { label: 'Games', value: held.games.toLocaleString('en-US') },
    { label: 'Positions', value: held.positions.toLocaleString('en-US') }
  ]
}
