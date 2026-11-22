import { describe, expect, it } from 'vitest'

import { facesOf }                     from '../../../../docs/.vitepress/lib/cards/faces.ts'
import { Outliner }                    from '../../../../docs/.vitepress/lib/readme/outline.ts'
import { HEIGHT, LAYOUT }              from '../../../../docs/.vitepress/lib/readme/parts.ts'
import { SCHEMES, colorsOf, drawFrame } from '../../../../docs/.vitepress/lib/readme/preview.ts'
import { TRACK_ROLES }                 from '../../../../docs/.vitepress/lib/viewer/track.ts'
import { scene }                       from '../../common/shots.ts'

describe('colorsOf', () => {
  it("reads every color the Viewer's track reads, apart in each scheme", () => {
    const [light, dark] = SCHEMES.map(scheme => colorsOf(scheme))
    expect(Object.keys(light!)).toEqual(Object.keys(TRACK_ROLES))
    expect(light!.page).not.toBe(dark!.page)
  })
})

describe('drawFrame', () => {
  it('draws a frame at the README column’s width on the page, its text set as outlines', async () => {
    const colors = colorsOf('dark')
    const svg    = await drawFrame(colors, scene.frames[0]!, new Outliner(facesOf(import.meta.url)), scene)
    expect(svg).toMatch(new RegExp(`^<svg [^>]*width="${LAYOUT.width}" height="${HEIGHT}"`, 'u'))
    expect(svg).toContain(`fill="${colors.page}" height="${HEIGHT}"`)
    expect(svg).not.toContain('<text')
  }, 20_000)
})
