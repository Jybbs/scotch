import { smooth, smoother }             from '../motion/timing.ts'
import { type Piece, ringed }           from '../site/pieces.ts'
import { matrixOf }                     from './drawing.ts'
import { SQUARE, type Trail, cornerOf } from './trail.ts'

/**
 * A change of one piece's opacity from `a0` to `a1` between two times, beside
 * the move that planned it, or none for a turn back.
 */
export interface Fade {
  a0   : number
  a1   : number
  plan : Plan | undefined
  t0   : number
  t1   : number
}

/**
 * One piece traveling along a trail between two times, inside the jump its move
 * belongs to, beside each fade tied to a length along the trail and the trails
 * a later move of the same jump was joined onto it from.
 */
export interface Leg {
  batch  : number
  from   : number
  merged : { from: number, t1: number, trail: Trail }[]
  plan   : Plan | undefined
  t0     : number
  t1     : number
  ties   : Tie[]
  trail  : Trail
}

/**
 * A move planned between two plies: each piece standing on each square before
 * it and once it lands, the travels and the fades it planned, the pieces it
 * made, the leg it joined onto inside a jump, and when it starts and lands.
 */
export interface Plan {
  a       : number
  after   : Map<number, Sprite>
  b       : number
  batch   : number
  before  : Map<number, Sprite>
  end     : number
  fades   : [Sprite, Fade][]
  legs    : [Sprite, Leg][]
  made    : Sprite[]
  merge?  : [Sprite, Leg]
  t0      : number
}

/**
 * Where a piece stands, how large, and how opaque, at one time.
 */
export interface Pose {
  a : number
  s : number
  x : number
  y : number
}

/**
 * One piece's node on the board beside its plan: where it rests between moves,
 * where it was last written, the legs and the fades still planned for it, and
 * when its last of each lands.
 */
export interface Sprite {
  end     : number
  fadeEnd : number
  fades   : Fade[]
  legs    : Leg[]
  live    : boolean
  node    : SVGGElement
  piece   : Piece
  rest    : Pose
  shown   : number
  written : Pose
}

/**
 * A fade tied to the time a leg reaches `length` along its trail, ending there
 * or starting there, so joining a later move onto the leg moves the fade too.
 */
export interface Tie {
  at     : 'end' | 'start'
  fade   : Fade
  lead   : number
  length : number
}

const SVG = 'http://www.w3.org/2000/svg'

/**
 * Reads a piece's opacity at time `t` from the fades planned for it, a fade
 * that starts while another still runs starting from where that one stands.
 */
function alphaAt(sprite: Sprite, t: number): number {
  const fades = sprite.fades
  if (fades.length === 0) return sprite.rest.a
  let fade: Fade | undefined
  let first = fades[0]!
  for (const each of fades) {
    if (each.t0 < first.t0) first = each
    if (each.t0 <= t && (!fade || each.t0 >= fade.t0)) fade = each
  }
  if (!fade) return first.a0
  if (t >= fade.t1) return fade.a1
  let prev: Fade | undefined
  for (const each of fades) {
    if (each !== fade && each.t0 <= fade.t0 && each.t1 > fade.t0 && (!prev || each.t0 >= prev.t0)) prev = each
  }
  const from = prev
             ? prev.a0 + (prev.a1 - prev.a0) * smooth((fade.t0 - prev.t0) / (prev.t1 - prev.t0))
             : fade.a0
  return from + (fade.a1 - from) * smooth((t - fade.t0) / (fade.t1 - fade.t0))
}

/**
 * Writes a piece's place and size at time `t` into `pose` from the legs planned
 * for it, a moving piece growing by `lift` at the middle of its leg.
 */
function placeAt(sprite: Sprite, lift: number, pose: Pose, t: number): void {
  Object.assign(pose, sprite.rest)
  pose.s = 1
  let leg: Leg | undefined
  for (const each of sprite.legs) {
    if (each.t0 > t) break
    leg = each
  }
  if (!leg) {
    if (sprite.legs.length > 0) sprite.legs[0]!.trail.at(0, pose)
    return
  }
  if (t >= leg.t1) {
    leg.trail.at(1, pose)
    return
  }
  const share = (t - leg.t0) / (leg.t1 - leg.t0)
  leg.trail.at(smoother(share), pose)
  pose.s = 1 + lift * Math.sin(Math.PI * share)
}

/**
 * Takes a piece's node with nothing planned for it and nothing written to it
 * yet, resting at full opacity.
 */
