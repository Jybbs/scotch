import { describe, expect, it } from 'vitest'

import { FOOTER, NOT_FOUND } from '../../../lib/config/chrome.ts'
import { pageAt }            from '../../common/pages.ts'

describe('FOOTER', () => {
  const message = FOOTER.message ?? ''

  it.each([
    ['MIT license', 'https://opensource.org/license/mit'],
    ['SIL Open Font License', 'https://openfontlicense.org'],
    ['3-clause BSD license', 'https://commons.wikimedia.org/wiki/File:Chess_klt45.svg']
  ])('links the %s to its text', (license, address) => {
    expect(message).toContain(`<a href="${address}">${license}</a>`)
  })

  it('credits the pieces to Cburnett', () => {
    expect(message).toContain('drawn by Cburnett')
  })

  it('reads as prose once its tags are left out', () => {
    expect(message.replaceAll(/<[^>]+>/gu, '')).toReadAsProse()
  })
})

describe('NOT_FOUND', () => {
  it('links a page the site builds, which no build check reads', () => {
    expect(pageAt(String(NOT_FOUND.link))).toBe('index.md')
  })

  it.each(Object.entries(NOT_FOUND).filter(([key]) => key !== 'link'))('sets its %s as prose', (_, text) => {
    expect(text).toReadAsProse()
  })
})
