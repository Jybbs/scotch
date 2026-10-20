import { KINDS, type Kind }   from './example.ts'
import { LAYERS, type Layer } from './layers.ts'
import type { Plan }          from './layout.ts'
import type { Frame }         from './scene.ts'

/**
 * The drawings one frame of the backdrop is painted from: a drawing of each
 * piece in each coloring at each size, under its key, the run's color the rings
 * take, the sizes the drawings were made at, and the backdrop's visible band,
 * which opens beneath the bar while the page sits at its top and reaches the
 * viewport's top once it scrolls.
 */
export interface Drawings {
  bitmaps : Map<string, CanvasImageSource>
  clip    : number
  height  : number
  run     : string
  sizes   : number[]
  width   : number
}

/**
 * Names the drawing of one piece in one coloring at one size.
 */
export function bitmapKey(layer: Layer, kind: Kind, size: number): string {
  return `${layer}/${kind}/${size}`
}

/**
 * Lists every drawing a plan needs, each coloring of each piece at the size a
 * loose piece takes and the size a piece in its place takes.
 */
export function needed(plan: Pick<Plan, 'loose' | 'size'>): { kind: Kind, layer: Layer, size: number }[] {
  return sizesOf(plan).flatMap(size => LAYERS.flatMap(layer => KINDS.map(kind => ({ kind, layer, size }))))
}

/**
 * Paints one frame onto the backdrop's canvas: each stamp from the drawing made
 * at the size nearest its own, scaled to its own, and each ring as a circle in
 * the run's color, all inside the visible band.
 */
export function paint(context: CanvasRenderingContext2D, drawings: Drawings, frame: Frame): void {
  const { bitmaps, clip, height, run, sizes, width } = drawings
  context.clearRect(0, 0, width, height)
  context.save()
  context.beginPath()
  context.rect(0, clip, width, Math.max(0, height - clip))
  context.clip()

  for (const { alpha, layer, piece, size, x, y } of frame.stamps) {
    const near   = sizes.reduce((best, each) => Math.abs(each - size) < Math.abs(best - size) ? each : best)
    const bitmap = bitmaps.get(bitmapKey(layer, piece, near))
    if (!bitmap) continue
    context.globalAlpha = alpha
    context.drawImage(bitmap, x - size / 2, y - size / 2, size, size)
  }

  context.strokeStyle = run
  context.lineWidth   = 1.25
  for (const { alpha, radius, x, y } of frame.rings) {
    context.globalAlpha = alpha
    context.beginPath()
    context.arc(x, y, radius, 0, 2 * Math.PI)
    context.stroke()
  }
  context.restore()
}

/**
 * Lists the sizes a plan draws pieces at, rounded up to whole pixels: the size
 * a loose piece takes and the size a piece in its place takes.
 */
export function sizesOf(plan: Pick<Plan, 'loose' | 'size'>): number[] {
  return [...new Set([Math.ceil(plan.loose), Math.ceil(plan.size)])]
}
