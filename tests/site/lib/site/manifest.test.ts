import { execFileSync }  from 'node:child_process'
import path              from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import * as manifest      from '../../../../docs/.vitepress/lib/site/manifest.ts'
import { MANIFEST, test } from '../../common/repo.ts'

const SOURCES = 'src/scotch/sources/sources.toml'

/**
 * Writes one declared source per provider and front page given.
 */
function declared(...sources: readonly (readonly [string, string])[]): string {
  return sources
    .map(([provider, home]) => `[[sources]]\nhome = "${home}"\nprovider = "${provider}"\n`)
    .join('\n')
}

describe('commitOf', () => {
  test('reads the commit GitHub Actions names, as its first seven digits', ({ repo }) => {
    expect(manifest.commitOf(repo.metaUrl, { GITHUB_SHA: '0123456789abcdef' })).toBe('0123456')
  })

  test('reads the commit git checks out where no workflow names one', ({ repo }) => {
    const git = (...args: string[]): string =>
      execFileSync('git', ['-C', repo.root, ...args], { encoding: 'utf8' }).trim()
    git('init', '--quiet')
    git('-c', 'user.name=Scotch', '-c', 'user.email=scotch@example.org', '-c', 'commit.gpgsign=false',
      'commit', '--quiet', '--allow-empty', '--no-verify', '--message', 'Opens the history')
    expect(manifest.commitOf(repo.metaUrl, {})).toBe(git('rev-parse', '--short=7', 'HEAD'))
  })

  test('reads no commit where neither knows one, as in an export of the repository', ({ repo }) => {
    expect(manifest.commitOf(repo.metaUrl, {})).toBeUndefined()
  })
})

describe('projectFacts', () => {
  test('reads every fact the site states, from the description to the coverage gate', ({ repo }) => {
    expect(manifest.projectFacts(repo.metaUrl)).toEqual({
      description : 'Finds the closest game.',
      gate        : 90,
      homepage    : 'https://example.org',
      host        : 'example.org',
      license     : 'GPL-3.0-or-later',
      repository  : 'https://github.com/Owner/game',
      version     : '1.2.3'
    })
  })

  test('fails by name with a TypeError where the manifest leaves out a field', ({ repo }) => {
    const fields = {
      'description' : 'project.description',
      'Homepage'    : 'project.urls.Homepage',
      'license'     : 'project.license',
      'Repository'  : 'project.urls.Repository',
      'version'     : 'project.version',
      'fail_under'  : 'tool.coverage.report.fail_under'
    }
    const thrown = Object.keys(fields).map(key => {
      const kept = MANIFEST.split('\n').filter(line => !line.startsWith(`${key} `))
      repo.write('pyproject.toml', kept.join('\n'))
      try {
        return manifest.projectFacts(repo.metaUrl)
      } catch (error) {
        return error
      }
    })
    const file = path.join(repo.root, 'pyproject.toml')
    expect(thrown).toEqual(Object.values(fields).map(name => new TypeError(`no ${name} in ${file}`)))
  })

  test('reads the manifest of the repository a module sits in at any depth', ({ repo }) => {
    const deep = pathToFileURL(path.join(repo.root, 'deep', 'er', 'module.ts')).href
    expect(manifest.projectFacts(deep).version).toBe('1.2.3')
  })
})

describe('providersOf', () => {
  test('reads each provider once, in the order the sources first name it', ({ repo }) => {
    repo.write(SOURCES, declared(['B', 'https://b.org/'], ['A', 'https://a.org/'], ['B', 'https://b.org/']))
    expect(manifest.providersOf(repo.metaUrl)).toEqual([
      { home: 'https://b.org/', name: 'B' },
      { home: 'https://a.org/', name: 'A' }
    ])
  })

  test('reads none where the file declares no source', ({ repo }) => {
    repo.write(SOURCES, 'floors = {}\n')
    expect(manifest.providersOf(repo.metaUrl)).toEqual([])
  })

  test.for([
    ['provider', '[[sources]]\nhome = "https://a.org/"\n'],
    ['front page', '[[sources]]\nprovider = "A"\n']
  ])('fails by name where a source leaves out its %s', ([, text], { repo }) => {
    repo.write(SOURCES, text!)
    expect(() => manifest.providersOf(repo.metaUrl)).toThrow(/sources\.toml names no provider or home/u)
  })
})

describe('providersOf over the declared sources', () => {
  it('names PGN Mentor and its front page', () => {
    expect(manifest.providersOf(import.meta.url)).toEqual([{ home: 'https://www.pgnmentor.com/', name: 'PGN Mentor' }])
  })
})
