import rendered from '../rendered/viewer.json' with { type: 'json' }

type Rendered = (typeof rendered)[Sample]

/**
 * A match file as `scotch match game --json` writes it, typed from the two
 * examples `scotch render docs` writes: the submitted game, and the run the two
 * games share beside the stored game, both `null` where no stored game shares a
 * position with the submitted one.
 */
export type Match = Omit<Rendered, 'stored' | 'submitted'> & { stored: Side | null, submitted: Side }

/**
 * The name of each example the Viewer offers, the match it opens on and the
 * demo game alone.
 */
export type Sample = keyof typeof rendered

/**
 * One game of a match, its moves in SAN and the placement of each position from
 * the start beside its tags, read as any tag a file may carry.
 */
export type Side = Omit<NonNullable<Rendered['stored']>, 'headers'> & {
  headers: Readonly<Record<string, string | undefined>>
}

/**
 * The two examples, each under its name.
 */
export const EXAMPLES: Readonly<Record<Sample, Match>> = rendered
/**
 * The examples in the order the intake offers them, each beside the chip naming
 * it and the file under `docs/public/games/` its game was read from.
 */
export const SAMPLES = [
  { label: 'Example match', name: 'match', source: 'viewer.pgn' },
  { label: 'No match',      name: 'alone', source: 'demo.pgn'   }
] as const satisfies readonly { label: string, name: Sample, source: string }[]
