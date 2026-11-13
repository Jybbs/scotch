import { describe, expect, it } from 'vitest'

import { statsOf } from '../../../lib/viewer/colophon.ts'

describe('statsOf', () => {
  it('names the version, the commit, and the counts the index holds, each grouped by thousands', () => {
    expect(statsOf('0123456', { games: 435321, positions: 37039333 }, '0.2.0')).toEqual([
      { label: 'Version', value: '0.2.0' },
      { label: 'Commit', value: '0123456' },
      { label: 'Games', value: '435,321' },
      { label: 'Positions', value: '37,039,333' }
    ])
  })

  it('leaves the commit out where the build knows none', () => {
    expect(statsOf(undefined, { games: 1, positions: 2 }, '0.2.0').map(({ label }) => label))
      .toEqual(['Version', 'Games', 'Positions'])
  })
})
