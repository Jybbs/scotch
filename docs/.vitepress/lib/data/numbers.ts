type Points = readonly (readonly [number, number])[]

/**
 * Runs a list of counts into the running totals they reach, so each entry holds
 * its own count and every count before it.
 */
export function accumulated(counts: readonly number[]): number[] {
  let running = 0
  return counts.map(count => running += count)
}

/**
 * Writes a count with a comma between each group of three digits, such as
 * `12,345`.
 */
export function counted(count: number): string {
  return count.toLocaleString('en-US')
}

/**
 * Writes an SVG path through a run of points, moving to the first and drawing a
 * line to each after it, each coordinate rounded to a tenth of a pixel, and,
 * where a foot is given, on through the foot's points and closed back to the
 * first.
 */
export function pathThrough(points: Points, foot?: Points): string {
  const line = [...points, ...foot ?? []]
    .map(([x, y], index) => `${index ? 'L' : 'M'}${tenth(x)} ${tenth(y)}`)
    .join('')
  return foot ? `${line}Z` : line
}

/**
 * Writes a share between 0 and 1 as a percentage with the digits given after
 * the point, such as `51%` or `14.0%`.
 */
export function percent(share: number, digits = 0): string {
  return `${(share * 100).toFixed(digits)}%`
}

/**
 * Finds the places a list of running totals reaches a quarter, a half, and
 * three quarters of its last total.
 */
export function quartiles(totals: readonly number[]): [number, number, number] {
  return [reaching(totals, 0.25), reaching(totals, 0.5), reaching(totals, 0.75)]
}

/**
 * Finds the first place a list of running totals reaches a share of its last
 * total, which for a list of games counted by move is the fewest moves at least
 * that share of the games end by.
 */
export function reaching(totals: readonly number[], share: number): number {
  const goal = share * (totals.at(-1) ?? 0)
  return totals.findIndex(total => total >= goal)
}

/**
 * Sums a list of counts.
 */
export function summed(counts: readonly number[]): number {
  return counts.reduce((total, count) => total + count, 0)
}

/**
 * Sums each column of a list of rows across `width` columns, the widest row's
 * unless told otherwise, a row too short to reach a column counting 0 there.
 */
export function summedColumns(
  rows  : readonly (readonly number[])[],
  width : number = Math.max(0, ...rows.map(row => row.length))
): number[] {
  return Array.from({ length: width }, (_, column) => summed(rows.map(row => row[column] ?? 0)))
}

/**
 * Rounds a coordinate to a tenth of a pixel, which keeps a path's text short at
 * no cost to how it draws.
 */
export function tenth(value: number): number {
  return Math.round(value * 10) / 10
}
