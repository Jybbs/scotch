import satori from 'satori'

import type { Tree }              from '../cards/draw.ts'
import { ROLES, resolve }         from '../identity/roles.ts'
import { hexOf }                  from '../identity/tokens.ts'
import { NUMERALS }               from '../markdown/front.ts'
import { SECTIONS, type Section } from '../site/sections.ts'
import type { Scheme }            from './preview.ts'

/**
 * One card of Where to Start: the section it opens and the numeral it is set
 * under.
 */
export interface Start {
  numeral : string
  section : Section
}

/**
 * The size every card is drawn at, a third of the README column with room
 * between the three.
 */
export const CARD = { height: 140, width: 260 } as const
/**
 * The cards in the order Where to Start sets them, numbered as the front page
 * numbers the commands of its session.
 */
export const STARTS: readonly Start[] = (['Guide', 'Viewer', 'Methods'] as const).map((label, at) => ({
  numeral : NUMERALS[at]!,
  section : SECTIONS.find(section => section.label === label)!
}))

function node(type: string, style: Record<string, number | string>, ...children: (Tree | string)[]): Tree {
  return { props: { children, style: { display: 'flex', ...style } }, type }
}

/**
 * Lays out one card in one scheme: the numeral in the display face and its
 * section's color, beside the words opening the section over its name and a
 * bar in that color, on the scheme's page inside a rounded rule.
 */
function cardOf(scheme: Scheme, start: Start): Tree {
  const color = hexOf(start.section.color)
  const role  = (name: 'ink' | 'page' | 'quiet' | 'rule'): string => resolve(ROLES[name][scheme])
  return node('div', {
    alignItems   : 'center',
    background   : role('page'),
    border       : `1px solid ${role('rule')}`,
    borderRadius : 10,
    boxSizing    : 'border-box',
    gap          : 16,
    height       : CARD.height,
    padding      : '0 20px',
    width        : CARD.width
  },
  node('span', { color, fontFamily: 'display', fontSize: 72, lineHeight: 1 }, start.numeral),
  node('div', { flexDirection: 'column', gap: 4 },
    node('span', { color: role('quiet'), fontFamily: 'code', fontSize: 10, letterSpacing: 1.6 }, 'OPEN THE'),
    node('span', { color: role('ink'), fontFamily: 'display', fontSize: 30, lineHeight: 1.1 },
      start.section.label),
    node('span', { background: color, height: 3, marginTop: 6, width: 40 })))
}

/**
 * Draws one card as an SVG with its text set as outlines, since GitHub shows
 * the card as an image, which loads no web face, labeled for a screen reader
 * by its section's name.
 */
export async function drawCard(
  fonts  : Parameters<typeof satori>[1]['fonts'],
  scheme : Scheme,
  start  : Start
): Promise<string> {
  const svg = await satori(cardOf(scheme, start), { ...CARD, fonts })
  return svg.replace('<svg ', `<svg role="img" aria-label="${start.section.label}" `)
}
