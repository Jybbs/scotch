import path              from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect } from 'vitest'

import * as paths         from '../../../lib/site/paths.ts'
import { MANIFEST, test } from '../../common/repo.ts'

describe('the paths under the repository', () => {
  test.for([
    ['docsDir', 'docs', paths.docsDir],
    ['pagesDir', 'docs/pages', paths.pagesDir],
    ['publicDir', 'docs/public', paths.publicDir]
  ] as const)('names %s as %s under the root', ([, folder, folderOf], { repo }) => {
    expect(folderOf(repo.metaUrl)).toBe(path.join(repo.root, folder))
  })

  test("names a cache folder under the root's .cache", ({ repo }) => {
    expect(paths.cacheDir(repo.metaUrl, 'vitepress')).toBe(path.join(repo.root, '.cache', 'vitepress'))
  })

  test('finds the root at the nearest directory above the module holding a manifest', ({ repo }) => {
    const exported = path.join(repo.root, 'exported')
    repo.write('exported/pyproject.toml', MANIFEST)
    expect(paths.repoRoot(pathToFileURL(path.join(exported, 'docs', 'module.ts')).href)).toBe(exported)
  })

  test('fails where no directory above the module holds a manifest', () => {
    const module = 'file:///no/such/place/module.ts'
    expect(() => paths.repoRoot(module)).toThrow(`no repository root above ${module}`)
  })
})
