import { byteHex, mix }    from '../identity/colors.ts'
import { ROLES, resolve }  from '../identity/roles.ts'
import { IDENTITY, hexOf } from '../identity/tokens.ts'
import type { Section }    from '../site/sections.ts'
import * as rails          from './rails.ts'

type Child = Tree | string

/**
 * What every card states about the site: the host and the version the manifest
 * declares, the wordmark's SVG drawn in `currentColor`, and the run the rails
 * draw, its start and length read from an example the index matched.
 */
export interface Edition {
  host     : string
  run      : Pick<rails.Rails, 'length' | 'start'>
  version  : string
  wordmark : string
}

type Style = Record<string, number | string>

/**
 * One element of the tree satori lays out, in the shape a JSX element takes.
 */
export interface Tree {
  props : { children?: Child | Child[], style?: Style, [attribute: string]: unknown }
  type  : string
}

/**
 * The width and the height every card is drawn at, the 2:1 ratio X's
 * large-image card takes.
 */
export const CARD = { height: 600, width: 1200 } as const
/**
 * The colors every card is drawn in, the roles of the dark scheme, since every
 * card draws on the dark ground.
 */
const COLORS = {
  ink       : resolve(ROLES.ink.dark),
  page      : resolve(ROLES.page.dark),
  run       : resolve(ROLES.run.dark),
  stored    : resolve(ROLES.stored.dark),
  submitted : resolve(ROLES.submitted.dark)
} as const
/**
 * The pixels one unit of the card's layout spans, a hundredth of the card's
 * width, so every size scales with the card as a container query unit would.
 */
const unit = CARD.width / 100

function at(style: Style, ...children: Child[]): Tree {
  return node('div', { position: 'absolute', ...style }, ...children)
}

function caps(text: string, size: number, color: string): Tree {
  return node('span', {
    color         : color,
    fontFamily    : 'code',
    fontSize      : size * unit,
    fontWeight    : 500,
    letterSpacing : 0.16 * size * unit
  }, text.toUpperCase())
}

function fade(hex: string, alpha: number): string {
  return `${hex}${byteHex(alpha)}`
}

function node(type: string, style: Style, ...children: Child[]): Tree {
  return { props: { children, style: { display: 'flex', ...style } }, type }
}

function plate(edition: Edition): Tree {
  const faded = (alpha: number): string => fade(COLORS.run, alpha)
  return at({ border: `1px solid ${faded(0.5)}`, padding: 0.5 * unit, right: 7 * unit, top: 7 * unit },
    node('div', {
      alignItems    : 'center',
      border        : `1px solid ${faded(0.25)}`,
      flexDirection : 'column',
      gap           : 0.6 * unit,
      minWidth      : 19 * unit,
      padding       : `${1.6 * unit}px ${2.2 * unit}px`
    },
    caps('Edition', 1.15, faded(0.75)),
    node('span', { color: COLORS.run, fontFamily: 'display', fontSize: 5.4 * unit, lineHeight: 1.02 },
      edition.version),
    caps(edition.host, 1.15, faded(0.75))))
}

function rail(drawn: rails.Rails, labeled: boolean): Tree {
  const width = 86 * unit
  const scale = width / rails.RAILS.width
  const top   = labeled ? 36 : 8
  const label = (text: string, color: string, y: number): Tree[] => [
    at({
      background   : color,
      borderRadius : 2 * scale,
      height       : 11 * scale,
      left         : 0,
      top          : (y - 11 + top) * scale,
      width        : 11 * scale
    }),
    at({
      color         : fade(COLORS.ink, 0.66),
      fontFamily    : 'code',
      fontSize      : 15 * scale,
      fontWeight    : 500,
      left          : 20 * scale,
      letterSpacing : 2.4 * scale,
      top           : (y - 13 + top) * scale
    }, text.toUpperCase())
  ]
  const named = labeled
              ? [...label('Stored', COLORS.stored, -14), ...label('Submitted', COLORS.submitted, 152)]
              : []

  return node('div', { height: (labeled ? 204 : 144) * scale, position: 'relative', width },
    ...rails.squares(drawn).map(({ fill, size, x, y }) => at({
      background   : fill,
      borderRadius : 3 * scale,
      height       : size * scale,
      left         : x * scale,
      top          : (y + top) * scale,
      width        : size * scale
    })),
    ...named)
}

