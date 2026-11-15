import fs   from 'node:fs'
import path from 'node:path'

import { describe, expect } from 'vitest'

import { readmeDir, writeReadme } from '../../../lib/readme/write.ts'
import { docsDir }                from '../../../lib/site/paths.ts'
import { test }                   from '../../common/repo.ts'

describe('writeReadme', () => {
  test('writes each card and the preview in each scheme under the assets', async ({ repo }) => {
    const docs = path.join(repo.root, 'docs')
    fs.mkdirSync(docs, { recursive: true })
    fs.symlinkSync(path.join(docsDir(import.meta.url), 'node_modules'), path.join(docs, 'node_modules'))
    const written = await writeReadme(repo.metaUrl, (_, scheme) =>
      Promise.resolve(Buffer.from(`GIF ${scheme}`)))
    expect(written.toSorted()).toEqual([
      'assets/readme/guide-dark.svg', 'assets/readme/guide-light.svg', 'assets/readme/methods-dark.svg',
      'assets/readme/methods-light.svg', 'assets/readme/preview-dark.gif', 'assets/readme/preview-light.gif',
      'assets/readme/viewer-dark.svg', 'assets/readme/viewer-light.svg'
    ])
    expect(fs.readFileSync(path.join(readmeDir(repo.metaUrl), 'preview-dark.gif'), 'utf8')).toBe('GIF dark')
  }, 30_000)
})
