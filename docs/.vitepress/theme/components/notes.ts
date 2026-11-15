import { defaultDocument, useEventListener } from '@vueuse/core'
import { defineComponent, onMounted }        from 'vue'

import { anchored, citationOf, pick, targetOf } from '../../lib/markdown/notes.ts'

/**
 * Picks out a citation, its source's entry, and the clause it follows whenever
 * a press reaches the citation or a way back to it, and when a page opens at
 * the citation's address. A jump moves the keyboard's focus to the entry and a
 * way back returns it to the citation, so the next press continues from there.
 */
export const Notes = defineComponent({
  name  : 'SiteNotes',
  setup : () => {
    const page = defaultDocument!
    useEventListener('click', (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null
      const mark = link ? citationOf(link, page) : null
      if (!mark) return
      pick(mark, page)
      const land = link === mark ? targetOf(mark, page) : mark
      land?.focus({ preventScroll: true })
    })
    onMounted(() => {
      const opened = anchored(decodeURIComponent(location.hash.slice(1)), page)
      const mark   = opened ? citationOf(opened, page) : null
      if (mark) pick(mark, page)
    })
    return (): null => null
  }
})