function railColors(run: string): rails.Rails['colors'] {
  return { run: [COLORS.run, run], shade: COLORS.page, stored: COLORS.stored, submitted: COLORS.submitted }
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

function wordmark(svg: string, width: number): Tree {
  const box     = /viewBox="[^ ]+ [^ ]+ ([^ ]+) ([^"]+)"/u.exec(svg)
  const colored = svg.replaceAll('currentColor', COLORS.run)
  return {
    type  : 'img',
    props : {
      height : width * unit * Number(box?.[2]) / Number(box?.[1]),
      src    : `data:image/svg+xml;base64,${Buffer.from(colored).toString('base64')}`,
      width  : width * unit
    }
  }
}

/**
 * Draws a page's card in its section's color: the wordmark and the edition
 * across the top, the section's name and place among the sections between two
 * rules of its color over the page's title, and the rails of the run, moved
 * along by the section's place, with the run's dark columns in the section's
 * color.
 *
 * Args:
 *   edition  : What every card states about the site.
 *   page     : The page's title and the section it sits in.
 *   sections : Every section the site carries, in the registry's order.
 */
export function pageCard(
  edition  : Edition,
  page     : { section: Section, title: string },
  sections : readonly Section[]
): Tree {
  const place  = sections.indexOf(page.section)
  const accent = hexOf(page.section.color)
  const colors = railColors(accent)
  const spare  = rails.RAILS.columns - edition.run.length - 7
  const start  = 2 + Math.round(place * spare / Math.max(1, sections.length - 1))
  const rule   = node('span', {
    background   : accent,
    borderRadius : 0.2 * unit,
    height       : 0.4 * unit,
    width        : 4.4 * unit
  })

  return node('div', { ...CARD, background: COLORS.page, position: 'relative' },
    at({ left: 7 * unit, top: 6.4 * unit }, wordmark(edition.wordmark, 15)),
    at({ right: 7 * unit, top: 7.2 * unit },
      caps(`${edition.host} · ${edition.version}`, 1.25, fade(COLORS.ink, 0.6))),
    at({ flexDirection: 'column', gap: 2 * unit, left: 7 * unit, right: 7 * unit, top: 15.5 * unit },
      node('div', { alignItems: 'center', gap: 1.6 * unit },
        rule,
        caps(`${page.section.label} · section ${twoDigits(place + 1)} of ${twoDigits(sections.length)}`, 1.6,
          fade(COLORS.ink, 0.8)),
        rule),
      node('span', {
        color         : COLORS.ink,
        fontFamily    : 'display',
        fontSize      : (page.title.length > 18 ? 6 : 7) * unit,
        letterSpacing : -0.035 * unit,
        lineHeight    : 1.02
      }, page.title)),
    at({ bottom: 4.6 * unit, left: 7 * unit }, rail({ colors, length: edition.run.length, start }, false)))
}

/**
 * Draws the site's own card, which the front page and the not-found page share:
 * the wordmark over the tagline, a plate naming the edition, and the rails of
 * the run with each game named beside its rail.
 */
export function siteCard(edition: Edition): Tree {
  const colors = railColors(mix(COLORS.run, 72, COLORS.page, 'srgb'))

  return node('div', { ...CARD, background: COLORS.page, position: 'relative' },
    at({ flexDirection: 'column', gap: 1.4 * unit, left: 7 * unit, top: 7.5 * unit, width: 56 * unit },
      wordmark(edition.wordmark, 40),
      node('span', {
        color      : COLORS.ink,
        fontFamily : 'body',
        fontSize   : 2.7 * unit,
        fontStyle  : 'italic',
        lineHeight : 1.25
      }, IDENTITY.tagline)),
    plate(edition),
    at({ bottom: 5 * unit, left: 7 * unit }, rail({ colors, ...edition.run }, true)))
}
