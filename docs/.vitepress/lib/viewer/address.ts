import { type Ref, onBeforeUnmount, shallowRef } from 'vue'

import { SAMPLES, type Sample }                        from './examples.ts'
import { type Place, encodedOf, fragmentOf, fromLink } from './link.ts'
import type { Loaded }                                 from './loaded.ts'
import type { Viewer }                                 from './state.ts'

/**
 * The page's address as the Viewer keeps it, beside the line naming why a
 * link's match could not be read.
 */
export interface Address {
  carry   : (loaded: Loaded) => Promise<void>
  link    : () => Promise<string>
  open    : () => Promise<void>
  problem : Ref<string>
  settle  : (delay: number) => void
}

/**
 * What a match carries in a link: the example it is, or its encoded text.
 */
type Carried = { encoded: string } | { sample: Sample }

/**
 * Reads the ply in view and the side the boards face, the place a link opens
 * its match at.
 */
function placeOf(viewer: Viewer): Place {
  return { ply: viewer.cursor.value, side: viewer.facing.value }
}

/**
 * Keeps the page's fragment carrying the match, the ply in view, and the side
 * the boards face, rewriting it once a step's moves land so a reload or a
 * shared link opens there, and opens the Viewer on the match a link's fragment
 * carries where the page was reached through one. It writes nothing before the
 * Viewer opens, so a page reached without a fragment keeps a bare address until
 * the reader steps.
 */
export function useAddress(viewer: Viewer): Address {
  const problem = shallowRef('')
  const carried = shallowRef<Carried>()
  let opened    = false
  let writing   : ReturnType<typeof setTimeout> | undefined

  const write = (): void => {
    if (!carried.value) return
    history.replaceState(history.state, '', `#${fragmentOf(carried.value, placeOf(viewer))}`)
  }
  onBeforeUnmount(() => clearTimeout(writing))

  return {
    problem: problem,

    carry: async loaded => {
      const sample  = viewer.sample.value
      carried.value = sample ? { sample } : undefined
      if (sample) return
      const encoded = await encodedOf(loaded.match)
      if (viewer.loaded.value !== loaded) return
      carried.value = { encoded }
      write()
    },

    link: async () => {
      const text = carried.value ?? { encoded: await encodedOf(viewer.loaded.value.match) }
      return `${location.origin}${location.pathname}#${fragmentOf(text, placeOf(viewer))}`
    },

    open: async () => {
      opened     = true
      const text = location.hash.slice(1)
      if (!text) return
      const reading = await fromLink(text)
      if (!reading.match) {
        problem.value = reading.problem
        return
      }
      const source = SAMPLES.find(({ name }) => name === reading.sample)?.source ?? 'A link'
      viewer.load(reading.match, source, reading.sample, reading.ply)
      viewer.turn(reading.side ?? 'white')
    },

    settle: delay => {
      clearTimeout(writing)
      if (opened) writing = setTimeout(write, delay)
    }
  }
}
