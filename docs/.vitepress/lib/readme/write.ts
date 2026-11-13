import fs   from 'node:fs'
import path from 'node:path'

import { facesOf }          from '../cards/faces.ts'
import { docsDir }          from '../site/paths.ts'
import { STARTS, drawCard } from './cards.ts'
import { SCHEMES }          from './preview.ts'
import { encodePreview }    from './reel.ts'

/**
 * Names the folder under `docs/assets/` the README's images are written to.
 */
export function readmeDir(metaUrl: string): string {
  return path.join(docsDir(metaUrl), 'assets', 'readme')
}

/**
 * Writes the README's images under `docs/assets/readme/`: each card of Where
 * to Start in each scheme, and the preview in each scheme.
 *
 * Args:
 *   metaUrl : The `import.meta.url` of the module calling, which the repository
 *     root is found from.
 *   encode  : Encodes the preview in one scheme, `encodePreview` by default.
 *
 * Returns:
 *   The path of each file written, under the repository's `docs/` folder.
 */
export async function writeReadme(
  metaUrl : string,
  encode  : typeof encodePreview = encodePreview
): Promise<string[]> {
  const folder = readmeDir(metaUrl)
  const fonts  = facesOf(metaUrl)
  const cards  = SCHEMES.flatMap(scheme => STARTS.map(async start =>
    [`${start.section.slug}-${scheme}.svg`, await drawCard(fonts, scheme, start)] as const))
  const films  = SCHEMES.map(async scheme =>
    [`preview-${scheme}.gif`, await encode(metaUrl, scheme)] as const)
  const files  = await Promise.all([...cards, ...films])
  fs.mkdirSync(folder, { recursive: true })
  for (const [name, data] of files) fs.writeFileSync(path.join(folder, name), data)
  return files.map(([name]) => path.relative(docsDir(metaUrl), path.join(folder, name)))
}
