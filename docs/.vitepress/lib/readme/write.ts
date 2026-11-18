import fs   from 'node:fs'
import path from 'node:path'

import { facesOf }          from '../cards/faces.ts'
import { repoRoot }         from '../site/paths.ts'
import { STARTS, drawCard } from './cards.ts'
import { SCHEMES }          from './preview.ts'
import { encodePreview }    from './reel.ts'
import { sceneOf }          from './scene.ts'

/**
 * Names the folder under `.github/assets/` the README's images are written to.
 */
export function readmeDir(metaUrl: string): string {
  return path.join(repoRoot(metaUrl), '.github', 'assets', 'readme')
}

/**
 * Writes the README's images under `.github/assets/readme/`: each card of Where
 * to Start in each scheme, and the preview in each scheme.
 *
 * Args:
 *   metaUrl : The `import.meta.url` of the module calling, which the repository
 *     root is found from.
 *   encode  : Encodes the preview in one scheme, `encodePreview` by default.
 *
 * Returns:
 *   The path of each file written, relative to the repository's root.
 */
export async function writeReadme(
  metaUrl : string,
  encode  : typeof encodePreview = encodePreview
): Promise<string[]> {
  const folder = readmeDir(metaUrl)
  const fonts  = facesOf(metaUrl)
  const scene  = sceneOf()
  const cards  = SCHEMES.flatMap(scheme => STARTS.map(async start =>
    [`${start.section.slug}-${scheme}.svg`, await drawCard(fonts, scheme, start)] as const))
  const films  = SCHEMES.map(async scheme =>
    [`preview-${scheme}.gif`, await encode(metaUrl, scheme, scene)] as const)
  const files  = await Promise.all([...cards, ...films])
  fs.mkdirSync(folder, { recursive: true })
  for (const [name, data] of files) fs.writeFileSync(path.join(folder, name), data)
  return files.map(([name]) => path.relative(repoRoot(metaUrl), path.join(folder, name)))
}
