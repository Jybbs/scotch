import { type Component, defineAsyncComponent } from 'vue'

/**
 * The widgets the identity page places, under the names `PLACED` gives them,
 * each loaded with that page, so the counts and the paths they read stay out of
 * every other page.
 */
export const REFERENCE_WIDGETS: Record<string, Component> = {
  construction : defineAsyncComponent(async () => (await import('./construction.ts')).Construction),
  faces        : defineAsyncComponent(async () => (await import('./faces.ts')).Faces),
  marks        : defineAsyncComponent(async () => (await import('./marks.ts')).Marks),
  palette      : defineAsyncComponent(async () => (await import('./palette.ts')).Palette),
  pieces       : defineAsyncComponent(async () => (await import('./pieces.ts')).Pieces),
  roles        : defineAsyncComponent(async () => (await import('./roles.ts')).Roles),
  series       : defineAsyncComponent(async () => (await import('./series.ts')).Series)
}
