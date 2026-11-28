import fs   from 'node:fs'
import path from 'node:path'

import { expect } from 'vitest'

import { copyFavicon } from '../../../../docs/.vitepress/lib/site/favicon.ts'
import { test }        from '../../common/repo.ts'

test('copies the favicon under docs/assets into the root of the built site', ({ repo }) => {
  repo.write('docs/assets/favicon.svg', '<svg/>')
  const out = path.join(repo.root, 'out')
  fs.mkdirSync(out)
  copyFavicon(out, repo.metaUrl)
  expect(fs.readFileSync(path.join(out, 'favicon.svg'), 'utf8')).toBe('<svg/>')
})
