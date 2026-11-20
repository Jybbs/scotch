import type { Theme }           from 'vitepress'
import DefaultTheme             from 'vitepress/theme-without-fonts'
import { defineAsyncComponent } from 'vue'

import '@fontsource-variable/hedvig-letters-serif/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource-variable/jetbrains-mono/wght-italic.css'
import '@fontsource-variable/petrona/wght.css'
import '@fontsource-variable/petrona/wght-italic.css'
import 'virtual:scotch-identity.css'
import './styles/roles.css'
import './styles/tailwind.css'
import './styles/page.css'
import './styles/notes.css'

import { FIGURE } from '../lib/markdown/placements.ts'
import { VIEWER } from '../lib/viewer/page.ts'
import { Figure } from './components/figure.ts'
import { Layout } from './layout.ts'

export default {
  Layout     : Layout,
  extends    : DefaultTheme,
  enhanceApp : ({ app }) => {
    app.component(FIGURE, Figure)
    app.component(VIEWER.layout, defineAsyncComponent(async () => {
      const { Tool } = await import('./components/viewer/tool.ts')
      return Tool
    }))
  }
} satisfies Theme
