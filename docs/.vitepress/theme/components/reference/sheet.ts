import { type VNode, h } from 'vue'

import mark                       from '../../../../assets/mark.svg?raw'
import { contrast }               from '../../../lib/identity/colors.ts'
import { ROLES }                  from '../../../lib/identity/roles.ts'
import * as palette               from '../../../lib/reference/palette.ts'
import { ORDER, heldLine }        from '../../../lib/reference/roles.ts'
import { DRAWINGS, svgOf }        from '../../../lib/site/pieces.ts'

/**
 * Colors python-chess's pawn in a role's color in one scheme, with no outline.
 */
function glyph(role: palette.RoleName, scheme: palette.Scheme): VNode {
  const body = DRAWINGS.P.replaceAll('fill="#fff"', `fill="${palette.colorOf(role, scheme)}"`)
    .replaceAll('stroke="#000"', 'stroke="none"')
  return h('span', { 'data-role': role, 'innerHTML': svgOf(body) })
}

function rail(role: palette.RoleName, marked: (index: number) => boolean): VNode {
  return h('div', { 'class': 'sc-ref-rail', 'data-role': role, 'style': { '--sc-ref-color': `var(--sc-ref-${role})` } },
    Array.from({ length: 13 }, (_, index) => marked(index) ? h('i') : h('span')))
}

function outside(index: number): boolean {
  return index < 3 || index > 8
}

/**
 * Writes the sample page in one scheme, each part marked with the role a ring
 * finds it by.
 */
export function sheet(scheme: palette.Scheme): VNode {
  const colors = Object.fromEntries(ORDER.map(role => [`--sc-ref-${role.replace('_', '-')}`, palette.colorOf(role, scheme)]))
  return h('div', { 'class': 'sc-ref-sheet', 'data-role': 'page', 'style': colors }, [
    h('aside', { 'class': 'sc-ref-side', 'data-role': 'side' }, [
      h('i', { 'class': 'sc-ref-logo', 'data-role': 'run-mark', 'innerHTML': mark }),
      h('span', { 'data-role': 'quiet', 'style': { color: 'var(--sc-ref-quiet)' } }, 'Terms'),
      h('span', { style: { color: 'var(--sc-ref-quiet)' } }, 'Tasks'),
      h('b', { style: { color: 'var(--sc-ref-run)' } }, 'Identity')
    ]),
    h('div', { class: 'sc-ref-main' }, [
      h('div', { class: 'sc-ref-text' }, [
        h('h5', { 'data-role': 'ink' }, 'The Longest Run'),
        h('p', ['Two games share a ', h('span', { 'data-role': 'run', 'style': { color: 'var(--sc-ref-run)' } }, 'run'), ' where they reach the same positions.']),
        h('p', { class: 'sc-ref-caption' }, 'A caption sets quiet text beneath a figure.'),
        h('p', { 'class': 'sc-ref-note', 'data-role': 'tint' }, 'A tinted note on a ground of its own.'),
        h('p', { 'class': 'sc-ref-alert', 'data-role': 'alert' }, 'No game in the file read cleanly.')
      ]),
      h('div', { class: 'sc-ref-figures' }, [
        h('div', { 'class': 'sc-ref-sample', 'data-role': 'raised' }, [
          rail('submitted', outside),
          rail('run', index => !outside(index)),
          rail('stored', outside)
        ]),
        h('div', { 'class': 'sc-ref-bar', 'data-role': 'data_edge' }, h('i', { 'data-role': 'data_black' })),
        h('div', { class: 'sc-ref-set' }, [
          glyph('glyph_light', scheme),
          glyph('glyph_dark', scheme)
        ]),
        h('i', { 'class': 'sc-ref-line', 'data-role': 'rule' })
      ])
    ])
  ])
}

function half(role: palette.RoleName, scheme: palette.Scheme): VNode {
  const { kind } = ROLES[role]
  const color    = palette.colorOf(role, scheme)
  const ground   = kind === 'ground' || kind === 'fill'
  return h('div', {
    class : 'sc-ref-half',
    style : {
      '--sc-ref-edge' : palette.colorOf('rule', scheme),
      'background'    : palette.colorOf('page', scheme),
      'color'         : palette.colorOf('ink', scheme)
    }
  }, [
    h('i', {
      'aria-hidden' : 'true',
      'style'       : {
        background : ground ? color : 'transparent',
        color      : ground ? (kind === 'fill' ? 'transparent' : palette.colorOf('ink', scheme)) : color
      }
    }, 'Aa'),
    h('div', [
      h('b', color),
      h('span', palette.paintWord(ROLES[role][scheme])),
      h('span', heldLine(role, contrast(color, palette.colorOf('page', scheme))))
    ])
  ])
}

export function roleCard(role: palette.RoleName): VNode {
  return h('div', { class: 'sc-ref-roled' }, [
    h('div', { class: 'sc-ref-top-line' }, [h('b', role), h('small', `a ${ROLES[role].kind}`)]),
    h('div', { class: 'sc-ref-pair' }, palette.SCHEMES.map(scheme => half(role, scheme)))
  ])
}
