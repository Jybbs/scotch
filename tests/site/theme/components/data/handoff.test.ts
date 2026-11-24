// @vitest-environment happy-dom
import { mount }                from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import * as handoff from '../../../../../docs/.vitepress/lib/data/handoff.ts'
import { Handoff }  from '../../../../../docs/.vitepress/theme/components/data/handoff.ts'

describe('Handoff', () => {
  it('numbers each command beside each stop it writes or prints and what the step before hands it', () => {
    const drawn = mount(Handoff)
    const commands = handoff.legs.map(({ command }) => command)
    expect(drawn.findAll('code').map(code => code.text())).toEqual(commands)
    expect(drawn.findAll('p > span[aria-hidden]')).toHaveLength(handoff.legs.length - 1)
    const stops = handoff.legs.flatMap(leg => leg.stops)
    expect(drawn.findAll('li li')).toHaveLength(stops.length)
    expect(drawn.get('b').element.parentElement!.textContent).toBe(`1Step 1 of ${handoff.legs.length}`)
  })
})
