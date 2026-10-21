import fs                from 'node:fs'
import path              from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Names a directory under the repository's `.cache`, where every tool's cache
 * lives.
 */
export function cacheDir(metaUrl: string, name: string): string {
  return path.join(repoRoot(metaUrl), '.cache', name)
}

export function docsDir(metaUrl: string): string {
  return path.join(repoRoot(metaUrl), 'docs')
}

export function pagesDir(metaUrl: string): string {
  return path.join(docsDir(metaUrl), 'pages')
}

export function publicDir(metaUrl: string): string {
  return path.join(docsDir(metaUrl), 'public')
}

/**
 * Finds the repository's root, the first directory above `metaUrl` holding
 * `pyproject.toml`, the manifest the site reads its facts from.
 */
export function repoRoot(metaUrl: string): string {
  let directory = path.dirname(fileURLToPath(metaUrl))
  while (!fs.existsSync(path.join(directory, 'pyproject.toml'))) {
    const parent = path.dirname(directory)
    if (parent === directory) throw new Error(`no repository root above ${metaUrl}`)
    directory = parent
  }
  return directory
}
