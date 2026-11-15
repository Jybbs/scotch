import { type Component, defineAsyncComponent } from 'vue'

/**
 * The widgets the front page and the Guide's Studying a Match place, under the
 * names `PLACED` gives them, each loaded with the page placing it, so the
 * counts and the example they read stay out of every other page.
 */
export const FRONT_WIDGETS: Record<string, Component> = {
  menu    : defineAsyncComponent(async () => (await import('./menu.ts')).Menu),
  opening : defineAsyncComponent(async () => (await import('./opening.ts')).Opening),
  prints  : defineAsyncComponent(async () => (await import('./prints.ts')).Prints),
  session : defineAsyncComponent(async () => (await import('./session.ts')).Session),
  split   : defineAsyncComponent(async () => (await import('./split.ts')).Split),
  store   : defineAsyncComponent(async () => (await import('./store.ts')).Store)
}
