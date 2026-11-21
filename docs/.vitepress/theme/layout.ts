import DefaultTheme      from 'vitepress/theme-without-fonts'
import { type VNode, h } from 'vue'

import mark             from '../../assets/mark.svg?raw'
import wordmark         from '../../assets/wordmark.svg?raw'
import { IDENTITY }     from '../lib/identity/tokens.ts'
import { Colophon }     from './components/colophon.ts'
import { Layer }        from './components/front/layer.ts'
import { MotionSwitch } from './components/front/motion.ts'
import { Notes }        from './components/notes.ts'
import { Slip }         from './components/reference/slip.ts'

const lockup = (): VNode => h('div', {
  class: 'mx-auto grid w-[min(32rem,100%)] justify-items-center gap-3.5 text-center'
}, [
  h('span', {
    class     : 'block w-[min(24rem,76%)] text-run [&_svg]:block [&_svg]:h-auto [&_svg]:w-full',
    innerHTML : wordmark
  }),
  h('p', {
    class: 'm-0 font-body text-[length:clamp(1.1rem,3vw,1.45rem)]/[1.3] font-normal text-balance text-ink '
         + 'italic'
  }, IDENTITY.tagline)
])

/**
 * The default theme's layout with the site's own pieces in its slots, meaning
 * the mark beside the site's title, the switch pausing every moving drawing at
 * the end of the navigation bar, on the front page the layer behind the whole
 * page and the lockup of the wordmark over the tagline in the hero, and beneath
 * every page the colophon, the slip a term's link opens, and the component
 * picking out a citation and its source once either is pressed.
 */
export const Layout = (): VNode => h(DefaultTheme.Layout, null, {
  'home-hero-before'      : () => h(Layer),
  'home-hero-info'        : lockup,
  'layout-bottom'         : () => [h(Colophon), h(Notes), h(Slip)],
  'nav-bar-content-after' : () => h(MotionSwitch),
  'nav-bar-title-before'  : () => h('span', {
    'aria-hidden' : 'true',
    class         : 'mr-2 inline-flex h-6 text-run [&_svg]:h-full [&_svg]:w-auto',
    innerHTML     : mark
  })
})
