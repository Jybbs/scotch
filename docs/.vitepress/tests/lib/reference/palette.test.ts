import { describe, expect, it } from 'vitest'

import { contrast }        from '../../../lib/identity/colors.ts'
import { IDENTITY, hexOf } from '../../../lib/identity/tokens.ts'
import * as palette        from '../../../lib/reference/palette.ts'

describe('TOKENS', () => {
  it('sets every color the palette declares, once', () => {
    expect(palette.TOKENS.toSorted()).toEqual(Object.keys(IDENTITY.palette).toSorted())
  })
})

describe('GROUNDS', () => {
  it('reads the roles a color is measured against from the kinds the roles declare', () => {
    expect(palette.GROUNDS.toSorted()).toEqual(['page', 'raised', 'side', 'tint'])
  })
})

describe('heldOf', () => {
  it("measures a color against a ground's color in one scheme", () => {
    expect(palette.heldOf('primary', 'page', 'dark')).toBe(contrast(hexOf('primary'), palette.colorOf('page', 'dark')))
  })
})

describe('levelOf', () => {
  it.each([[4.5, 'text'], [4.49, 'mark'], [3, 'mark'], [2.99, 'fill']])('names %f as %s', (ratio, level) => {
    expect(palette.levelOf(ratio)).toBe(level)
  })
})

describe('logShare', () => {
  it('places 1:1 at the start of the scale and 21:1 at its end', () => {
    expect(palette.logShare(1)).toBe(0)
    expect(palette.logShare(21)).toBeCloseTo(1)
  })
})

describe('tickAt', () => {
  it('insets each tick but the last, which stands at the far edge', () => {
    expect(palette.tickAt(1)).toBe(2)
    expect(palette.tickAt(21)).toBe(100)
  })
})

describe('meaningOf', () => {
  it('reads what the identity states a color is for', () => {
    expect(palette.meaningOf('primary')).toBe(IDENTITY.meanings.palette.primary)
  })
})

describe('noRoleOf', () => {
  it('names a chart series only for a color that is one', () => {
    expect(palette.noRoleOf('series_6')).toBe('No role, a chart series')
    expect(palette.noRoleOf('warning')).toBe('No role')
  })
})

describe('onColorOf', () => {
  it('sets text on a dark color in the light ground and on a light color in the dark one', () => {
    expect(palette.onColorOf('dark')).toBe(hexOf('ground'))
    expect(palette.onColorOf('ground')).toBe(hexOf('dark'))
  })
})

describe('paintWord', () => {
  it('writes a token as it stands and a mix as its parts', () => {
    expect(palette.paintWord('primary')).toBe('primary')
    expect(palette.paintWord(['primary', 40, 'white'])).toBe('primary 40% white')
  })
})

describe('rolesOf', () => {
  it('lists the roles taking a color, marking those taking it in a mix', () => {
    expect(palette.rolesOf('primary')).toContainEqual(['run', false])
    expect(palette.rolesOf('critical')).toContainEqual(['alert', true])
  })

  it('lists no role for a color only a chart draws', () => {
    expect(palette.rolesOf('series_6')).toEqual([])
  })
})
