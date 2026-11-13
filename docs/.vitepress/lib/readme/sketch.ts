import { rect } from './parts.ts'

/**
 * One line of text a sketch was asked to write, at the point its alphabetic
 * baseline starts from, in the `font` and the fill set when it was written.
 */
export interface Line {
  fill : string
  font : string
  text : string
  x    : number
  y    : number
}

/**
 * Stands in for the part of a canvas's 2D context a drawing on the Viewer's
 * canvas calls, writing each rectangle it fills as an SVG `rect` and keeping
 * each line of text it writes, so the drawing the Viewer makes on a canvas can
 * be set into an SVG frame.
 */
export class Sketch {
  fillStyle      = ''
  font           = ''
  readonly lines = [] as Line[]
  textBaseline   = 'alphabetic'
  #rects         = [] as string[]

  /**
   * The rectangles filled so far, as one run of SVG `rect` elements.
   */
  get svg(): string {
    return this.#rects.join('')
  }

  /**
   * Drops everything drawn so far, since every caller clears the whole canvas.
   */
  clearRect(): void {
    this.#rects = []
    this.lines.length = 0
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.#rects.push(rect({ fill: this.fillStyle, height, width, x, y }))
  }

  fillText(text: string, x: number, y: number): void {
    this.lines.push({ fill: this.fillStyle, font: this.font, text, x, y })
  }

  /**
   * Hands the sketch to a drawing written against a canvas's 2D context.
   */
  get context(): CanvasRenderingContext2D {
    return this as unknown as CanvasRenderingContext2D
  }
}
