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
import './styles/page.css'
import './styles/front/hero.css'
import './styles/front/layer.css'
import './styles/front/entries.css'
import './styles/front/motion.css'
import './styles/front/panel.css'
import './styles/front/store.css'
import './styles/front/session.css'
import './styles/front/prints.css'
import './styles/front/split.css'
import './styles/data/plate.css'
import './styles/data/archives.css'
import './styles/data/decades.css'
import './styles/data/eras.css'
import './styles/data/files.css'
import './styles/data/rail.css'
import './styles/data/results.css'
import './styles/methods/run.css'
import './styles/reference/parts.css'
import './styles/reference/palette.css'
import './styles/reference/roles.css'
import './styles/reference/series.css'
import './styles/reference/faces.css'
import './styles/reference/pieces.css'
import './styles/reference/marks.css'
import './styles/reference/construction.css'
import './styles/reference/slip.css'
import './styles/viewer/tool.css'
import './styles/viewer/seat.css'
import './styles/viewer/band.css'
import './styles/viewer/tally.css'
import './styles/viewer/intake.css'
import './styles/viewer/stage.css'
import './styles/viewer/board.css'
import './styles/viewer/controls.css'
import './styles/viewer/ledger.css'
import './styles/viewer/track.css'
import './styles/viewer/guess.css'

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
