// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import * as handoff from '../../../../lib/data/handoff.ts'
import { Handoff }  from '../../../../theme/components/data/handoff.ts'

describe('Handoff', () => {
  it('numbers each command beside each stop it writes or prints and what the step before hands it', () => {
    const drawn = mount(Handoff)
    const commands = handoff.legs.map(({ command }) => command)
    expect(drawn.findAll('.sc-handoff-command code').map(code => code.text())).toEqual(commands)
    expect(drawn.findAll('.sc-handoff-handed')).toHaveLength(handoff.legs.length - 1)
    const stops = handoff.legs.flatMap(leg => leg.stops)
    expect(drawn.findAll('.sc-handoff-stops > li')).toHaveLength(stops.length)
    expect(drawn.find('.sc-handoff-step').text()).toBe(`1Step 1 of ${handoff.legs.length}`)
  })
})
