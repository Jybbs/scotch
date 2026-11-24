// @vitest-environment happy-dom
import { type VueWrapper, flushPromises, mount }         from '@vue/test-utils'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import * as numbers   from '../../../../../docs/.vitepress/lib/data/numbers.ts'
import * as omitted   from '../../../../../docs/.vitepress/lib/data/omitted.ts'
import { GameLedger } from '../../../../../docs/.vitepress/theme/components/data/ledger.ts'
import { pressed }    from '../../../common/keys.ts'
import * as markdown  from '../../../common/markdown.ts'
import { styled }     from '../../../common/tailwind.ts'

vi.mock('../../../../../docs/.vitepress/lib/rendered/omissions.json', async original => {
  const { default: rendered } = await original<{ default: omitted.Omissions }>()
  const changed               = structuredClone(rendered)
  changed.sections.find(({ section }) => section === 'Events')!.variant = 40
  return { default: changed }
})

const CHIP     = 'button[data-k="variant"] span'
const HATCH    = /^repeating-linear-gradient\(-45deg, ?rgb\(0, 0, 0\) 0 1\.5px, ?transparent 1\.5px 5px\)\s+color-mix\(in oklab, ?rgb\(0, 0, 0\) 62%, ?rgb\(255, 255, 255\)\)$/u
const INKS     = ':root { --sc-ink: rgb(0, 0, 0); --sc-page: rgb(255, 255, 255) }'
const LABEL    = 'button[data-k]:not([data-k="variant"]) span'
const REPEAT   = /^color-mix\(in oklab, ?rgb\(0, 0, 0\) 26%, ?rgb\(255, 255, 255\)\)$/u
const TYPESET  = { 'container-type': 'inline-size', 'font-size': '0.6rem', 'letter-spacing': '0.06em' }
// Widths in em at the segments' 0.6rem, a glyph taking JetBrains Mono's 0.6em advance and 0.06em tracking.
const WIDTHS   = { chip: 12 / 9.6, glyph: 0.66, label: 16 / 9.6 }
const sections = omitted.OMISSIONS.sections
const openings = sections.find(({ section }) => section === 'Openings')!

const cutoff = (drawn: VueWrapper): number =>
  Math.ceil(Math.max(widestSpan(drawn, LABEL, WIDTHS.label), widestSpan(drawn, CHIP, WIDTHS.chip)) * 10) / 10

const hides = (drawn: VueWrapper): RegExp =>
  new RegExp(String.raw`@container \(width < ${cutoff(drawn)}em\) \{\s*\S+ \{\s*visibility: hidden;`, 'u')

const widestSpan = (drawn: VueWrapper, selector: string, padding: number): number =>
  Math.max(...drawn.findAll(selector).map(span => span.text().length)) * WIDTHS.glyph + padding

