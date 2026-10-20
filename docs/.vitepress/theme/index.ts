import type { Theme } from 'vitepress'
import DefaultTheme   from 'vitepress/theme-without-fonts'

import '@fontsource-variable/hedvig-letters-serif/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource-variable/jetbrains-mono/wght-italic.css'
import '@fontsource-variable/petrona/wght.css'
import '@fontsource-variable/petrona/wght-italic.css'
import 'virtual:scotch-identity.css'
import './styles/roles.css'
import './styles/page.css'
import './styles/front/backdrop.css'
import './styles/front/hero.css'
import './styles/front/cards.css'
import './styles/data/plate.css'
import './styles/data/archives.css'
import './styles/data/decades.css'
import './styles/data/eras.css'
import './styles/data/files.css'
import './styles/data/results.css'
import './styles/methods/run.css'

import { FIGURE } from '../lib/markdown/placements.ts'
import { Figure } from './components/figure.ts'
import { Layout } from './layout.ts'

export default {
  Layout     : Layout,
  extends    : DefaultTheme,
  enhanceApp : ({ app }) => {
    app.component(FIGURE, Figure)
  }
} satisfies Theme
