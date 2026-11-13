import { type Component, defineAsyncComponent } from 'vue'

/**
 * The widgets the Data pages and the Guide's store page place, under the names
 * `PLACED` gives them, each loaded with the page that places it, so the counts
 * they read stay out of every other page.
 */
export const DATA_WIDGETS: Record<string, Component> = {
  archives : defineAsyncComponent(async () => (await import('./archives.ts')).Archives),
  carried  : defineAsyncComponent(async () => (await import('./carried.ts')).TagGaps),
  crowding : defineAsyncComponent(async () => (await import('./crowding.ts')).CrowdedLines),
  dated    : defineAsyncComponent(async () => (await import('./dated.ts')).DatedBands),
  decades  : defineAsyncComponent(async () => (await import('./decades.ts')).Decades),
  eras     : defineAsyncComponent(async () => (await import('./eras.ts')).Eras),
  files    : defineAsyncComponent(async () => (await import('./files.ts')).Files),
  floor    : defineAsyncComponent(async () => (await import('./floor.ts')).RatingFloor),
  ledger   : defineAsyncComponent(async () => (await import('./ledger.ts')).GameLedger),
  parting  : defineAsyncComponent(async () => (await import('./parting.ts')).SharedParting),
  partings : defineAsyncComponent(async () => (await import('./partings.ts')).SharedPartings),
  results  : defineAsyncComponent(async () => (await import('./results.ts')).Results),
  tie      : defineAsyncComponent(async () => (await import('./tie.ts')).TieOrder)
}
