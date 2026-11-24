import path from 'node:path'

import { defineConfig } from 'vitest/config'

import { identityPlugin }     from '../lib/identity/sheet.ts'
import { projectFacts }       from '../lib/site/manifest.ts'
import { cacheDir, repoRoot } from '../lib/site/paths.ts'

const { gate } = projectFacts(import.meta.url)
const root     = repoRoot(import.meta.url)
const suite    = path.join(root, 'tests', 'site')

export default defineConfig({
  cacheDir : cacheDir(import.meta.url, 'vitest'),
  plugins  : [identityPlugin()],
  server   : { fs: { allow: [root] } },
  test     : {
    dir                 : suite,
    expect              : { requireAssertions: true },
    fsModuleCachePath   : cacheDir(import.meta.url, 'vitest/modules'),
    include             : ['**/*.test.ts'],
    pool                : 'threads',
    resolveSnapshotPath : (testPath, extension) => testPath + extension,
    restoreMocks        : true,
    sequence            : { shuffle: true },
    setupFiles          : [path.join(suite, 'common', 'matchers.ts')],
    unstubEnvs          : true,
    unstubGlobals       : true,

    coverage: {
      exclude          : ['**/*.data.ts', '.vitepress/lib/games/crate/**'],
      include          : ['.vitepress/lib/**/*.ts', '.vitepress/theme/**/*.ts'],
      provider         : 'v8',
      reportOnFailure  : true,
      reporter         : ['text', 'html'],
      reportsDirectory : cacheDir(import.meta.url, 'coverage/site'),
      thresholds       : { branches: gate, functions: gate, lines: gate, statements: gate }
    },

    reporters: process.env.GITHUB_ACTIONS
             ? ['default', ['github-actions', { jobSummary: { enabled: false } }]]
             : ['default']
  }
})
