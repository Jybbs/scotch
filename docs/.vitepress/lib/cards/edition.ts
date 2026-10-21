import fs   from 'node:fs'
import path from 'node:path'

import examples         from '../rendered/examples.json' with { type: 'json' }
import { projectFacts } from '../site/manifest.ts'
import { docsDir }      from '../site/paths.ts'
import type { Edition } from './draw.ts'

/**
 * Reads what every card states about the site: the host and the version from
 * the manifest, the wordmark from the site's assets, and the run the rails draw
 * from the front page's example, the one the index matched to the stored game
 * the front page's oval plays.
 */
export function editionOf(metaUrl: string): Edition {
  const facts = projectFacts(metaUrl)
  return {
    host     : facts.host,
    run      : examples.front.span,
    version  : facts.version,
    wordmark : fs.readFileSync(path.join(docsDir(metaUrl), 'assets', 'wordmark.svg'), 'utf8')
  }
}
