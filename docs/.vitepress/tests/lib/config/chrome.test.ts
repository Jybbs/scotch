import { describe, expect, it } from 'vitest'

import { FOOTER, NOT_FOUND } from '../../../lib/config/chrome.ts'
import { pageAt }            from '../../common/pages.ts'

describe('FOOTER', () => {
  const message = FOOTER.message ?? ''

  it.each([
    ['MIT Licensed', 'https://opensource.org/license/mit'],
    ['SIL Open Font License', 'https://openfontlicense.org'],
    ['3-clause BSD license', 'https://commons.wikimedia.org/wiki/File:Chess_klt45.svg']
  ])('links %s to its license', (license, address) => {
    expect(message).toContain(`<a href="${address}">${license}</a>`)
  })

  it('reads as one line of three parts, the code, the faces, and the pieces by Cburnett', () => {
    expect(message.replaceAll(/<[^>]+>/gu, '')).toBe(
        'MIT Licensed · faces under the SIL Open Font License · '
      + 'pieces by Cburnett under the 3-clause BSD license'
    )
  })

  it('links no file on GitHub', () => {
    expect(message).not.toMatch(/github\.com/u)
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
