import type { Box, Measure } from './layout.ts'

export type Rect = Pick<DOMRect, 'bottom' | 'height' | 'left' | 'top' | 'width'>

/**
 * The boxes the front page reads off its elements, in the viewport's pixels as
 * `getBoundingClientRect` gives them, beside how far the page has scrolled.
 *
 * Attributes:
 *   actions  : The hero's buttons.
 *   bar      : The height of the bar across the page's top.
 *   foot     : The page's footer, where it shows one.
 *   hero     : The hero, whose top sits under the bar.
 *   home     : The whole front page beneath the bar.
 *   scrollY  : How far the page has scrolled.
 *   tagline  : Each line of the tagline.
 *   width    : The page's width.
 *   wordmark : The wordmark.
 */
export interface Rects {
  actions  : Rect[]
  bar      : number
  hero     : Rect
  home     : Rect
  scrollY  : number
  tagline  : Rect[]
  width    : number
  wordmark : Rect
  foot?    : Rect
}

/**
 * Names a measure by the page's width and depths and the lockup's box, so a
 * resize that leaves them all as they stand lays nothing out again.
 */
export function keyOf(measure: Measure): string {
  const { F, H, P, W, lock } = measure
  return [W, H, P, F, lock.x, lock.y, lock.w, lock.h].map(value => Math.round(value)).join(',')
}

/**
 * Reads the page as the backdrop lays it out, in pixels from the bar's bottom
 * edge at the page's top, which is where the hero's own room begins: the page's
 * width, the hero's depth below the bar, the depth of the whole page, the depth
 * a little above the foot where the loose pieces have faded, and the lockup as
 * the wordmark, each line of the tagline, and each action, one by one and as
 * their union.
 */
export function measured(rects: Rects): Measure {
  const origin = originOf(rects)
  const boxOf  = ({ height, left, top, width }: Rect): Box =>
    ({ h: height, w: width, x: left, y: top + rects.scrollY - origin })
  const parts = [rects.wordmark, ...rects.tagline, ...rects.actions].map(rect => boxOf(rect))
  const left  = Math.min(...parts.map(part => part.x))
  const top   = Math.min(...parts.map(part => part.y))
  const P     = rects.home.bottom + rects.scrollY - origin

  return {
    F     : (rects.foot ? rects.foot.top + rects.scrollY - origin : P) - 40,
    H     : rects.hero.height - rects.bar,
    P     : P,
    W     : rects.width,
    parts : parts,
    lock  : {
      h : Math.max(...parts.map(part => part.y + part.h)) - top,
      w : Math.max(...parts.map(part => part.x + part.w)) - left,
      x : left,
      y : top
    }
  }
}

/**
 * Reads where the page's top sits under the bar, in pixels from the document's
 * top, the point every box the backdrop lays out is measured from.
 */
export function originOf(rects: Rects): number {
  return rects.hero.top + rects.scrollY + rects.bar
}
