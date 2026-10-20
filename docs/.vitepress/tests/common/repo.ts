import fs                from 'node:fs'
import os                from 'node:os'
import path              from 'node:path'
import { pathToFileURL } from 'node:url'

import { test as base } from 'vitest'

/**
 * A scratch repository a test writes the files a module under `lib/` reads
 * into, beside the `import.meta.url` such a module takes to find it.
 */
interface Repo {
  metaUrl : string
  root    : string
  write   : (file: string, text: string) => string
}

/**
 * The manifest a scratch repository opens on, carrying every field the site
 * reads from `pyproject.toml`.
 */
export const MANIFEST = [
  '[project]',
  'description = "Finds the closest game."',
  'version     = "1.2.3"',
  '',
  '[project.urls]',
  'Homepage = "https://example.org"',
  '',
  '[tool.coverage.report]',
  'fail_under = 90',
  ''
].join('\n')

/**
 * Extends Vitest's `test` with a `repo` fixture, a directory carrying the
 * manifest above, removed once the case ends.
 */
export const test = base.extend<{ repo: Repo }>({
  repo: async ({ onTestFinished }, use) => {
    const root  = fs.mkdtempSync(path.join(os.tmpdir(), 'scotch-site-'))
    const write = (file: string, text: string): string => {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, text)
      return target
    }
    write('pyproject.toml', MANIFEST)
    onTestFinished(() => fs.rmSync(root, { force: true, recursive: true }))
    const metaUrl = pathToFileURL(path.join(root, 'docs', '.vitepress', 'lib', 'module.ts')).href
    await use({ metaUrl, root, write })
  }
})
