/**
 * One run two games share: the submitted game's ply it starts at, the stored
 * game's ply less the submitted game's along it, and the positions it holds.
 */
export interface Run {
  length : number
  offset : number
  start  : number
}

/**
 * The sizes a track draws at, in the units of its view box: the height between
 * the two lines where they run apart, the radius of a station, the margin
 * left around the lines for the stations and markers, and the step between two
 * positions.
 */
export const TRACK = { apart: 22, dot: 3.2, margin: 6, step: 16 } as const

const longestIn = (runs: readonly Run[]): Run | undefined => runs.toSorted((a, b) => b.length - a.length)[0]

/**
 * Two games as a track draws them: the last ply each plays, the runs they
 * share, the plies the track draws a station for, the longer game's, and the
 * longest run, the one the match counts.
 */
export class Pair {
  readonly columns : number
  readonly longest : Run
  readonly plies   : readonly [number, number]
  readonly runs    : readonly Run[]

  constructor(plies: readonly [number, number], runs: readonly Run[]) {
    this.plies   = plies
    this.runs    = runs
    this.columns = Math.max(...plies) + 1
    this.longest = longestIn(runs)!
  }

  /**
   * Reads the run a ply of the submitted game falls in, the longest where two
   * do.
   */
  runAt(ply: number): Run | undefined {
    return longestIn(this.runs.filter(run => ply >= run.start && ply < run.start + run.length))
  }

  /**
   * Counts the positions in a row the two games have shared up to a ply, 0
   * where they differ there.
   */
  inRow(ply: number): number {
    const run = this.runAt(ply)
    return run ? ply - run.start + 1 : 0
  }

  /**
   * Reads the height a game's line stands at on a ply: the middle wherever the
   * two games share the position, and its own side wherever they differ, the
   * submitted game above.
   */
  heightAt(lane: number, ply: number): number {
    if (this.runAt(ply)) return TRACK.apart / 2
    return lane ? TRACK.apart : 0
  }

  /**
   * Writes the path a game's line takes through each of its stations, easing
   * between heights wherever it joins or leaves the shared line.
   */
  lineOf(lane: number): string {
    return Array.from({ length: this.plies[lane]! + 1 }, (_, ply) => {
      const x   = ply * TRACK.step
      const row = this.heightAt(lane, ply)
      if (ply === 0) return `M ${x} ${row}`
      const back = (ply - 0.5) * TRACK.step
      return `C ${back} ${this.heightAt(lane, ply - 1)} ${back} ${row} ${x} ${row}`
    }).join(' ')
  }

  /**
   * Writes the line naming what the two games do at a ply: stand on two
   * positions, stand on one for so many in a row, or part, at the ply past the
   * longest run.
   */
  statusAt(ply: number): string {
    const row = this.inRow(ply)
    if (ply === this.longest.start + this.longest.length) return `Ply ${ply} · they part`
    if (row === 0) return `Ply ${ply} · two positions`
    return `Ply ${ply} · one position, ${row} in a row`
  }
}
