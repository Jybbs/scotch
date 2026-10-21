import { type Component, defineAsyncComponent } from 'vue'

/**
 * The widgets the Data pages and the Guide's store page place, under the names
 * `PLACED` gives them, each loaded with the page that places it, so the counts
 * they read stay out of every other page.
 */
export const DATA_WIDGETS: Record<string, Component> = {
  archives : defineAsyncComponent(async () => (await import('./archives.ts')).Archives),
  decades  : defineAsyncComponent(async () => (await import('./decades.ts')).Decades),
  eras     : defineAsyncComponent(async () => (await import('./eras.ts')).Eras),
  files    : defineAsyncComponent(async () => (await import('./files.ts')).Files),
  results  : defineAsyncComponent(async () => (await import('./results.ts')).Results)
}
