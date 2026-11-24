import path              from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect } from 'vitest'

import * as paths         from '../../../../docs/.vitepress/lib/site/paths.ts'
import { MANIFEST, test } from '../../common/repo.ts'

describe('the paths under the repository', () => {
  test.for<[string, string, (metaUrl: string) => string]>([
    ['cacheDir', '.cache/vitepress', metaUrl => paths.cacheDir(metaUrl, 'vitepress')],
    ['docsDir', 'docs', paths.docsDir],
    ['pagesDir', 'docs/pages', paths.pagesDir],
    ['publicDir', 'docs/public', paths.publicDir]
  ])('names %s as %s under the root', ([, folder, folderOf], { repo }) => {
    expect(folderOf(repo.metaUrl)).toBe(path.join(repo.root, folder))
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
