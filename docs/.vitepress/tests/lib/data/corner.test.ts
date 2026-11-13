import { describe, expect, it } from 'vitest'

import { dimmed } from '../../../lib/data/corner.ts'

describe('dimmed', () => {
  it.each([
    ['kept', null, false],
    ['kept', 'kept', false],
    ['kept', 'below', true]
  ] as const)('dims the %s part while %s is lit: %s', (key, lit, off) => {
    expect(dimmed(key, lit)).toEqual({ 'sc-data-off': off })
  })
})
