import { describe, expect, it } from 'vitest'

import { PLACED }               from '../../../lib/markdown/placements.ts'
import { builtPages, pageText } from '../../common/pages.ts'

const placed  = Object.entries(PLACED).flatMap(([page, list]) => list.map(each => ({ page, ...each })))
const regions = placed.filter(placement => placement.region !== undefined)
const after   = placed.filter(placement => placement.region === undefined)

describe('PLACED', () => {
  it.each(Object.keys(PLACED))('places widgets on %s, a page the site builds', page => {
    expect(builtPages()).toContain(page)
  })

  it.each(after)('finds the section $after that $draw closes on $page', placement => {
    expect(pageText(placement.page)).toMatch(new RegExp(`^#+ ${placement.after}$`, 'mu'))
  })

  it.each(regions)('finds one pair of markers around the $region region on $page', ({ page, region }) => {
    const markers = [`<!-- ${region} -->`, `<!-- /${region} -->`]
    expect(markers.map(marker => pageText(page).split(marker).length)).toEqual([2, 2])
  })
})
