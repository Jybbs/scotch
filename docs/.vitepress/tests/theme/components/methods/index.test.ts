import { describe, expect, it } from 'vitest'

import { METHODS_WIDGETS } from '../../../../theme/components/methods/index.ts'
import { Run }             from '../../../../theme/components/methods/run.ts'

describe('METHODS_WIDGETS', () => {
  it('places the widget under the name the Methods page gives it', () => {
    expect(METHODS_WIDGETS).toEqual({ run: Run })
  })
})
