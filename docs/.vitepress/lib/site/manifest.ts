import { execFileSync } from 'node:child_process'
import fs               from 'node:fs'
import path             from 'node:path'

import { parse } from 'smol-toml'

import { repoRoot } from './paths.ts'

interface Manifest {
  project? : { description?: unknown, urls?: Record<string, unknown>, version?: unknown }
  tool?    : { coverage?: { report?: { fail_under?: unknown } } }
}

export interface ProjectFacts {
  description : string
  gate        : number
  homepage    : string
  host        : string
  version     : string
}

function required(value: unknown, file: string, key: string): string {
  if (typeof value !== 'string') throw new Error(`no ${key} in ${file}`)
  return value
}

/**
 * Reads the commit the site is built from, the one GitHub Actions names where a
 * workflow builds it and otherwise the one git checks out, as its first seven
 * hexadecimal digits, or `undefined` where neither knows one, as in an export
 * of the repository.
 *
 * Args:
 *   metaUrl : The `import.meta.url` of the module calling, which the
 *     repository's root is found from.
 *   env     : The environment the build runs in.
 */
export function commitOf(
  metaUrl : string,
  env     : Readonly<Record<string, string | undefined>> = process.env
): string | undefined {
  if (env.GITHUB_SHA) return env.GITHUB_SHA.slice(0, 7)
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      cwd      : repoRoot(metaUrl),
      encoding : 'utf8',
      stdio    : ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return undefined
  }
}

/**
 * Reads what the site states about the project out of `pyproject.toml`, meaning
 * its description, the homepage the site serves at and that homepage's host,
 * and the version the package declares, beside the coverage below which the
 * package's suite fails, which the site's suite takes as well.
 */
export function projectFacts(metaUrl: string): ProjectFacts {
  const file     = path.join(repoRoot(metaUrl), 'pyproject.toml')
  const manifest = parse(fs.readFileSync(file, 'utf8')) as Manifest
  const homepage = required(manifest.project?.urls?.Homepage, file, 'project.urls.Homepage')
  const gate     = manifest.tool?.coverage?.report?.fail_under

  if (typeof gate !== 'number') throw new Error(`no tool.coverage.report.fail_under in ${file}`)

  return {
    description : required(manifest.project?.description, file, 'project.description'),
    gate        : gate,
    homepage    : homepage,
    host        : new URL(homepage).host,
    version     : required(manifest.project?.version, file, 'project.version')
  }
}
