// @vitest-environment happy-dom
import { mount }                       from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import { PICKED, anchored } from '../../../lib/markdown/notes.ts'
import { Notes }            from '../../../theme/components/notes.ts'

const PAGE = `
<p>A claim.<sup class="footnote-ref"><a class="sc-cite" href="#footnote-a" id="footnote-ref-a">1</a></sup> Other text.</p>
<a id="elsewhere" href="#top">Top</a>
<section class="footnotes"><ol class="footnotes-list">
<li id="footnote-a" class="footnote-item" tabindex="-1"><p>A. <a href="#footnote-ref-a" class="footnote-backref">back</a></p></li>
</ol></section>`

function press(selector: string): void {
  document.querySelector(selector)!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

afterEach(() => {
  document.body.innerHTML = ''
  location.hash = ''
})

describe('Notes', () => {
  it("picks out a citation and moves the keyboard's focus to its entry on a jump", () => {
    document.body.innerHTML = PAGE
    const notes = mount(Notes, { attachTo: document.body })
    press('#footnote-ref-a')
    expect(anchored('footnote-a', document)!.hasAttribute(PICKED)).toBe(true)
    expect(document.activeElement!.id).toBe('footnote-a')
    notes.unmount()
  })

  it("moves the keyboard's focus back to the citation on a way back", () => {
    document.body.innerHTML = PAGE
    const notes = mount(Notes, { attachTo: document.body })
    press('.footnote-backref')
    expect(anchored('footnote-ref-a', document)!.hasAttribute(PICKED)).toBe(true)
    expect(document.activeElement!.id).toBe('footnote-ref-a')
    notes.unmount()
  })

  it('leaves a press on any other link alone', () => {
    document.body.innerHTML = PAGE
    const notes = mount(Notes, { attachTo: document.body })
    press('#elsewhere')
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector(`[${PICKED}]`)).toBeNull()
    notes.unmount()
  })

  it('picks out the citation a page opens at the address of', () => {
    document.body.innerHTML = PAGE
    location.hash = '#footnote-ref-a'
    const notes = mount(Notes, { attachTo: document.body })
    expect(anchored('footnote-ref-a', document)!.hasAttribute(PICKED)).toBe(true)
    notes.unmount()
  })

  it('picks out nothing on opening a page at an address naming no citation', () => {
    document.body.innerHTML = PAGE
    location.hash = '#elsewhere'
    const notes = mount(Notes, { attachTo: document.body })
    expect(document.querySelector(`[${PICKED}]`)).toBeNull()
    notes.unmount()
  })
})
