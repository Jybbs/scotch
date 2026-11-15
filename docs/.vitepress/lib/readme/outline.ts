import satori from 'satori'

import { FACES }     from '../cards/faces.ts'
import type { Face } from '../identity/tokens.ts'

/**
 * How a line of text is set: the box it is laid out in, the face and its size,
 * its color, where it sits across the box, and the spacing between its letters.
 */
export interface Setting {
  color    : string
  face     : Face
  height   : number
  size     : number
  width    : number
  align?   : 'center' | 'flex-end' | 'flex-start'
  caps?    : boolean
  spacing? : number
}

/**
 * Sets lines of text as outlines through satori, each line in the face its
 * setting names at the weight and style a card draws that face at, keeping
 * each line it has set so a line repeated across frames is laid out once.
 */
export class Outliner {
  readonly #fonts : Parameters<typeof satori>[1]['fonts']
  readonly #set   = new Map<string, Promise<string>>()

  constructor(fonts: Parameters<typeof satori>[1]['fonts']) {
    this.#fonts = fonts
  }

  /**
   * Returns the outlines of one line as the SVG paths satori lays it out in,
   * inside a box at the origin.
   */
  line(text: string, setting: Setting): Promise<string> {
    const key = JSON.stringify([text, setting])
    if (!this.#set.has(key)) this.#set.set(key, this.#outline(text, setting))
    return this.#set.get(key)!
  }

  async #outline(text: string, setting: Setting): Promise<string> {
    const { align = 'flex-start', caps = false, color, face, height, size, spacing = 0, width } = setting
    const svg = await satori({
      type  : 'div',
      props : {
        children : text,
        style    : {
          alignItems     : 'center',
          color          : color,
          display        : 'flex',
          fontFamily     : face,
          fontSize       : size,
          fontStyle      : FACES[face].style,
          fontWeight     : FACES[face].weight,
          height         : height,
          justifyContent : align,
          letterSpacing  : spacing,
          textTransform  : caps ? 'uppercase' : 'none',
          whiteSpace     : 'pre',
          width          : width
        }
      }
    }, { fonts: this.#fonts, height, width })
    return svg.match(/<path[^>]*\/>/gu)?.join('') ?? ''
  }
}
