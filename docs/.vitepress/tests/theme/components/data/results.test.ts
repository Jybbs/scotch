// @vitest-environment happy-dom
import { type DOMWrapper, type VueWrapper, mount } from '@vue/test-utils'
import { describe, expect, it, vi }                from 'vitest'

import * as lengths         from '../../../../lib/data/lengths.ts'
import { useMove }          from '../../../../lib/data/move.ts'
import * as numbers         from '../../../../lib/data/numbers.ts'
import { Results }          from '../../../../theme/components/data/results.ts'
import { test }             from '../../../common/clock.ts'
import * as glide           from '../../../common/glide.ts'
import { prevented }        from '../../../common/keys.ts'
import { reduceMotion }     from '../../../common/motion.ts'
import { resized, unsized } from '../../../common/size.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

const layout  = lengths.sharesLayout(600)
const endings = lengths.endingsOf()
const middle  = lengths.moveX(layout, 30)
const bar     = numbers.tenth(Math.max(1, layout.plot / lengths.CHART.plotted - 1))

/**
 * Mounts the chart on the move the charts open on and finds its slider.
 */
function mounted(): { results: VueWrapper, slider: DOMWrapper<Element> } {
  useMove().value = lengths.CHART.opening
  const results = mount(Results)
  return { results, slider: results.find('[role="slider"]') }
}

/**
 * Reads where a marker of the mounted chart stands.
 */
function standing(results: VueWrapper, marker: string): string {
  return (results.get(marker).element as HTMLElement).style.transform
}

/**
 * Writes where the thumb stands on the move the charts open on, at the middle
 * of the band of the result at `kind`.
 */
function thumbAt(kind: number): string {
  const share = lengths.sharesOf(endings)[lengths.CHART.opening - 1]!
  const x     = lengths.moveX(layout, lengths.CHART.opening)
  return `translate3d(${x.toFixed(1)}px, ${lengths.bandMiddle(kind, layout, share).toFixed(1)}px, 0)`
}

describe('Results', () => {
  it('draws a named band per result over a bar per move, reading the move the charts share', () => {
    const { results, slider } = mounted()
    expect(results.findAll('g[data-k] > path').length).toBe(3)
    expect(results.findAll('svg g:not([data-k]) > text').map(label => label.text()))
      .toEqual(lengths.OUTCOMES.map(outcome => outcome.name))
    expect(results.findAll(`svg > rect[width="${bar}"]`).length).toBe(lengths.CHART.plotted)
    expect(slider.attributes('aria-valuenow')).toBe(String(lengths.CHART.opening))
    expect(results.findAll('dd').map(value => value.text())).toEqual(
      lengths.sharesReading(endings, lengths.CHART.opening).map(reading => reading.slice(1).join(' ')))
  })

  it('sets the pointer over each band, inside the crosshair the rest of the chart takes', () => {
    const { results, slider } = mounted()
    const bands               = results.findAll('g[data-k] > path')
    expect(slider.classes('cursor-crosshair')).toBe(true)
    expect(bands.map(band => band.classes('cursor-pointer'))).toEqual([true, true, true])
  })

  it('sets the share of the short games drawn beside the sentence comparing it with the long ones', () => {
    const { results } = mounted()
    expect(results.find('span').text()).toBe(numbers.percent(lengths.drawnShares(endings).short))
    expect(results.find('p').text()).toBe(lengths.sharesSummary(endings))
  })
})

describe('Results, its bars and gridlines', () => {
  it('draws each bar as tall as the games ending at its move against the move most games end at', () => {
    const totals = endings.slice(1, lengths.CHART.plotted + 1).map(counts => numbers.summed(counts))
    const peak   = Math.max(...totals)
    const bars   = mounted().results.findAll(`svg > rect[width="${bar}"]`)
      .map(drawn => Number(drawn.attributes('height')))
    expect(bars).toEqual(totals.map(games => Math.max(1, Math.round(games / peak * layout.bars.height))))
  })

  it('names a gridline at each quarter of the games', () => {
    const names = mounted().results.findAll('svg > text').map(label => label.text())
    expect(names).toEqual(expect.arrayContaining(['25%', '50%', '75%']))
  })
})

