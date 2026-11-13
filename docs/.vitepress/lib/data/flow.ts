import { tenth } from './numbers.ts'
import * as tie  from './tie.ts'

/**
 * One bar of the band carrying both ratings, a bin's games as tall as their
 * count against the bin holding the most, standing in a column a pointer
 * reads, from `column` across `width` pixels.
 */
interface Bar {
  column : number
  height : number
  width  : number
  y      : number
}

/**
 * The band of the games carrying both ratings drawn by the mean of the two:
 * its bars, the foot they rise from, the label's start, the pin of each tied
 * game carrying both, and the labeled means beneath the bars.
 */
export interface Band {
  bars  : readonly Bar[]
  foot  : number
  left  : number
  pins  : readonly Point[]
  ticks : readonly (readonly [number, number])[]
}

/**
 * Where the figure of the tie order draws at a width: the height of the band
 * carrying both ratings, the step between the lanes, the figure's height, the
 * lanes, the middle of each lane's end, whether the places sit beneath the
 * flow rather than beside it, the width of the flow, the width of the source
 * and of each lane's end, the height of every stored game, the places of the
 * two tests, and the top of the source.
 */
export interface FlowLayout {
  both    : number
  gap     : number
  height  : number
  lanes   : readonly Lane[]
  middles : readonly number[]
  narrow  : boolean
  plot    : number
  stub    : number
  tall    : number
  tests   : readonly [number, number]
  top     : number
}

/**
 * The values the figure of the tie order is drawn to: the run each lane eases
 * over at a test, the step between the lanes below and past `narrow`, the
 * width under which the places sit beneath the flow, the width the places
 * take beside it, the width of the source, the height of every stored game,
 * the places of the two tests as shares of the flow's width, and the room
 * above the source.
 */
interface FlowOptions {
  ease   : number
  gaps   : readonly [number, number]
  narrow : number
  side   : number
  stub   : number
  tall   : number
  tests  : readonly [number, number]
  top    : number
}

/**
 * A lane's points from the source to its end, each a place across the flow
 * beside the lane's top and foot there.
 */
type Lane = readonly (readonly [number, number, number])[]

/**
 * A place in the figure, across and down from its top left corner.
 */
type Point = readonly [number, number]

/**
 * The values the figure of the tie order is drawn to.
 */
const FLOW: FlowOptions = {
  ease   : 26,
  gaps   : [24, 74],
  narrow : 480,
  side   : 238,
  stub   : 12,
  tall   : 196,
  tests  : [0.3, 0.6],
  top    : 34
}
/**
 * The means the band labels beneath its bars.
 */
const TICKS = [2300, 2500, 2700]

/**
 * Writes the edge of a run of lane points at their top or their foot as an SVG
 * path, each step a curve easing across the middle between two points.
 */
function curve(points: readonly (readonly number[])[], at: 1 | 2): string {
  return points.map((point, index) => {
    if (!index) return `M${tenth(point[0]!)},${tenth(point[at]!)}`
    const before = points[index - 1]!
    const middle = tenth((before[0]! + point[0]!) / 2)
    const to     = tenth(point[at]!)
    return `C${middle},${tenth(before[at]!)} ${middle},${to} ${tenth(point[0]!)},${to}`
  }).join('')
}

/**
 * Reads the depth in its lane at which a tied game's path runs, a game
 * carrying both at its pin and any other spread evenly over the tied games
 * of its kind.
 */
function depthOf(band: Band, game: tie.TiedGame, layout: FlowLayout): number {
  const same = tie.ratingKinds[2 - game.rated]!.games
  const at   = same.indexOf(game)
  return game.rated === 2 ? (band.pins[at]![1] - layout.top) / layout.both : (at + 0.5) / same.length
}

/**
 * Lays out the band carrying both ratings, a bar per bin of `meanBins` rising
 * from the band's foot past the first test, each tied game carrying both
 * pinned above the bars at its mean, the pins alternating in height.
 */
export function bandOf(layout: FlowLayout): Band {
  const left  = layout.tests[0] + 8
  const width = (layout.plot - layout.stub - 4 - left) / tie.meanBins.length
  const foot  = layout.top + layout.both - 16
  const room  = foot - layout.top - 62
  const most  = Math.max(...tie.meanBins.map(bin => bin.games))
  const first = tie.meanBins[0]!.high!
  const step  = tie.meanBins[1]!.high! - first
  const at    = (mean: number): number => left + ((mean - first) / step + 1) * width
  return {
    bars: tie.meanBins.map((bin, index) => {
      const tall = Math.max(1.5, bin.games / most * room)
      return { column: left + index * width, height: tall, width: width, y: foot - tall }
    }),
    foot  : foot,
    left  : left,
    pins  : tie.ratingKinds[0]!.games.map((game, index) => [at(game.key!), layout.top + 26 + index % 2 * 20]),
    ticks : TICKS.map(mean => [at(mean), mean])
  }
}

/**
 * Lays out the figure of the tie order across `width` pixels, one lane per kind
 * of rating leaving a single source, each as tall as its share of the stored
 * games, the second and third stepping below the first at each of the order's
 * two tests.
 */
export function flowLayout(width: number, options: FlowOptions = FLOW): FlowLayout {
  const { ease, stub, tall, top } = options
  const narrow                    = width < options.narrow
  const plot                      = width - (narrow ? 0 : options.side)
  const gap                       = options.gaps[Number(!narrow)]!
  const [both, one]               = tie.ratingKinds.map(kind => kind.share * tall) as [number, number]
  const [x1, x2]                  = options.tests.map(test => plot * test) as [number, number]
  const [upper, lower, foot]      = [top + both, top + both + one, top + tall]
  const lanes: Lane[] = [
    [[stub, top, upper], [plot - stub, top, upper]],
    [
      [stub, upper, lower], [x1 - ease, upper, lower], [x1 + ease, upper + gap, lower + gap],
      [plot - stub, upper + gap, lower + gap]
    ],
    [
      [stub, lower, foot], [x1 - ease, lower, foot], [x1 + ease, lower + gap, foot + gap],
      [x2 - ease, lower + gap, foot + gap], [x2 + ease, lower + 2 * gap, foot + 2 * gap],
      [plot - stub, lower + 2 * gap, foot + 2 * gap]
    ]
  ]
  return {
    both    : both,
    gap     : gap,
    height  : top + tall + 2 * gap + 8,
    lanes   : lanes,
    middles : lanes.map(lane => (lane.at(-1)![1] + lane.at(-1)![2]) / 2),
    narrow  : narrow,
    plot    : plot,
    stub    : stub,
    tall    : tall,
    tests   : [x1, x2],
    top     : top
  }
}

/**
 * Writes a tied game's path through its lane as an SVG path, beside the points
 * it starts and ends on.
 */
export function pathOf(band: Band, game: tie.TiedGame, layout: FlowLayout): { d: string, ends: Point[] } {
  const depth  = depthOf(band, game, layout)
  const points = layout.lanes[2 - game.rated]!.map(([x, top, foot]): Point => [x, top + depth * (foot - top)])
  return { d: curve(points, 1), ends: [points[0]!, points.at(-1)!] }
}

/**
 * Writes a lane as a closed SVG path, along its top from the source and back
 * along its foot.
 */
export function ribbonOf(lane: Lane): string {
  return `${curve(lane, 1)}${curve(lane.toReversed(), 2).replace(/^M/u, 'L')}Z`
}
