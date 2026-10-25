// @vitest-environment happy-dom
import { flushPromises, mount }                        from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { Seat } from '../../../../theme/components/viewer/seat.ts'
import { test } from '../../../common/clock.ts'

/**
 * The call the stand-in popover API records each field it opens through.
 */
const opened = vi.fn<() => void>()

/**
 * Mounts a seat copying the text `make` gives.
 */
function mounted(make: () => Promise<string> | string): ReturnType<typeof mount<typeof Seat>> {
  return mount(Seat, {
    attachTo : document.body,
    props    : { done: 'Link copied', icon: 'link', label: 'Copy link', make, title: 'A link to this match' }
  })
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value: opened })
})

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  opened.mockClear()
  document.body.replaceChildren()
})

describe('Seat', () => {
  test('copies the text it makes, naming the copy until it reads as copying again', async ({ clock }) => {
    const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const wrapper = mounted(() => Promise.resolve('https://scotch.fyi/viewer#sample=match'))
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(written).toHaveBeenCalledWith('https://scotch.fyi/viewer#sample=match')
    expect([wrapper.find('button').text(), wrapper.find('[role="status"]').text()])
      .toEqual(['Link copied', 'Link copied'])
    clock.advanceTimersByTime(2400)
    await flushPromises()
    expect(wrapper.find('button').text()).toBe('Copy link')
  })

  test('lays the text out selected in a field where the page may not write the clipboard', async () => {
    vi.spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(300, 100, 120, 32))
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(360)
    const wrapper = mounted(() => '1. d4 Nf6')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    const field = wrapper.find('textarea').element
    expect([field.value, field.selectionStart, field.selectionEnd]).toEqual(['1. d4 Nf6', 0, 9])
    expect((wrapper.find('.sc-viewer-copy').element as HTMLElement).style)
      .toMatchObject({ left: '60px', top: '140px' })
    expect([opened.mock.calls.length, wrapper.find('[role="status"]').text()])
      .toEqual([1, 'The text is selected to copy'])
  })

  test('keeps the field 16 pixels from the page’s left edge where it would run past it', async () => {
    vi.spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(300, 100, 120, 32))
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(480)
    const wrapper = mounted(() => '1. d4 Nf6')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect((wrapper.find('.sc-viewer-copy').element as HTMLElement).style.left).toBe('16px')
  })
})
