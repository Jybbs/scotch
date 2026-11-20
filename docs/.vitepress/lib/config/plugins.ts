import tailwindcss     from '@tailwindcss/vite'
import type { Plugin } from 'vite'

import { identityPlugin } from '../identity/sheet.ts'

/**
 * Lists the Vite plugins the site builds through, the one serving the
 * identity's sheet ahead of Tailwind's.
 */
export function sitePlugins(): Plugin[] {
  return [identityPlugin(), ...tailwindcss()]
}
