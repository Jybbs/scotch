import { type VNode, h } from 'vue'

import mark                       from '../../../../assets/mark.svg?raw'
import { contrast }               from '../../../lib/identity/colors.ts'
import { ROLES }                  from '../../../lib/identity/roles.ts'
import * as palette               from '../../../lib/reference/palette.ts'
import { ORDER, heldLine }        from '../../../lib/reference/roles.ts'
import { DRAWINGS, svgOf }        from '../../../lib/site/pieces.ts'
import { SMALL }                  from './parts.ts'

/**
 * Colors python-chess's pawn in a role's color in one scheme, with no outline.
 */
function glyph(role: palette.RoleName, scheme: palette.Scheme): VNode {
  const body = DRAWINGS.P.replaceAll('fill="#fff"', `fill="${palette.colorOf(role, scheme)}"`)
    .replaceAll('stroke="#000"', 'stroke="none"')
  return h('span', {
    'class'     : 'block size-[30px] [&_svg]:block [&_svg]:size-full',
    'data-role' : role,
    'innerHTML' : svgOf(body)
  })
}

function rail(role: palette.RoleName, marked: (index: number) => boolean): VNode {
  return h('div', {
    'class'     : 'grid h-[9px] grid-cols-13 gap-0.5',
    'data-role' : role,
    'style'     : { '--sc-ref-color': `var(--sc-ref-${role})` }
  }, Array.from({ length: 13 }, (_, index) => marked(index)
    ? h('i', { class: 'rounded-[1px] bg-(--sc-ref-color)' })
    : h('span')))
}

/**
 * An entry of the sample page's sidebar.
 */
const ENTRY = 'text-[0.75rem] font-normal'

/**
 * A column of the sample page's text or figures.
 */
const COLUMN = 'grid min-w-0 content-start gap-[7px]'

function outside(index: number): boolean {
  return index < 3 || index > 8
}

/**
 * The sample page's sidebar, its mark over its entries, laid in a row on a
 * narrow drawing.
 */
function side(): VNode {
  return h('aside', {
    'class'     : [
      'grid content-start gap-1 border-r border-r-(--sc-ref-rule) bg-(--sc-ref-side) px-2.5 py-3',
      'in-data-narrow:grid-flow-col in-data-narrow:items-center in-data-narrow:justify-start',
      'in-data-narrow:gap-3',
      'in-data-narrow:border-r-0 in-data-narrow:border-b in-data-narrow:border-b-(--sc-ref-rule)',
      'in-data-narrow:px-3 in-data-narrow:py-1.5'
    ],
    'data-role' : 'side'
  }, [
    h('i', {
      'class'     : [
        'mb-[5px] block h-[25px] w-[18px] text-(--sc-ref-run) [&_svg]:block [&_svg]:size-full',
        'in-data-narrow:m-0 in-data-narrow:h-[18px] in-data-narrow:w-[13px]'
      ],
      'data-role' : 'run-mark',
      'innerHTML' : mark
    }),
    h('span', { 'class': ENTRY, 'data-role': 'quiet', 'style': { color: 'var(--sc-ref-quiet)' } }, 'Terms'),
    h('span', { class: ENTRY, style: { color: 'var(--sc-ref-quiet)' } }, 'Tasks'),
    h('b', { class: ENTRY, style: { color: 'var(--sc-ref-run)' } }, 'Identity')
  ])
}

/**
 * The sample page's text, a heading over a run, a caption, a note, and an alert.
 */
function text(): VNode {
  return h('div', { class: COLUMN }, [
    h('h5', {
      'class'     : 'm-0 font-display text-[1.05rem]/[1.2] font-normal! text-(--sc-ref-ink) normal-nums',
      'data-role' : 'ink'
    }, 'The Longest Run'),
    h('p', ['Two games share a ', h('span', { 'data-role': 'run', 'style': { color: 'var(--sc-ref-run)' } }, 'run'), ' where they reach the same positions.']),
    h('p', {
      class: 'font-code text-[0.6rem]/[1.4]! font-medium text-(--sc-ref-quiet) normal-nums'
    }, 'A caption sets quiet text beneath a figure.'),
    h('p', {
      'class'     : 'bg-(--sc-ref-tint) px-[7px] py-[3px] text-(--sc-ref-ink)',
      'data-role' : 'tint'
    }, 'A tinted note on a ground of its own.'),
    h('p', { 'class': 'text-(--sc-ref-alert)', 'data-role': 'alert' }, 'No game in the file read cleanly.')
  ])
}

