import { execFileSync }  from 'node:child_process'
import path              from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect } from 'vitest'

import { commitOf, projectFacts } from '../../../lib/site/manifest.ts'
import { MANIFEST, test }         from '../../common/repo.ts'

describe('commitOf', () => {
  test('reads the commit GitHub Actions names, as its first seven digits', ({ repo }) => {
    expect(commitOf(repo.metaUrl, { GITHUB_SHA: '0123456789abcdef' })).toBe('0123456')
  })

  test('reads the commit git checks out where no workflow names one', ({ repo }) => {
    const git = (...args: string[]): string =>
      execFileSync('git', ['-C', repo.root, ...args], { encoding: 'utf8' }).trim()
    git('init', '--quiet')
    git('-c', 'user.name=Scotch', '-c', 'user.email=scotch@example.org', '-c', 'commit.gpgsign=false',
      'commit', '--quiet', '--allow-empty', '--no-verify', '--message', 'Opens the history')
    expect(commitOf(repo.metaUrl, {})).toBe(git('rev-parse', '--short=7', 'HEAD'))
  })

  test('reads no commit where neither knows one, as in an export of the repository', ({ repo }) => {
    expect(commitOf(repo.metaUrl, {})).toBeUndefined()
  })
})

describe('projectFacts', () => {
  test('reads the description, the homepage and its host, the version, and the coverage gate', ({ repo }) => {
    expect(projectFacts(repo.metaUrl)).toEqual({
      description : 'Finds the closest game.',
      gate        : 90,
      homepage    : 'https://example.org',
      host        : 'example.org',
      version     : '1.2.3'
    })
  })

  test.for([
    ['description', 'project.description'],
    ['Homepage', 'project.urls.Homepage'],
    ['version', 'project.version'],
    ['fail_under', 'tool.coverage.report.fail_under']
  ])('fails by name where the manifest leaves out %s', ([key, name], { repo }) => {
    const kept = MANIFEST.split('\n').filter(line => !line.startsWith(`${key} `))
    const file = repo.write('pyproject.toml', kept.join('\n'))
    expect(() => projectFacts(repo.metaUrl)).toThrow(`no ${name} in ${file}`)
  })

  test('reads the manifest of the repository a module sits in at any depth', ({ repo }) => {
    const deep = pathToFileURL(path.join(repo.root, 'deep', 'er', 'module.ts')).href
    expect(projectFacts(deep).version).toBe('1.2.3')
  })
})
