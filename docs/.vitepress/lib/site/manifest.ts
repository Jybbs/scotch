import fs   from 'node:fs'
import path from 'node:path'

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
