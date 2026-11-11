import { type Component, defineAsyncComponent } from 'vue'

/**
 * The widgets the front page places, under the names `PLACED` gives them, each
 * loaded with the front page, so the counts and the example they read stay
 * out of every other page.
 */
export const FRONT_WIDGETS: Record<string, Component> = {
  prints  : defineAsyncComponent(async () => (await import('./prints.ts')).Prints),
  session : defineAsyncComponent(async () => (await import('./session.ts')).Session),
  split   : defineAsyncComponent(async () => (await import('./split.ts')).Split),
  store   : defineAsyncComponent(async () => (await import('./store.ts')).Store)
}
