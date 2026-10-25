import { useData }                        from 'vitepress'
import { type VNode, defineComponent, h } from 'vue'

import type { Stat }              from '../../../lib/viewer/colophon.ts'
import * as drives                from '../../../lib/viewer/drive.ts'
import { type Viewer, useViewer } from '../../../lib/viewer/state.ts'
import { Band }                   from './band.ts'
import { Stage }                  from './stage.ts'

/**
 * Draws the stage at the Viewer's cursor, each part binding the ref the drive
 * reaches it through.
 */
function drawStage(drive: drives.Drive, viewer: Viewer): VNode {
  return h(Stage, {
    cursor : viewer.cursor.value,
    facing : viewer.facing.value,
    loaded : viewer.loaded.value,
    onGo   : viewer.go,
    onShow : viewer.show,
    onTurn : viewer.turn,
    parts  : drive.parts,
    status : viewer.status.value
  })
}

/**
 * The Viewer as a tool, filling the content width under the site's bar: the
 * band naming the match beside the intake, the stage holding the boards, the
 * sheets, the controls, and the track on one raised surface, and the strip of
 * figures closing the tool. It opens on the example match, or on the match a
 * link carries in the page's fragment, and answers the controls' keys while
 * focus sits inside it.
 */
export const Tool = defineComponent({
  name: 'ScotchViewer',

  setup: () => {
    const viewer = useViewer()
    const drive  = drives.useDrive(viewer)
    const page   = useData()
    const stats  = (): readonly Stat[] => page.frontmatter.value.stats ?? []
    const opened = drives.marksOf(viewer)
    const load   = (...args: Parameters<typeof viewer.load>): void => {
      drive.problem.value = ''
      viewer.load(...args)
    }

    return () => h('div', {
      'class'        : 'sc-viewer',
      'data-matched' : opened.matched,
      'data-shared'  : opened.shared,
      'onKeydown'    : drive.answer,
      'ref'          : drive.parts.root,
      'style'        : { '--sc-viewer-step': '0ms' },
      'tabindex'     : '-1'
    }, [
      h('section', { 'aria-label': 'The two games', 'class': 'sc-viewer-stage' }, [
        h(Band, {
          link      : drive.link,
          loaded    : viewer.loaded.value,
          onLoad    : load,
          problem   : drive.problem.value,
          sample    : viewer.sample.value,
          onProblem : (text: string) => {
            drive.problem.value = text
          }
        }),
        drawStage(drive, viewer),
        h('span', { class: 'sc-viewer-source' }, viewer.source.value)
      ]),
      h('p', {
        'aria-live' : 'polite',
        'class'     : 'sc-viewer-hidden',
        'role'      : 'status'
      }, viewer.status.value.say),
      h('dl', { class: 'sc-viewer-colophon' }, stats().map(({ label, value }) =>
        h('div', { class: 'sc-viewer-stat' }, [h('dt', label), h('dd', value)])))
    ])
  }
})
