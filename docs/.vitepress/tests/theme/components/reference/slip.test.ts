// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import { TERMS, addressOf } from '../../../../lib/reference/terms.ts'
import { Slip }             from '../../../../theme/components/reference/slip.ts'

function page(): { link: HTMLElement, slip: ReturnType<typeof mount>, unrelated: HTMLElement } {
  document.body.innerHTML = `<a class="sc-term" data-term="ply" href="/reference/terms#ply">ply</a><a class="sc-term" data-term="run" href="/reference/terms#run">run</a><p>Other</p>`
  return {
    link      : document.querySelector<HTMLElement>('.sc-term')!,
    slip      : mount(Slip, { attachTo: document.body }),
    unrelated : document.querySelector('p')!
  }
}

function over(target: Element, pointerType = 'mouse'): void {
  target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType }))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Slip', () => {
  it('stays closed until a term is reached', () => {
    expect(page().slip.attributes('data-open')).toBeUndefined()
  })

  it("opens on a term under the pointer with its name, its sentence, and its link", async () => {
    const { link, slip } = page()
    over(link)
    await flushPromises()
    const term = TERMS.find(({ anchor }) => anchor === 'ply')!
    expect(slip.attributes('data-open')).toBe('')
    expect(slip.find('b').text()).toBe(term.name)
    expect(slip.find('span').text()).toBe(term.sentence)
    expect(slip.find('a').attributes('href')).toBe(addressOf(term))
    expect(link.getAttribute('aria-describedby')).toBe(slip.attributes('id'))
    slip.unmount()
  })

  it('moves from one term to the next without closing', async () => {
    const { link, slip } = page()
    const other          = document.querySelectorAll<HTMLElement>('.sc-term')[1]!
    over(link)
    await flushPromises()
    over(link)
    over(other)
    await flushPromises()
    expect(slip.find('b').text()).toBe('Run')
    expect(link.hasAttribute('aria-describedby')).toBe(false)
    slip.unmount()
  })

  it('holds open under a pointer on the slip and closes off it', async () => {
    const { link, slip, unrelated } = page()
    over(link)
    await flushPromises()
    over(slip.element)
    await flushPromises()
    expect(slip.attributes('data-open')).toBe('')
    over(unrelated)
    await flushPromises()
    expect(slip.attributes('data-open')).toBeUndefined()
    expect(link.hasAttribute('aria-describedby')).toBe(false)
    slip.unmount()
  })
})

describe('Slip, under a finger and the keyboard', () => {
  it('ignores a touch, so the link a finger taps simply opens the terms page', async () => {
    const { link, slip } = page()
    over(link, 'touch')
    await flushPromises()
    expect(slip.attributes('data-open')).toBeUndefined()
    slip.unmount()
  })

  it('opens on the keyboard focus and closes as it leaves', async () => {
    const { link, slip, unrelated } = page()
    link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await flushPromises()
    expect(slip.attributes('data-open')).toBe('')
    unrelated.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    unrelated.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await flushPromises()
    expect(slip.attributes('data-open')).toBe('')
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await flushPromises()
    expect(slip.attributes('data-open')).toBeUndefined()
    slip.unmount()
  })
})

describe('Slip, closing', () => {
  it('closes on Escape and leaves other keys', async () => {
    const { link, slip } = page()
    over(link)
    await flushPromises()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    await flushPromises()
    expect(slip.attributes('data-open')).toBe('')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(slip.attributes('data-open')).toBeUndefined()
    slip.unmount()
  })

  it('closes on a click on a term or on the slip and leaves one elsewhere', async () => {
    const { link, slip, unrelated } = page()
    over(link)
    await flushPromises()
    unrelated.click()
    await flushPromises()
    expect(slip.attributes('data-open')).toBe('')
    link.click()
    await flushPromises()
    expect(slip.attributes('data-open')).toBeUndefined()
    over(link)
    await flushPromises()
    slip.element.click()
    await flushPromises()
    expect(slip.attributes('data-open')).toBeUndefined()
    slip.unmount()
  })

  it('closes as the page scrolls', async () => {
    const { link, slip } = page()
    over(link)
    await flushPromises()
    window.dispatchEvent(new Event('scroll'))
    await flushPromises()
    expect(slip.attributes('data-open')).toBeUndefined()
    slip.unmount()
  })

  it('reads an event with no element behind it as no term', async () => {
    const { slip } = page()
    window.dispatchEvent(new PointerEvent('pointerover'))
    await flushPromises()
    expect(slip.attributes('data-open')).toBeUndefined()
    slip.unmount()
  })
})