/**
 * The sample page's figures, the rails on a raised card, a data bar, the two
 * pawns, and a rule.
 */
function figures(scheme: palette.Scheme): VNode {
  return h('div', { class: COLUMN }, [
    h('div', {
      'class'     : 'grid gap-[3px] rounded-[3px] border border-(--sc-ref-rule) bg-(--sc-ref-raised) p-[7px]',
      'data-role' : 'raised'
    }, [
      rail('submitted', outside),
      rail('run', index => !outside(index)),
      rail('stored', outside)
    ]),
    h('div', {
      'class'     : 'relative h-[11px] border border-(--sc-ref-data-edge)',
      'data-role' : 'data_edge'
    }, h('i', {
      'class'     : 'absolute inset-y-0 right-0 left-[55%] bg-(--sc-ref-data-black)',
      'data-role' : 'data_black'
    })),
    h('div', { class: 'flex items-center gap-0.5' }, [
      glyph('glyph_light', scheme),
      glyph('glyph_dark', scheme)
    ]),
    h('i', { 'class': 'block h-px bg-(--sc-ref-rule)', 'data-role': 'rule' })
  ])
}

/**
 * Writes the sample page in one scheme, each part marked with the role a ring
 * finds it by.
 */
export function sheet(scheme: palette.Scheme): VNode {
  const colors = Object.fromEntries(ORDER.map(role => [`--sc-ref-${role.replace('_', '-')}`, palette.colorOf(role, scheme)]))
  return h('div', {
    'class'     : [
      'grid grid-cols-[5.6rem_minmax(0,1fr)] bg-(--sc-ref-page) font-body text-[0.8125rem]/[1.45] font-normal',
      'text-(--sc-ref-ink) normal-nums in-data-narrow:grid-cols-1'
    ],
    'data-role' : 'page',
    'style'     : colors
  }, [
    side(),
    h('div', {
      class: [
        'grid min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-x-3.5 gap-y-2.5 px-3.5 pt-3 pb-3.5',
        'in-data-narrow:grid-cols-1 in-data-narrow:px-3 in-data-narrow:pt-2.5 in-data-narrow:pb-3'
      ]
    }, [text(), figures(scheme)])
  ])
}

function half(role: palette.RoleName, scheme: palette.Scheme): VNode {
  const { kind } = ROLES[role]
  const color    = palette.colorOf(role, scheme)
  const ground   = kind === 'ground' || kind === 'fill'
  return h('div', {
    class : [
      'grid min-w-0 grid-cols-[2.4rem_minmax(0,1fr)] items-center gap-x-[9px] gap-y-0.5 px-2.5 py-[9px]',
      'in-data-narrow:grid-cols-1 in-data-narrow:px-1.5 in-data-narrow:py-2'
    ],
    style : {
      '--sc-ref-edge' : palette.colorOf('rule', scheme),
      'background'    : palette.colorOf('page', scheme),
      'color'         : palette.colorOf('ink', scheme)
    }
  }, [
    h('i', {
      'aria-hidden' : 'true',
      'class'       : [
        'grid size-[2.4rem] place-items-center border border-(--sc-ref-edge) font-display text-[1.15rem]/none',
        'font-normal not-italic normal-nums transition-[background-color,color]'
      ],
      'style'       : {
        background : ground ? color : 'transparent',
        color      : ground ? (kind === 'fill' ? 'transparent' : palette.colorOf('ink', scheme)) : color
      }
    }, 'Aa'),
    h('div', { class: 'grid min-w-0 gap-px font-code text-[0.66rem]/[1.35] font-medium wrap-anywhere normal-nums' }, [
      h('b', { class: 'text-[0.76rem] font-medium' }, color),
      h('span', palette.paintWord(ROLES[role][scheme])),
      h('span', heldLine(role, contrast(color, palette.colorOf('page', scheme))))
    ])
  ])
}

export function roleCard(role: palette.RoleName): VNode {
  return h('div', { class: 'grid content-start gap-[7px]' }, [
    h('div', { class: 'flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5' }, [
      h('b', { class: 'font-code text-[0.9rem]/[1.3] font-medium text-ink normal-nums' }, role),
      h('small', { class: SMALL }, `a ${ROLES[role].kind}`)
    ]),
    h('div', { class: 'grid grid-cols-2' }, palette.SCHEMES.map(scheme => half(role, scheme)))
  ])
}
