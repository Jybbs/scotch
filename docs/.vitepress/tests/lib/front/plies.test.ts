import { describe, expect, it } from 'vitest'

import { frontOf }                    from '../../../lib/front/example.ts'
import { lastOf, phaseOf, readingAt } from '../../../lib/front/plies.ts'

const front = frontOf()

describe('lastOf', () => {
  it('reads the last ply of the run the two games share', () => {
    expect(lastOf(front)).toBe(12)
  })
})

describe('phaseOf', () => {
  it.each([
    [0, 'start'], [1, 'apart'], [6, 'apart'], [7, 'met'], [8, 'run'], [12, 'run'], [13, 'parted']
  ] as const)('reads ply %i as %s', (ply, phase) => {
    expect(phaseOf(front, ply)).toBe(phase)
  })
})

describe('readingAt', () => {
  it.each([[0, 0], [6, 0], [7, 1], [12, 6], [13, 6], [18, 6]] as const)(
    'counts the run at ply %i as %i positions', (ply, figure) => {
      expect(readingAt(front, ply).figure).toBe(figure)
    })

  it('names a transposition at the ply the games meet', () => {
    expect(readingAt(front, 7)).toEqual({
      figure : 1,
      moves  : { stored: '4. e3', submitted: '4. d4' },
      say    : 'Two orders of moves reach one position, a transposition.',
      unit   : 'position shared'
    })
  })

  it("keeps the stored game's move past the run hidden", () => {
    expect(readingAt(front, 13).moves).toEqual({ stored: 'Hidden', submitted: '7. O-O' })
  })
})
