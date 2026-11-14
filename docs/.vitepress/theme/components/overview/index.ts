import { type Component, defineAsyncComponent } from 'vue'

/**
 * The widgets the section overviews place, under the names `PLACED` gives them,
 * each loaded with the page that places it, so the example match the rails read
 * stays out of every other page.
 */
export const OVERVIEW_WIDGETS: Record<string, Component> = {
  rails: defineAsyncComponent(async () => (await import('./rails.ts')).Rails)
}
