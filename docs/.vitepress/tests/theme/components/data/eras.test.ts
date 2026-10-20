// @vitest-environment happy-dom
import { type DOMWrapper, type VueWrapper, mount } from '@vue/test-utils'
import { describe, expect, it, vi }                from 'vitest'

import { CHART, moveX } from '../../../../lib/data/lengths.ts'
import { useMove }      from '../../../../lib/data/move.ts'
import { tenth }        from '../../../../lib/data/numbers.ts'
import * as ridges      from '../../../../lib/data/ridges.ts'
import { Eras }         from '../../../../theme/components/data/eras.ts'
import { prevented }    from '../../../common/keys.ts'
import { reduceMotion } from '../../../common/motion.ts'
import { unsized }      from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const all    = ridges.ridgesOf()
const layout = ridges.ridgesLayout(all.length, 600)

/**
 * Mounts the chart on the move the charts open on and finds its list of ridges.
 */
function mounted(): { eras: VueWrapper, list: DOMWrapper<Element> } {
  useMove().value = CHART.opening
  const eras = mount(Eras)
  return { eras, list: eras.find('[role="listbox"]') }
}

/**
 * Reads the name of the picked ridge and the move the readings name.
 */
function picked(eras: VueWrapper): string[] {
  return eras.findAll('.sc-data-read dd').map(value => value.text())
}

describe('Eras, as it opens', () => {
  it("sets the picked ridge's median beside the sentence comparing it with the others", () => {
    const { eras } = mounted()
    expect(eras.find('.sc-data-big').text()).toBe(String(all.at(-1)!.quartiles[1]))
    expect(eras.find('.sc-data-say').text()).toBe(ridges.ridgeSummary(all, all.length - 1))
  })
})

describe('Eras', () => {
  it('draws a ridge per era as an option, the latest picked, and the move the charts share', () => {
    const { eras, list } = mounted()
    expect(eras.findAll('[role="option"]').length).toBe(all.length)
    const active = list.attributes('aria-activedescendant')
    expect(eras.find('[aria-selected="true"]').attributes('id')).toBe(active)
    const reading = ridges.ridgeReading(all.at(-1)!, CHART.opening)
    expect(picked(eras)).toEqual(reading.map(value => value.slice(1).join(' ')))
  })

  it('names each ridge by its decade and the move half its games end by, beside its name in capitals', () => {
    const { eras } = mounted()
    expect(eras.findAll('[role="option"]').map(ridge => ridge.attributes('aria-label')))
      .toEqual(all.map(ridge => `${ridge.name}, half ending by move ${ridge.quartiles[1]}`))
    expect(eras.findAll('.sc-data-ridge-name').map(name => name.text()))
      .toEqual(all.map(ridge => ridge.label))
  })

  it.each([
    { key: 'ArrowUp', move: CHART.opening, row: all.length - 2 },
    { key: 'ArrowDown', move: CHART.opening, row: all.length - 1 },
    { key: 'ArrowRight', move: CHART.opening + 1, row: all.length - 1 },
    { key: 'Home', move: 1, row: all.length - 1 }
  ])('picks ridge $row at move $move on $key', async ({ key, move, row }) => {
    const { eras, list } = mounted()
    await list.trigger('keydown', { key })
    expect([useMove().value, picked(eras)[0]]).toEqual([move, all[row]!.name])
  })

  it('ignores any other key', async () => {
    const { eras, list } = mounted()
    await list.trigger('keydown', { key: 'a' })
    expect([useMove().value, picked(eras)[0]]).toEqual([CHART.opening, all.at(-1)!.name])
  })
})

describe('Eras, under a pointer', () => {
  it('picks the ridge and the move under the pointer, and the ridge alone over the names', async () => {
    const { eras, list } = mounted()
    await list.trigger('pointermove', { clientX: moveX(layout, 30), clientY: layout.top })
    expect([useMove().value, picked(eras)[0]]).toEqual([30, all[0]!.name])
    await list.trigger('pointermove', { clientX: 10, clientY: layout.top + layout.pitch })
    expect([useMove().value, picked(eras)[0]]).toEqual([30, all[1]!.name])
  })

  it("reads the pointer from the chart's own corner wherever the page places it", async () => {
    const { eras, list } = mounted()
    vi.spyOn(list.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(200, 100, 600, layout.height))
    await list.trigger('pointermove', { clientX: 200 + moveX(layout, 30), clientY: 100 + layout.top })
    expect([useMove().value, picked(eras)[0]]).toEqual([30, all[0]!.name])
  })

  it('picks the ridge and the move a finger taps without moving', async () => {
    const { eras, list } = mounted()
    await list.trigger('pointerdown', { clientX: moveX(layout, 30), clientY: layout.top })
    expect([useMove().value, picked(eras)[0]]).toEqual([30, all[0]!.name])
  })
})

describe('Eras, unsized and from the keyboard', () => {
  it('draws nothing until the chart has a width, holding the room the chart takes', () => {
    unsized()
    const eras   = mount(Eras)
    const height = ridges.ridgesLayout(all.length, 0).height
    expect(eras.find('svg').exists()).toBe(false)
    expect(eras.find('.sc-data-chart').attributes('style')).toBe(`min-height: ${height}px;`)
  })

  it('keeps the page from scrolling on a key it answers and lets any other key through', () => {
    const { list } = mounted()
    expect([prevented(list.element, 'Home'), prevented(list.element, 'a')]).toEqual([true, false])
  })
})

describe('Eras, under reduced motion', () => {
  it('moves the line through every ridge straight to the move a key picks', async () => {
    reduceMotion()
    const { eras, list } = mounted()
    await list.trigger('keydown', { key: 'ArrowRight' })
    expect((eras.find('.sc-data-mover').element as HTMLElement).style.transform)
      .toBe(`translate3d(${tenth(moveX(layout, CHART.opening + 1))}px, 0, 0)`)
  })
})
