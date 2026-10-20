import fs   from 'node:fs'
import path from 'node:path'

import type satori from 'satori'

import { type Face, IDENTITY } from '../identity/tokens.ts'
import { docsDir }             from '../site/paths.ts'

/**
 * The weight and the style each face is drawn at on a card, the display face at
 * its one weight, the body's tagline in italics, and the code's capitals at its
 * medium weight.
 */
export const FACES = {
  body    : { style: 'italic', weight: 400 },
  code    : { style: 'normal', weight: 500 },
  display : { style: 'normal', weight: 400 }
} as const satisfies Record<Face, { style: 'italic' | 'normal', weight: 400 | 500 }>

/**
 * Reads each face's static file from the Fontsource package the site loads it
 * from, the package named for the face's family, as satori takes a font, under
 * the face's own name, which a card's `fontFamily` names.
 */
export function facesOf(metaUrl: string): Parameters<typeof satori>[1]['fonts'] {
  return Object.entries(FACES).map(([face, { style, weight }]) => {
    const id     = IDENTITY.faces[face as Face].family.toLowerCase().replaceAll(' ', '-')
    const folder = path.join(docsDir(metaUrl), 'node_modules', '@fontsource', id, 'files')
    const data   = fs.readFileSync(path.join(folder, `${id}-latin-${weight}-${style}.woff2`))
    return { data, name: face, style, weight }
  })
}
