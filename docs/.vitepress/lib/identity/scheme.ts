import { defaultDocument, useMutationObserver } from '@vueuse/core'
import { type Ref, onMounted, shallowRef }      from 'vue'

import { propertyOf } from './tokens.ts'

/**
 * Reads whether the root element carries the `dark` class the site's appearance
 * switch sets.
 */
function darkened(): boolean {
  return document.documentElement.classList.contains('dark')
}

/**
 * Resolves the color each custom property computes to under `element`, each
 * named by its palette token or its role, through a probe whose `color` reads
 * it, since a custom property's own computed value keeps the `var()` and
 * `light-dark()` it was written with. A canvas reads its colors this way once
 * it is in the document, since an element outside it resolves no style.
 */
export function resolved<K extends string>(
  element : HTMLElement,
  names   : Readonly<Record<K, string>>
): Record<K, string> {
  const probe = document.createElement('i')
  element.append(probe)
  const colors = Object.fromEntries(Object.entries<string>(names).map(([key, name]) => {
    probe.style.color = `var(${propertyOf(name)})`
    return [key, getComputedStyle(probe).color]
  })) as Record<K, string>
  probe.remove()
  return colors
}

/**
 * Follows whether the root element carries the `dark` class from the moment the
 * page mounts and through each change to its classes, so a color read after a
 * change reads the scheme the page now shows.
 */
export function useDark(): Ref<boolean> {
  const dark = shallowRef(false)
  onMounted(() => {
    dark.value = darkened()
  })
  useMutationObserver(defaultDocument?.documentElement, () => {
    dark.value = darkened()
  }, { attributeFilter: ['class'] })
  return dark
}