describe('GameLedger', () => {
  it('draws a bar per section and a segment per count, pressing the Openings games under the floor', () => {
    const drawn = mount(GameLedger)
    expect(drawn.findAll('header').length).toBe(sections.length)
    expect(drawn.findAll('button[data-k]').length).toBe(omitted.segments.length)
    expect(drawn.find('[aria-pressed="true"]').attributes('data-k')).toBe('below')
    expect(drawn.find('span').text()).toBe(numbers.counted(openings.below))
    expect(drawn.find('p').text()).toBe(omitted.ledgerSentence('below', openings))
  })

  it('names the pressed count and lists the files behind it in the drawer', async () => {
    const drawn   = mount(GameLedger)
    const players = sections.find(({ section }) => section === 'Players')!
    const files   = omitted.holding('repeat', 'Players')
    await drawn.find('button[data-k="repeat"]').trigger('click')
    expect(drawn.find('p').text()).toBe(omitted.ledgerSentence('repeat', players))
    expect(drawn.findAll('details li').length).toBe(files.length)
    expect(drawn.find('summary').text()).toContain(numbers.counted(files.length))
  })

  it('lists its files flush in the doc column, each row 22px tall', async () => {
    const drawn = await markdown.columned(GameLedger)
    expect(await markdown.spacing(drawn.get('ol').element)).toEqual(markdown.FLUSH)
  })

  it('presses the segment beside it on an arrow key and focuses it, and answers no other key', async () => {
    const drawn    = mount(GameLedger, { attachTo: document.body })
    const segments = () => drawn.findAll('button[data-k]')
    const at       = () => segments().findIndex(segment => segment.attributes('aria-pressed') === 'true')
    const start    = at()
    expect(await pressed(segments()[start]!.element, 'ArrowLeft')).toBe(true)
    await flushPromises()
    expect(at()).toBe(start - 1)
    expect(document.activeElement).toBe(segments()[start - 1]!.element)
    expect(await pressed(segments()[at()]!.element, 'ArrowRight')).toBe(true)
    expect(at()).toBe(start)
    expect(await pressed(segments()[at()]!.element, 'Enter')).toBe(false)
    drawn.unmount()
  })

  it('dims every segment but the kind a corner mark lights', async () => {
    const drawn = mount(GameLedger)
    await drawn.find('[role=listitem]').trigger('pointerenter')
    const off = drawn.findAll('button[data-off]')
    expect(off.every(segment => segment.attributes('data-k') !== 'kept')).toBe(true)
    expect(off.length).toBe(omitted.segments.filter(({ kind }) => kind !== 'kept').length)
    await drawn.find('[role=listitem]').trigger('pointerleave')
    expect(drawn.findAll('[data-off]').length).toBe(0)
  })
})

describe('GameLedger, its styles', () => {
  const inks = document.createElement('style')
  let drawn: VueWrapper
  let sheet: HTMLStyleElement

  const tone = (selector: string, name: string): string =>
    getComputedStyle(drawn.get(selector).element).getPropertyValue(name)

  const declared = (selector: string, name: string): string | undefined => [...sheet.sheet!.cssRules]
    .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
    .filter(rule => drawn.get(selector).element.matches(rule.selectorText))
    .map(rule => rule.style.getPropertyValue(name))
    .findLast(Boolean)

  beforeAll(async () => {
    inks.textContent = INKS
    document.head.append(inks)
    drawn = mount(GameLedger, { attachTo: document.body })
    sheet = await styled(drawn.element)
  })

  afterAll(() => {
    drawn.unmount()
    sheet.remove()
    inks.remove()
  })

  it('hatches the variant segment and its swatch in the ink over the 62% tone, and no other kind', () => {
    expect(tone('button[data-k="variant"]', '--sc-data-mark')).toMatch(HATCH)
    expect(tone('[role=listitem]:last-child', '--sc-data-tone')).toMatch(HATCH)
    expect(tone('button[data-k="below"]', '--sc-data-mark')).not.toMatch(/gradient/u)
  })

  it('sets the variant count in the ink on a chip of the 26% repeat tone', () => {
    expect(declared(CHIP, 'background-color')).toBe('var(--sc-data-repeat)')
    expect(tone('[data-chart]', '--sc-data-repeat')).toMatch(REPEAT)
    expect(tone(CHIP, 'color')).toBe('rgb(0, 0, 0)')
    expect(tone(CHIP, 'width')).toBe('fit-content')
    expect([declared(CHIP, 'margin-block'), declared(CHIP, 'margin-inline')]).toEqual(['5px', 'auto'])
    expect([declared(CHIP, 'padding-block'), declared(CHIP, 'padding-inline')]).toEqual([undefined, '6px'])
    expect(tone(CHIP, 'border-radius')).toBe('2px')
    expect(tone(CHIP, 'line-height')).toBe('16px')
  })

  it('hides a label on any segment narrower than the widest label and chip, rounded up to 0.1em', () => {
    expect(Object.keys(TYPESET).map(name => declared('button[data-k]', name))).toEqual(Object.values(TYPESET))
    expect(declared(LABEL, 'padding-inline')).toBe('calc(var(--spacing) * 2)')
    expect(sheet.textContent).toMatch(hides(drawn))
  })
})
