import type { Run } from '../../../docs/.vitepress/lib/config/chrome.ts'

/**
 * Reads a line's runs as plain text.
 */
export function textOf(runs: readonly Run[]): string {
  return runs.map(run => typeof run === 'string' ? run : run.text).join('')
}
