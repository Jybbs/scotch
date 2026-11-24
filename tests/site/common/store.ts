import fs   from 'node:fs'
import path from 'node:path'

import { vi } from 'vitest'

import { docsDir, publicDir } from '../../../docs/.vitepress/lib/site/paths.ts'

/**
 * A stand-in for the bucket the store is published to, and every request it
 * answered, each as its address beside the range it named.
 */
export interface Bucket {
  fetch    : typeof globalThis.fetch
  requests : string[]
}

/**
 * The address the stand-in bucket answers at.
 */
export const ORIGIN = 'https://store.test'

/**
 * The bytes of the reader `rs:wasm` builds from the crate.
 */
export const module = fs.readFileSync(
  path.join(docsDir(import.meta.url), '.vitepress/lib/games/crate/scotch_bg.wasm')
)

/**
 * The game the Viewer opens on.
 */
export const viewer = fs.readFileSync(path.join(publicDir(import.meta.url), 'games/viewer.pgn'), 'utf8')

/**
 * Reads a file of `fixtures/`, the store `scotch publish store` writes for the
 * games `tests/py/index/fixtures/stored.pgn` holds beside its manifest.
 */
function fixture(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(fs.readFileSync(new URL(`../lib/games/fixtures/${name}`, import.meta.url)))
}

/**
 * Answers a request for `name` as R2 answers it, the manifest whole, a range
 * of a file the fixtures hold with `status` and its bytes, and any other file
 * with 404.
 */
function answer(name: string, range: string | null, status: number): Response {
  if (name === 'manifest.json') return new Response(fixture(name))
  if (!fs.existsSync(new URL(`../lib/games/fixtures/${name}`, import.meta.url))) {
    return new Response(null, { status: 404 })
  }
  const [from = 0, to = 0] = /bytes=(\d+)-(\d+)/u.exec(range ?? '')?.slice(1).map(Number) ?? []
  return new Response(fixture(name).slice(from, to + 1), { status })
}

/**
 * Builds a stand-in for the bucket, answering a range request with 206 unless
 * `status` names another status for every file but the manifest.
 */
export function bucket(status = 206): Bucket {
  const requests: string[] = []
  const fetch              = vi.fn<typeof globalThis.fetch>((input, init) => {
    const url   = String(input)
    const range = new Headers(init?.headers).get('Range')
    requests.push(range ? `${url} ${range}` : url)
    return Promise.resolve(answer(url.slice(ORIGIN.length + 1), range, status))
  })
  return { fetch, requests }
}