describe('Results, from the keyboard and the pointer', () => {
  it.each([
    { key: 'ArrowRight', move: lengths.CHART.opening + 1 },
    { key: 'PageDown', move: lengths.CHART.opening - 10 },
    { key: 'End', move: lengths.CHART.plotted }
  ])('moves to $move on $key', async ({ key, move }) => {
    const { slider } = mounted()
    await slider.trigger('keydown', { key })
    expect(slider.attributes('aria-valuenow')).toBe(String(move))
  })

  it('ignores any other key', async () => {
    const { slider } = mounted()
    await slider.trigger('keydown', { key: 'a' })
    expect(slider.attributes('aria-valuenow')).toBe(String(lengths.CHART.opening))
  })

  it('follows a mouse, and a finger only while it presses', async () => {
    const { slider } = mounted()
    await slider.trigger('pointermove', { clientX: middle, pointerType: 'touch' })
    expect(slider.attributes('aria-valuenow')).toBe(String(lengths.CHART.opening))
    await slider.trigger('pointerdown', { clientX: middle, pointerType: 'touch' })
    expect(slider.attributes('aria-valuenow')).toBe('30')
    await slider.trigger('pointerup')
    await slider.trigger('pointermove', { clientX: layout.left, pointerType: 'touch' })
    expect(slider.attributes('aria-valuenow')).toBe('30')
    await slider.trigger('pointermove', { clientX: layout.left, pointerType: 'mouse' })
    expect(slider.attributes('aria-valuenow')).toBe('1')
  })

  it("reads the pointer from the chart's own left edge wherever the page places it", async () => {
    const { slider } = mounted()
    vi.spyOn(slider.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(200, 0, 600, layout.height))
    await slider.trigger('pointermove', { clientX: 200 + middle, pointerType: 'mouse' })
    expect(slider.attributes('aria-valuenow')).toBe('30')
  })

  it('stops following a finger once the browser cancels its press', async () => {
    const { slider } = mounted()
    await slider.trigger('pointerdown', { clientX: middle, pointerType: 'touch' })
    await slider.trigger('pointercancel')
    await slider.trigger('pointermove', { clientX: layout.left, pointerType: 'touch' })
    expect(slider.attributes('aria-valuenow')).toBe('30')
  })

  it('keeps the page from scrolling on a key it answers and lets any other key through', () => {
    const { slider } = mounted()
    expect([prevented(slider.element, 'Home'), prevented(slider.element, 'a')]).toEqual([true, false])
  })
})

describe('Results, one result at a time', () => {
  it('lights one result through its corner mark, and every result again once the pointer leaves', async () => {
    const { results } = mounted()
    const drawn       = results.findAll('[role=listitem]')[1]!
    await drawn.trigger('pointerenter')
    expect([drawn.attributes('data-on'), results.findAll('[data-off]').length]).toEqual(['', 2])
    expect(results.find('svg g:not([data-k])').classes()).toContain('opacity-30')
    expect(results.find('[role=list] + p').text()).toBe('Drawn')
    await drawn.trigger('pointerleave')
    expect([drawn.attributes('data-on'), results.findAll('[data-off]').length]).toEqual([undefined, 0])
  })

  it('names each result in its corner in the tone its band takes, in the order the bands stack', () => {
    expect(mounted().results.findAll('[role=listitem]').map(mark => [mark.attributes('aria-label'), mark.attributes('style')]))
      .toEqual(lengths.OUTCOMES.map(({ key, name }) => [name, `--sc-data-tone: var(--sc-data-band-${key});`]))
  })
})

describe('Results, sized', () => {
  it('lays the chart out on whole pixels however wide its element measures', () => {
    resized(600.6)
    const { results } = mounted()
    expect(results.find('svg').attributes('width')).toBe('600')
  })

  it('draws nothing until the chart has a width, holding the room the chart takes', () => {
    unsized()
    const { results, slider } = mounted()
    expect(results.find('svg').exists()).toBe(false)
    expect(slider.attributes('style')).toBe(`min-height: ${lengths.sharesLayout(0).height}px;`)
  })
})

describe('Results, its markers', () => {
  it('stands the thumb at the middle of the drawn band, and of the band a corner mark lights', async () => {
    const { results } = mounted()
    expect(standing(results, '[role=slider] > i:not([data-mover])')).toBe(thumbAt(lengths.bandOf('d')))
    await results.findAll('[role=listitem]')[0]!.trigger('pointerenter')
    expect(standing(results, '[role=slider] > i:not([data-mover])')).toBe(thumbAt(lengths.bandOf('w')))
  })

  it('moves the line straight to the move a key picks under reduced motion', async () => {
    reduceMotion()
    const { results, slider } = mounted()
    await slider.trigger('keydown', { key: 'ArrowRight' })
    expect(glide.mover(results))
      .toBe(`translate3d(${glide.moverAt(layout, lengths.CHART.opening + 1)}, 0, 0)`)
  })

  it('steps as a slider across the moves the chart draws from the tab order', () => {
    expect(mounted().slider.attributes()).toMatchObject({
      'aria-valuemax' : String(lengths.CHART.plotted),
      'aria-valuemin' : '1',
      'tabindex'      : '0'
    })
  })

  it('names the move and the games ending there', () => {
    const { slider } = mounted()
    const games      = numbers.counted(numbers.summed(endings[lengths.CHART.opening]!))
    expect(slider.attributes('aria-valuetext')).toBe(`move ${lengths.CHART.opening}, ${games} games end here`)
  })
})

describe('Results, its glide', () => {
  test.for([
    ['pointermove', { clientX: lengths.moveX(layout, 30) }, true],
    ['keydown', { key: 'End' }, false]
  ] as const)(
    'keeps the pointer glide for a later pointer and takes the longer one again for a key, here a %s',
    async ([type, init, reached], { clock }) => {
      const { results, slider } = mounted()
      await slider.trigger('pointermove', { clientX: lengths.moveX(layout, 20) })
      await glide.glided(clock)
      await slider.trigger(type, init)
      await glide.glided(clock)
      const at = glide.moverAt(layout, Number(slider.attributes('aria-valuenow')))
      expect(glide.mover(results).startsWith(`translate3d(${at}`)).toBe(reached)
    }
  )
})
