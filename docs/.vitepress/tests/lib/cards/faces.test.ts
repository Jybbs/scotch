import { describe, expect, it } from 'vitest'

import { FACES, facesOf } from '../../../lib/cards/faces.ts'

describe('facesOf', () => {
  const fonts = facesOf(import.meta.url)

  it.each(Object.entries(FACES))('reads the %s face as WOFF2', (face, { style, weight }) => {
    const font = fonts.find(({ name }) => name === face)
    expect(font).toMatchObject({ style, weight })
    expect((font!.data as Buffer).toString('ascii', 0, 4)).toBe('wOF2')
  })
})
