import DefaultTheme      from 'vitepress/theme-without-fonts'
import { type VNode, h } from 'vue'

import mark         from '../../assets/mark.svg?raw'
import wordmark     from '../../assets/wordmark.svg?raw'
import { IDENTITY } from '../lib/identity/tokens.ts'
import { Backdrop } from './components/front/backdrop.ts'

const lockup = (): VNode => h('div', { class: 'sc-lockup' }, [
  h('span', { class: 'sc-wordmark', innerHTML: wordmark }),
  h('p', { class: 'sc-tagline' }, IDENTITY.tagline)
])

/**
 * The default theme's layout with the site's own pieces in its slots, meaning
 * the mark beside the site's title, and on the front page the backdrop behind
 * the hero and the lockup of the wordmark over the tagline in it.
 */
export const Layout = (): VNode => h(DefaultTheme.Layout, null, {
  'home-hero-before'     : () => h(Backdrop),
  'home-hero-info'       : lockup,
  'nav-bar-title-before' : () => h('span', { 'aria-hidden': 'true', class: 'sc-mark', innerHTML: mark })
})
