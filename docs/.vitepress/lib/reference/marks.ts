import { clamp } from '@vueuse/core'

import rendered from '../rendered/marks.json' with { type: 'json' }

import { smooth } from '../motion/timing.ts'

/**
 * The drawings the identity page sets and each place they stand, as `scotch
 * render docs` measures them from the tracked SVGs.
 */
export const MARKS = rendered

/**
 * What the marks drawing shows at a place along its stops.
 */
export interface MarkFrame {
  card     : number
  cardLeft : number
  cardTop  : number
  cardWide : number
  half     : number
  letters  : number
  shown    : number
  tagline  : number
  transform: string
  unitsH   : number
  unitsW   : number
}

const [FAVICON, NAV, WORD, , LOCK] = MARKS.stops
/**
 * Each stop's pixels per unit of its SVG, which the link card does not read,
 * since the card stands over the drawing between the wordmark and the lockup.
 */
const SCALES = [
  FAVICON!.height / MARKS.mark.view[3]!,
  NAV!.height / MARKS.mark.view[3]!,
  WORD!.width / MARKS.wordmark.view[2]!,
  LOCK!.width / MARKS.lockup.view[2]!
] as const

const lerp = (from: number, to: number, share: number): number => from + (to - from) * share

function scaleAt(place: number): number {
  const scaled = place <= 2 ? place : 2 + (place - 2) / 2
  const low    = Math.min(2, Math.floor(scaled))
  return Math.exp(lerp(Math.log(SCALES[low]!), Math.log(SCALES[low + 1]!), scaled - low))
}

/**
 * Lays the marks out at a place along the stops, each whole place standing on a
 * stop: the letters arrive from the nav mark to the wordmark, the link card
 * stands over the drawing at its stop, and the tagline wipes in from there to
 * the lockup.
 *
 * Args:
 *   place  : Where along the stops, from 0 to one less than the count of stops.
 *   width  : The stage's width in pixels.
 *   height : The stage's height in pixels.
 */
export function frameAt(place: number, width: number, height: number): MarkFrame {
  const [mark, word, lock] = [MARKS.mark.view, MARKS.wordmark.view, MARKS.lockup.view]
  const scale   = scaleAt(place)
  const letters = smooth(clamp(place - 1, 0, 1))
  const tagline = smooth(clamp(place - 3, 0, 1))
  const card    = 1 - smooth(clamp(Math.abs(place - 3) * 2, 0, 1))
  const unitsW  = lerp(mark[2]!, lerp(word[2]!, lock[2]!, tagline), letters)
  const unitsH  = lerp(lerp(mark[3]!, word[3]!, letters), lock[3]!, tagline)
  const fit     = Math.min(1, (width - 24) / (unitsW * scale), (height - 62) / (unitsH * scale))
  const shown   = scale * fit
  const middleX = lerp(mark[0]! + mark[2]! / 2, word[0]! + word[2]! / 2, letters)
  const middleY = lerp(mark[1]! + mark[3]! / 2, lock[1]! + lock[3]! / 2, tagline)
  const [x, y]  = [width / 2, height / 2 + 12]
  const shrink  = Math.min(1, (width - 24) / 400, (height - 62) / 200)

  return {
    card      : card,
    cardLeft  : (width - 400 * shrink) / 2,
    cardTop   : (height - 200 * shrink) / 2,
    cardWide  : 400 * shrink,
    half      : lerp(unitsW * shown, 400 * shrink, card) / 2,
    letters   : letters,
    shown     : fit,
    tagline   : tagline,
    transform : `translate(${(x - middleX * shown).toFixed(2)} ${(y - middleY * shown).toFixed(2)}) scale(${shown.toFixed(5)})`,
    unitsH    : unitsH * scale,
    unitsW    : unitsW * scale
  }
}
