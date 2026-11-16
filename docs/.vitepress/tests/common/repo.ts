import fs                from 'node:fs'
import os                from 'node:os'
import path              from 'node:path'
import { pathToFileURL } from 'node:url'

import { test as base } from 'vitest'

import type { ProjectFacts, Provider } from '../../lib/site/manifest.ts'

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
  'license     = "GPL-3.0-or-later"',
  'version     = "1.2.3"',
  '',
  '[project.urls]',
  'Homepage   = "https://example.org"',
  'Repository = "https://github.com/Owner/game"',
  '',
  '[tool.coverage.report]',
  'fail_under = 90',
  ''
].join('\n')

/**
 * What `projectFacts` reads from the manifest above.
 */
export const FACTS: ProjectFacts = {
  description : 'Finds the closest game.',
  gate        : 90,
  homepage    : 'https://example.org',
  host        : 'example.org',
  license     : 'GPL-3.0-or-later',
  repository  : 'https://github.com/Owner/game',
  version     : '1.2.3'
}
/**
 * The one provider the declared sources name.
 */
export const MENTOR: Provider = { home: 'https://www.pgnmentor.com/', name: 'PGN Mentor' }

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
