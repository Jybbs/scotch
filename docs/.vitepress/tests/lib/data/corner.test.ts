import { describe, expect, it } from 'vitest'

import { dimmed } from '../../../lib/data/corner.ts'

describe('dimmed', () => {
  it.each([
    ['kept', null, undefined],
    ['kept', 'kept', undefined],
    ['kept', 'below', '']
  ] as const)('dims the %s part while %s is lit: %j', (key, lit, off) => {
    expect(dimmed(key, lit)).toBe(off)
  })
})
