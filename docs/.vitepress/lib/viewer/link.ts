import { EXAMPLES, type Match, type Sample } from './examples.ts'
import { lacking }                           from './shape.ts'
import type { Facing }                       from './trail.ts'

/**
 * What a link's fragment carries beside the match: the ply in view and the side
 * the boards are turned to.
 */
export interface Place {
  ply?  : number
  side? : Facing
}

/**
 * What reading a match file or a link gives: the match it holds, the example it
 * names where it names one, and the place it opens at, or the line naming why
 * it holds no match.
 */
export type Reading = (Place & { match: Match, problem?: undefined, sample?: Sample })
                    | { match?: undefined, problem: string }

async function bytesOf(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * Writes a match as the text a link's `match` field carries, its JSON deflated
 * into a ZLIB stream (RFC 1950) and written as unpadded base64url (RFC 4648,
 * Section 5), which the Viewer writes once a match loads and reuses on every
 * step.
 */
export async function encodedOf(match: Match): Promise<string> {
  const deflate = new Blob([JSON.stringify(match)]).stream().pipeThrough(new CompressionStream('deflate'))
  return (await bytesOf(deflate)).toBase64({ alphabet: 'base64url', omitPadding: true })
}

/**
 * Writes the fragment carrying a match, as the example it is where it is one
 * and as its encoded text otherwise, beside the ply in view and the side the
 * boards are turned to where it is Black's.
 *
 * Args:
 *   carried : The example's name, or the match's encoded text.
 *   place   : The ply in view and the boards' side.
 */
export function fragmentOf(carried: { encoded: string } | { sample: Sample }, { ply, side }: Place): string {
  const fields = new URLSearchParams()
  if ('sample' in carried) fields.set('sample', carried.sample)
  else fields.set('match', carried.encoded)
  if (ply !== undefined) fields.set('ply', String(ply))
  if (side === 'black') fields.set('side', side)
  return fields.toString()
}

/**
 * Reads a match and the place it opens at back from a link's fragment, the
 * match either named as an example or carried as unpadded base64url (RFC 4648,
 * Section 5) over a ZLIB stream (RFC 1950), whose checksum refuses a link cut
 * short or altered.
 *
 * Args:
 *   fragment : The fragment, without its `#`.
 */
export async function fromLink(fragment: string): Promise<Reading> {
  const fields = new URLSearchParams(fragment)
  const ply    = Number(fields.get('ply') ?? Number.NaN)
  const place  = {
    ...Number.isInteger(ply) ? { ply } : {},
    ...fields.get('side') === 'black' ? { side: 'black' as const } : {}
  }
  const sample = fields.get('sample')
  if (sample && sample in EXAMPLES) {
    return { match: EXAMPLES[sample as Sample], sample: sample as Sample, ...place }
  }
  let text: string
  try {
    const bytes   = Uint8Array.fromBase64(fields.get('match') ?? '', { alphabet: 'base64url' })
    const inflate = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
    text          = new TextDecoder().decode(await bytesOf(inflate))
  } catch {
    return { problem: 'The link holds no match, or was cut short or altered' }
  }
  const reading = readMatch(text, 'The link')
  return reading.match ? { ...reading, ...place } : reading
}

/**
 * Reads a match from the text of a match file, naming the first thing it lacks
 * against the shape the two examples hold where it holds no match.
 *
 * Args:
 *   name : What the text was read from, which the line naming a problem opens
 *     on.
 *   text : The text read.
 */
export function readMatch(text: string, name: string): Reading {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { problem: `${name} holds no JSON` }
  }
  const problem = lacking(value)
  return problem ? { problem: `${name}: ${problem}` } : { match: value as Match }
}
