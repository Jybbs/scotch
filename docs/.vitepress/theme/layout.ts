import DefaultTheme      from 'vitepress/theme-without-fonts'
import { type VNode, h } from 'vue'

import mark             from '../../assets/mark.svg?raw'
import wordmark         from '../../assets/wordmark.svg?raw'
import { IDENTITY }     from '../lib/identity/tokens.ts'
import { Layer }        from './components/front/layer.ts'
import { MotionSwitch } from './components/front/motion.ts'
import { Slip }         from './components/reference/slip.ts'

const lockup = (): VNode => h('div', { class: 'sc-lockup' }, [
  h('span', { class: 'sc-wordmark', innerHTML: wordmark }),
  h('p', { class: 'sc-tagline' }, IDENTITY.tagline)
])

/**
 * The default theme's layout with the site's own pieces in its slots, meaning
 * the mark beside the site's title, the switch pausing every moving drawing at
 * the end of the navigation bar, on the front page the layer behind the whole
 * page and the lockup of the wordmark over the tagline in the hero, and beneath
 * every page the slip a term's link opens.
 */
export const Layout = (): VNode => h(DefaultTheme.Layout, null, {
  'home-hero-before'      : () => h(Layer),
  'home-hero-info'        : lockup,
  'layout-bottom'         : () => h(Slip),
  'nav-bar-content-after' : () => h(MotionSwitch),
  'nav-bar-title-before'  : () => h('span', { 'aria-hidden': 'true', class: 'sc-mark', innerHTML: mark })
})
