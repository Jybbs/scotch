import { useData }                        from 'vitepress'
import { type VNode, defineComponent, h } from 'vue'

import type { Stat }              from '../../../lib/viewer/stats.ts'
import * as drives                from '../../../lib/viewer/drive.ts'
import type { Offer }             from '../../../lib/viewer/guesses.ts'
import { type Viewer, useViewer } from '../../../lib/viewer/state.ts'
import { useSubmission }          from '../../../lib/viewer/submission.ts'
import { Band }                   from './band.ts'
import { gameLegend }             from './legend.ts'
import { Stage }                  from './stage.ts'

/**
 * The Viewer's root: the column it fills, the pitch of a sheet's row, the
 * height of a caption, the shade its raised surfaces cast, and the color each
 * game's marks read from the game they stand for.
 */
const ROOT = [
  'mx-auto mt-6 grid w-[calc(100%_-_48px)] max-w-[94rem] min-w-0 grid-cols-[minmax(0,1fr)] gap-5 text-ink',
  'outline-none [--sc-viewer-caption:26px] [--sc-viewer-pitch:33px]',
  '[--sc-viewer-shade:light-dark(color-mix(in_srgb,var(--sc-dark)_35%,transparent),color-mix(in_srgb,var(--sc-dark)_70%,transparent))]',
  '[&_[data-game=stored]]:[--sc-viewer-game:var(--sc-stored)]',
  '[&_[data-game=submitted]]:[--sc-viewer-game:var(--sc-submitted)]',
  'max-sm:mt-4 max-sm:w-[calc(100%_-_32px)] max-sm:gap-3.5'
]
/**
 * The name of the source the match came from, faint in the stage's corner.
 */
const SOURCE = 'pointer-events-none absolute right-0 bottom-1.5 w-[24ch] overflow-hidden text-right '
             + 'font-code text-[0.54rem]/[12px] font-medium tracking-[0.12em] text-ellipsis '
             + 'whitespace-nowrap text-quiet uppercase opacity-70'
/**
 * The stage, its parts one over the other, with the two boards side by side
 * in whole pixels on a narrow screen.
 */
const STAGE = [
  'relative grid gap-[22px] pb-[30px] max-lg:justify-between max-lg:gap-x-5',
  'max-lg:grid-cols-[repeat(2,round(down,calc((100%_-_20px)_/_2),1px))]',
  'max-sm:gap-x-3.5 max-sm:grid-cols-[repeat(2,round(down,calc((100%_-_14px)_/_2),1px))] max-sm:pb-6'
]
/**
 * The strip of figures closing the Viewer, one row of them over a rule, two
 * to a row on a narrow screen.
 */
const STATS = 'mx-auto mt-9 mb-10 flex w-fit justify-center border-t border-rule px-2 pt-3.5 max-sm:mt-7 '
            + 'max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:gap-y-3.5'

/**
 * Draws the strip of figures, each figure over its label.
 */
function drawStats(stats: readonly Stat[]): VNode {
  return h('dl', { class: STATS }, stats.map(({ label, value }) =>
    h('div', { class: 'grid min-w-[7.5rem] justify-items-center gap-0.5 px-3 max-sm:min-w-0' }, [
      h('dt', {
        class: 'font-code text-[0.62rem]/[16px] font-medium tracking-[0.14em] text-quiet uppercase'
      }, label),
      h('dd', {
        class: '-order-1 m-0 font-code text-[0.94rem]/[20px] font-medium text-ink tabular-nums'
      }, value)
    ])))
}

/**
 * Draws the stage at the Viewer's cursor, each part binding the ref the drive
 * reaches it through, with the legend of the two games over its track.
 */
function drawStage(drive: drives.Drive, viewer: Viewer): VNode {
  return h(Stage, {
    covered : viewer.covered.value,
    cursor  : viewer.cursor.value,
    facing  : viewer.facing.value,
    guesses : viewer.guesses.value,
    loaded  : viewer.loaded.value,
    onCover : viewer.cover,
    onGo    : viewer.go,
    onShow  : viewer.show,
    onTurn  : viewer.turn,
    parts   : drive.parts,
    status  : viewer.status.value,
    taking  : viewer.guess.value !== undefined,
    verdict : viewer.verdict.value,
    onOffer : (offer: Offer) => {
      drive.parts.guess.value?.settle(viewer.offer(offer))
    }
  }, gameLegend)
}

/**
 * The Viewer as a tool, filling the content width under the site's bar: the
 * band naming the match beside the intake, the stage holding the boards, the
 * sheets, the controls, and the track on one raised surface, and the strip of
 * figures closing the tool. It opens on the example match, or on the match a
 * link carries in the page's fragment, matches a game submitted in PGN against
 * the published store, stepping between the stored games tied on the run as
 * the band's tally is pressed, and answers the controls' keys while focus sits
 * inside it.
 */
export const Tool = defineComponent({
  name: 'ScotchViewer',

  setup: () => {
    const viewer     = useViewer()
    const drive      = drives.useDrive(viewer)
    const page       = useData()
    const stats      = (): readonly Stat[] => page.frontmatter.value.stats ?? []
    const opened     = drives.marksOf(viewer)
    const submitting = useSubmission(drive.problem, viewer)

    return () => h('div', {
      'class'        : ROOT,
      'data-matched' : opened.matched,
      'data-shared'  : opened.shared,
      'onKeydown'    : drive.answer,
      'ref'          : drive.parts.root,
      'style'        : { '--sc-viewer-step': '0ms' },
      'tabindex'     : '-1'
    }, [
      h('section', { 'aria-label': 'The two games', 'class': STAGE }, [
        h(Band, {
          at       : submitting.at.value,
          covering : viewer.covered.value && viewer.cursor.value <= (viewer.loaded.value.shared?.last ?? 0),
          link     : drive.link,
          loaded   : viewer.loaded.value,
          onLoad   : submitting.load,
          onShow   : submitting.show,
          problem  : drive.problem.value,
          sample   : viewer.sample.value,
          ties     : submitting.ties(),

          onPgn: (text: string, source: string) => {
            void submitting.submit(text, source)
          },

          onProblem: (text: string) => {
            drive.problem.value = text
          }
        }),
        drawStage(drive, viewer),
        h('span', { class: SOURCE }, viewer.source.value)
      ]),
      h('p', {
        'aria-live' : 'polite',
        'class'     : 'sr-only',
        'role'      : 'status'
      }, [viewer.verdict.value?.say, viewer.status.value.say].filter(Boolean).join(' ')),
      drawStats(stats())
    ])
  }
})
