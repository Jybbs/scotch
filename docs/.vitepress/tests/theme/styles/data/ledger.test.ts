// @vitest-environment happy-dom
import fs   from 'node:fs'
import path from 'node:path'

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type { Omissions } from '../../../../lib/data/omitted.ts'
import { repoRoot }       from '../../../../lib/site/paths.ts'
import { GameLedger }     from '../../../../theme/components/data/ledger.ts'

vi.mock('../../../../lib/rendered/omissions.json', async original => {
  const { default: rendered } = await original<{ default: Omissions }>()
  const changed               = structuredClone(rendered)
  changed.sections.find(({ section }) => section === 'Events')!.variant = 40
  return { default: changed }
})

const HATCH = /^repeating-linear-gradient\(-45deg, rgb\(0, 0, 0\) 0 1\.5px, transparent 1\.5px 5px\)\s+color-mix\(in oklab, rgb\(0, 0, 0\) 62%, rgb\(255, 255, 255\)\)$/u
const INKS  = ':root { --sc-data-ink: rgb(0, 0, 0); --sc-data-page: rgb(255, 255, 255) }'

describe('the ledger stylesheet', () => {
  it('hatches the variant segment and its swatch in the ink over the 62% tone, and no other kind', () => {
    const sheet = document.createElement('style')
    sheet.textContent = INKS + fs.readFileSync(
      path.join(repoRoot(import.meta.url), 'docs/.vitepress/theme/styles/data/ledger.css'), 'utf8'
    )
    document.head.append(sheet)
    const drawn = mount(GameLedger, { attachTo: document.body })
    const tone  = (selector: string, name: string): string =>
      getComputedStyle(drawn.get(selector).element).getPropertyValue(name)
    expect(tone('.sc-data-ledger-segment[data-k="variant"]', '--sc-data-mark')).toMatch(HATCH)
    expect(tone('.sc-data-legend-mark:last-child', '--sc-data-tone')).toMatch(HATCH)
    expect(tone('.sc-data-ledger-segment[data-k="below"]', '--sc-data-mark')).not.toMatch(/gradient/u)
    drawn.unmount()
  })
})
