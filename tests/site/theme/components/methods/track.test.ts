// @vitest-environment happy-dom
import { mount }                    from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { exampleOf }    from '../../../../../docs/.vitepress/lib/methods/example.ts'
import { Pair, TRACK }  from '../../../../../docs/.vitepress/lib/methods/runs.ts'
import { Track }        from '../../../../../docs/.vitepress/theme/components/methods/track.ts'
import { reduceMotion } from '../../../common/motion.ts'

const pair = new Pair([18, 18], exampleOf().runs)

function track(props: Record<string, unknown> = {}): ReturnType<typeof mount<typeof Track>> {
  return mount(Track, { props: { label: 'The two games', pair, ...props } })
}

describe('Track as drawn', () => {
  it('draws each game as a faint line and a strong one', () => {
    expect(track().findAll('path.stroke-submitted')).toHaveLength(2)
    expect(track().findAll('path.stroke-stored')).toHaveLength(2)
  })

  it('joins the two lines through the run longer than one position', () => {
    const joined = track().findAll('path.stroke-run')
    expect(joined.map(path => path.attributes('d'))).toEqual([`M ${7 * TRACK.step} 11 H ${17 * TRACK.step}`])
  })

  it('sets a station on every position the two share, hollow past the ply in view', () => {
    const stations = track({ at: 9 }).findAll('circle[cx]').filter(one => one.attributes('cx') !== '0')
    expect(stations).toHaveLength(11)
    expect(stations.filter(one => one.classes().includes('fill-page'))).toHaveLength(8)
  })

  it('rides a marker on each line at the ply in view', () => {
    const riders = track({ at: 6 }).findAll('circle').filter(one => one.classes().includes('fill-ink'))
    expect(riders.map(one => (one.element as SVGElement).style.transform))
      .toEqual([`translate(${6 * TRACK.step}px, 0px)`, `translate(${6 * TRACK.step}px, ${TRACK.apart}px)`])
  })

  it('draws no marker with no ply in view', () => {
    expect(track().findAll('circle.fill-ink')).toHaveLength(0)
  })

})

describe('Track as pressed', () => {
  it('moves the marker to a ply once it is pressed', async () => {
    const pick = vi.fn<(ply: number) => void>()
    await track({ onPick: pick }).findAll('rect')[4]!.trigger('click')
    expect(pick).toHaveBeenCalledWith(4)
  })

  it('draws no band to press where nothing picks a ply', () => {
    expect(track().findAll('rect')).toHaveLength(0)
  })

  it('sets its lines heavy where it is drawn bold', () => {
    expect(track({ bold: true }).find('path.stroke-run').classes()).toContain('stroke-[4.5]')
  })

  it('clips each line short of the plies past the one in view', () => {
    const strong = track({ at: 9 }).findAll('path.stroke-submitted')[1]!.element as SVGElement
    expect(strong.style.clipPath).toBe('inset(-4px 144px -4px -4px)')
  })

  it('holds its marker still where the reader prefers reduced motion', () => {
    reduceMotion()
    expect(track({ at: 3 }).find('circle.fill-ink').classes()).not.toContain('duration-glide')
  })

  it('boxes the plies it names, both counted, across both lines', () => {
    const box = track({ box: [2, 5] }).find('rect[class*=stroke-dasharray]')
    expect([box.attributes('x'), box.attributes('width')]).toEqual([`${1.5 * TRACK.step}`, `${4 * TRACK.step}`])
    expect(box.attributes('height')).toBe(`${TRACK.apart + 2 * TRACK.margin - 2}`)
  })

  it('draws no box where it names no plies', () => {
    expect(track().findAll('rect[class*=stroke-dasharray]')).toHaveLength(0)
  })
})
