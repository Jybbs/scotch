import type { Plugin } from 'vite'

import * as timing            from '../motion/timing.ts'
import { rolesSheet }         from './roles.ts'
import { IDENTITY, rootRule } from './tokens.ts'

/**
 * The module the theme imports the identity's custom properties from.
 */
export const SHEET = 'virtual:scotch-identity.css'

/**
 * Writes the families a face falls back through, led by the family its
 * Fontsource package declares, which names a variable face with ` Variable`
 * behind the family's own name, as a canvas's `font` and a stylesheet both read
 * them.
 */
export function familyOf({ family, stack }: { family: string, stack: string }): string {
  return `"${family} Variable", ${stack}`
}

/**
 * Serves the identity's stylesheet, its roles', and the motion's as one module
 * the theme imports, so no stylesheet restates a hex, a family name, a
 * duration, or a curve.
 */
export function identityPlugin(): Plugin {
  const resolved = `\0${SHEET}`
  return {
    load      : id => id === resolved ? identitySheet() + rolesSheet() + motionSheet() : undefined,
    name      : 'scotch-identity',
    resolveId : id => id === SHEET ? resolved : undefined
  }
}

/**
 * Writes the stylesheet setting one custom property per palette token and per
 * face, each face's stack led by the family its Fontsource package declares,
 * which names a variable face with ` Variable` behind the family's own name.
 */
export function identitySheet(identity = IDENTITY): string {
  const colors = Object.entries(identity.palette)
    .map(([token, color]): [string, string] => [token, color.hex])
  const faces = Object.entries(identity.faces)
    .map(([face, { family, stack }]): [string, string] => [`face-${face}`, familyOf({ family, stack })])
  return rootRule([...colors, ...faces])
}

/**
 * Writes the stylesheet setting one custom property per curve and per duration,
 * such as `--sc-curve-glide` and `--sc-duration-settle`, every duration falling
 * to zero for a reader who prefers reduced motion, so a transition reading one
 * snaps to its end.
 */
export function motionSheet(): string {
  const curves = Object.entries(timing.CURVES)
    .map(([name, points]): [string, string] => [`curve-${name}`, timing.cubicBezier(points)])
  const durations = Object.entries(timing.DURATIONS)
    .map(([name, ms]): [string, string] => [`duration-${name}`, `${ms}ms`])
  const reduced = durations.map(([name]): [string, string] => [name, '0ms'])

  return rootRule([...curves, ...durations])
       + `@media (prefers-reduced-motion: reduce) {\n${rootRule(reduced)}}\n`
}
