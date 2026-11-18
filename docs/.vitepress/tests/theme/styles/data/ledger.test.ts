// @vitest-environment happy-dom
import fs   from 'node:fs'
import path from 'node:path'

import { type VueWrapper, mount }                        from '@vue/test-utils'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Omissions } from '../../../../lib/data/omitted.ts'
import { repoRoot }       from '../../../../lib/site/paths.ts'
import { GameLedger }     from '../../../../theme/components/data/ledger.ts'

vi.mock('../../../../lib/rendered/omissions.json', async original => {
  const { default: rendered } = await original<{ default: Omissions }>()
  const changed               = structuredClone(rendered)
  changed.sections.find(({ section }) => section === 'Events')!.variant = 40
  return { default: changed }
})

const CHIP  = ".sc-data-ledger-segment[data-k='variant'] span"
const HATCH = /^repeating-linear-gradient\(-45deg, rgb\(0, 0, 0\) 0 1\.5px, transparent 1\.5px 5px\)\s+color-mix\(in oklab, rgb\(0, 0, 0\) 62%, rgb\(255, 255, 255\)\)$/u
const INKS  = ':root { --sc-data-ink: rgb(0, 0, 0); --sc-data-page: rgb(255, 255, 255) }'

describe('the ledger stylesheet', () => {
  const sheet = document.createElement('style')
  let drawn: VueWrapper

  const tone = (selector: string, name: string): string =>
    getComputedStyle(drawn.get(selector).element).getPropertyValue(name)

  beforeAll(() => {
    sheet.textContent = INKS + fs.readFileSync(
      path.join(repoRoot(import.meta.url), 'docs/.vitepress/theme/styles/data/ledger.css'), 'utf8'
    )
    document.head.append(sheet)
    drawn = mount(GameLedger, { attachTo: document.body })
  })

  afterAll(() => {
    drawn.unmount()
    sheet.remove()
  })

  it('hatches the variant segment and its swatch in the ink over the 62% tone, and no other kind', () => {
    expect(tone('.sc-data-ledger-segment[data-k="variant"]', '--sc-data-mark')).toMatch(HATCH)
    expect(tone('.sc-data-legend-mark:last-child', '--sc-data-tone')).toMatch(HATCH)
    expect(tone('.sc-data-ledger-segment[data-k="below"]', '--sc-data-mark')).not.toMatch(/gradient/u)
  })

  it('sets the variant count in the ink on a chip of the 26% repeat tone', () => {
    const chip = [...sheet.sheet!.cssRules]
      .filter(rule => rule instanceof CSSStyleRule)
      .find(rule => rule.selectorText === CHIP)
    expect(chip?.style.getPropertyValue('background')).toBe('var(--sc-data-repeat)')
    expect(tone('.sc-data-ledger', '--sc-data-repeat'))
      .toBe('color-mix(in oklab, rgb(0, 0, 0) 26%, rgb(255, 255, 255))')
    expect(tone(CHIP, 'color')).toBe('rgb(0, 0, 0)')
    expect(tone(CHIP, 'width')).toBe('fit-content')
    expect(tone(CHIP, 'margin')).toBe('5px auto')
    expect(tone(CHIP, 'padding')).toBe('0px 6px')
    expect(tone(CHIP, 'border-radius')).toBe('2px')
    expect(tone(CHIP, 'line-height')).toBe('16px')
  })
})
