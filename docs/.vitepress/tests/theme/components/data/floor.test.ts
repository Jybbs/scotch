// @vitest-environment happy-dom
import { flushPromises, mount }     from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import * as numbers         from '../../../../lib/data/numbers.ts'
import * as omitted         from '../../../../lib/data/omitted.ts'
import { RatingFloor }      from '../../../../theme/components/data/floor.ts'
import { pressed }          from '../../../common/keys.ts'
import { resized, unsized } from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const counts = omitted.OMISSIONS.floor
const layout = omitted.floorLayout(600)

/**
 * Counts the decades a chart `pixels` wide names beneath its strip.
 */
function labeledDecades(pixels: number): number {
  resized(pixels)
  const axis = mount(RatingFloor).findAll('.sc-data-axis')
  return axis.filter(label => counts.decades.includes(label.text())).length
}

/**
 * Builds a pointer event at `y` pixels down the grid, as the slider receives it.
 */
function pointer(type: string, y: number): PointerEvent {
  return new PointerEvent(type, { bubbles: true, clientX: 100, clientY: y, pointerId: 1 })
}

describe('RatingFloor', () => {
  it('draws nothing until the chart has a width', () => {
    unsized()
    expect(mount(RatingFloor).find('svg').exists()).toBe(false)
  })

  it('opens on the floor the store keeps, naming what it keeps and leaves out', () => {
    const drawn = mount(RatingFloor)
    const kept  = omitted.keptAt(counts.floor)
    expect(drawn.find('[role="slider"]').attributes('aria-valuenow')).toBe(String(counts.floor))
    expect(drawn.find('.sc-data-big').text()).toBe(numbers.percent(kept.kept / kept.total))
    expect(drawn.find('.sc-data-say').text()).toBe(omitted.floorSentence(counts.floor, kept))
    expect(drawn.find('.sc-data-floor-rule text').text()).toBe(numbers.counted(counts.floor))
  })

  it('dims every cell but the standing a corner mark lights', async () => {
    const drawn = mount(RatingFloor)
    await drawn.find('.sc-data-mark').trigger('pointerenter')
    const cells = drawn.findAll('.sc-data-floor-cell')
    const lit   = cells.filter(cell => !cell.classes('sc-data-off'))
    expect(lit.every(cell => cell.attributes('data-k') === 'up')).toBe(true)
    expect(cells.some(cell => cell.classes('sc-data-off'))).toBe(true)
  })

  it('labels every fourth decade on a narrow chart and every other one on a wide chart', () => {
    expect(labeledDecades(400)).toBeLessThan(labeledDecades(layout.width))
  })
})

describe('RatingFloor as a slider', () => {
  it('steps the floor through the floors it drags between on an arrow key, held at either end', async () => {
    const drawn  = mount(RatingFloor)
    const slider = drawn.find('[role="slider"]')
    const at     = omitted.floors.indexOf(counts.floor)
    expect(await pressed(slider.element, 'ArrowUp')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe(String(omitted.floors[at + 1]))
    expect(await pressed(slider.element, 'Home')).toBe(true)
    expect(slider.attributes('aria-valuenow')).toBe(String(omitted.floors[0]))
    expect(await pressed(slider.element, 'Tab')).toBe(false)
  })

  it('sets the floor where a held pointer moves and stops once the pointer lifts', async () => {
    const drawn   = mount(RatingFloor)
    const slider  = drawn.find('[role="slider"]')
    const capture = vi.fn<(pointerId: number) => void>()
    Object.assign(slider.element, { setPointerCapture: capture })
    slider.element.dispatchEvent(pointer('pointerdown', 0))
    await flushPromises()
    expect(capture).toHaveBeenCalledWith(1)
    expect(slider.attributes('aria-valuenow')).toBe(String(omitted.floors.at(-1)))
    slider.element.dispatchEvent(pointer('pointermove', 400))
    await flushPromises()
    expect(slider.attributes('aria-valuenow')).toBe(String(omitted.floors[0]))
    slider.element.dispatchEvent(pointer('pointerup', 400))
    slider.element.dispatchEvent(pointer('pointermove', 0))
    await flushPromises()
    expect(slider.attributes('aria-valuenow')).toBe(String(omitted.floors[0]))
  })

  it('stops following the pointer once the browser cancels it', async () => {
    const slider = mount(RatingFloor).find('[role="slider"]')
    Object.assign(slider.element, { setPointerCapture: vi.fn<(pointerId: number) => void>() })
    slider.element.dispatchEvent(pointer('pointerdown', 0))
    slider.element.dispatchEvent(pointer('pointercancel', 0))
    slider.element.dispatchEvent(pointer('pointermove', 400))
    await flushPromises()
    expect(slider.attributes('aria-valuenow')).toBe(String(omitted.floors.at(-1)))
  })
})