function still(node: SVGGElement, piece: Piece): Sprite {
  return {
    end     : 0,
    fadeEnd : 0,
    fades   : [],
    legs    : [],
    live    : false,
    node    : node,
    piece   : piece,
    rest    : { a: 1, s: 1, x: 0, y: 0 },
    shown   : -1,
    written : { a: Number.NaN, s: Number.NaN, x: Number.NaN, y: Number.NaN }
  }
}

/**
 * Reads where a piece stands, how large, and how opaque at time `t` from its
 * plan into `pose`, its resting place where nothing is planned.
 */
export function poseAt(sprite: Sprite, lift: number, pose: Pose, t: number): Pose {
  placeAt(sprite, lift, pose, t)
  pose.a = alphaAt(sprite, t)
  return pose
}

/**
 * The piece nodes of one board's layer, each kept mounted and reused, a node no
 * square holds hidden in a pool until a later piece of its kind takes it.
 */
export class Sprites {
  readonly #layer : SVGGElement
  readonly #pool  : Sprite[] = []

  /**
   * Takes the layer every piece's node is drawn in.
   */
  constructor(layer: SVGGElement) {
    this.#layer = layer
  }

  /**
   * Takes over each piece's node the layer already holds, as the build draws
   * them at rest, keyed by the square each stands on.
   */
  get adopted(): Map<number, Sprite> {
    return new Map([...this.#layer.querySelectorAll<SVGGElement>('.sc-viewer-piece')].map(node => {
      const square = Number(node.dataset.square)
      const rest   = { a: 1, s: 1, ...cornerOf(square) }
      return [square, { ...still(node, node.dataset.piece as Piece), rest, shown: 100, written: { ...rest } }]
    }))
  }

  /**
   * Lists every node the layer holds that a reader sees, at the square it
   * stands nearest and as the piece it draws, beside how far it stands off that
   * square's corner.
   */
  get shown(): { off: number, piece: Piece, square: number }[] {
    return [...this.#layer.children].flatMap(node => {
      const matrix = /matrix\(\S+ \S+ \S+ \S+ (\S+) ([^)]+)\)/u.exec(node.getAttribute('transform') ?? '')
      if (node.getAttribute('display') === 'none' || !Number(node.getAttribute('opacity'))) return []
      const [x, y]      = [Number(matrix?.[1]), Number(matrix?.[2])]
      const [file, row] = [Math.round(x / SQUARE), Math.round(y / SQUARE)]
      const off         = Math.abs(x - file * SQUARE) + Math.abs(y - row * SQUARE)
      return [{ off, piece: (node as SVGGElement).dataset.piece as Piece, square: (7 - row) * 8 + file }]
    })
  }

  /**
   * Takes a hidden node of a piece from the pool, or draws one, a black piece
   * over a copy of itself the stylesheet rings in the light squares' color so
   * it reads on a dark square.
   */
  make(piece: Piece): Sprite {
    const pooled = this.#pool.findIndex(sprite => sprite.piece === piece)
    if (pooled >= 0) {
      const sprite = this.#pool.splice(pooled, 1)[0]!
      sprite.node.removeAttribute('display')
      return sprite
    }
    const node = document.createElementNS(SVG, 'g')
    node.classList.add('sc-viewer-piece')
    node.dataset.piece = piece
    node.innerHTML     = ringed(piece, 'sc-viewer-halo')
    this.#layer.append(node)
    return still(node, piece)
  }

  /**
   * Draws a piece's node over every other piece, as a moving piece passes over
   * the ones it crosses.
   */
  raise(sprite: Sprite): void {
    this.#layer.append(sprite.node)
  }

  /**
   * Hides a piece's node and keeps it in the pool for a later piece of its
   * kind.
   */
  retire(sprite: Sprite): void {
    sprite.node.setAttribute('display', 'none')
    sprite.rest.a = 0
    sprite.shown  = -1
    this.#pool.push(sprite)
  }

  /**
   * Writes a piece's place, size, and opacity to its node where they differ
   * from what it holds, its size grown about the square's middle and its
   * opacity in hundredths.
   */
  write(sprite: Sprite, { a, s, x, y }: Pose): void {
    const written = sprite.written
    if (x !== written.x || y !== written.y || s !== written.s) {
      Object.assign(written, { s, x, y })
      sprite.node.setAttribute('transform', matrixOf(written))
    }
    const shown = Math.round(a * 100)
    if (shown !== sprite.shown) {
      sprite.shown = shown
      sprite.node.setAttribute('opacity', String(shown / 100))
    }
  }
}
