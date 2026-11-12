import type { Listed } from '../../../../lib/data/files.ts'

/**
 * Fourteen files across the three sections: four Players archives, one of
 * them undated, five Events files, one of them undated, and five Openings
 * archives under three first moves, `Bird.zip` filed under both the Players and
 * the Openings.
 */
export const SAMPLE_LISTED: Listed[] = [
  file('players/Bird.zip', 'Players', 'Henry Bird', 8, { 1850: 3, 1880: 5 }, 1885),
  file('players/Carlsen.zip', 'Players', 'Magnus Carlsen', 60, { 2000: 20, 2010: 40 }, 2015),
  file('players/Morphy.zip', 'Players', 'Paul Morphy', 10, { 1850: 10 }, 1858),
  file('players/Undated.zip', 'Players', 'Nobody Known', 0, {}, null),
  file('events/Candidates1950.pgn', 'Events', 'Candidates 1950', 12, { 1950: 12 }, 1950, 'Candidates and Interzonals'),
  file('events/Linares1994.pgn', 'Events', 'Linares 1994', 30, { 1990: 30 }, 1994, 'Tournaments'),
  file('events/Nameless.pgn', 'Events', 'Nameless', 0, {}, null, 'Tournaments'),
  file('events/WorldChamp1886.pgn', 'Events', 'Steinitz - Zukertort 1886', 20, { 1880: 20 }, 1886, 'World Championships'),
  file('events/WorldChamp2018.pgn', 'Events', 'Carlsen - Caruana 2018', 15, { 2010: 15 }, 2018, 'World Championships'),
  file('openings/Bird.zip', 'Openings', 'Bird', 40, { 1990: 40 }, 1995, 'Flank', '1.f4'),
  file('openings/Dragon.zip', 'Openings', 'Dragon', 50, { 2000: 50 }, 2004, 'Sicilian', '1.e4 c5 2.Nf3 d6 3.d4, cxd4'),
  file('openings/French.zip', 'Openings', 'French', 70, { 2000: 70 }, 2003, 'French', '1.e4 e6'),
  file('openings/Najdorf.zip', 'Openings', 'Najdorf', 100, { 2000: 60, 2010: 40 }, 2008, 'Sicilian', '1.e4 c5 2.Nf3 d6'),
  file('openings/QGD.zip', 'Openings', 'Queen’s Gambit Declined', 30, { 2000: 30 }, 2001, 'Closed', '1.d4 d5 2.c4 e6')
]

/**
 * Builds one listed file.
 */
function file(
  path    : string,
  section : string,
  title   : string,
  games   : number,
  decades : Record<string, number>,
  year    : number | null,
  group   : string | null = null,
  moves   : string | null = null
): Listed {
  return { decades, file: path, games, group, moves, section, title, year }
}
