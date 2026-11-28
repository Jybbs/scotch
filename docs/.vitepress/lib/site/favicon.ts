import fs   from 'node:fs'
import path from 'node:path'

import { docsDir } from './paths.ts'

/**
 * Copies the favicon tracked under `docs/assets/` into the root of the built
 * site, where `/favicon.svg` is served from.
 *
 * Args:
 *   outDir  : The folder the built site is written to.
 *   metaUrl : The `import.meta.url` of the module calling, which the repository
 *     root is found from.
 */
export function copyFavicon(outDir: string, metaUrl: string): void {
  fs.copyFileSync(path.join(docsDir(metaUrl), 'assets', 'favicon.svg'), path.join(outDir, 'favicon.svg'))
}
