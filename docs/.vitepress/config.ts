import { defineConfig } from 'vitepress'

import { writeCards }             from './lib/cards/write.ts'
import { FOOTER, NOT_FOUND }      from './lib/config/chrome.ts'
import * as head                  from './lib/config/head.ts'
import { buildNav, buildSidebar } from './lib/config/navigation.ts'
import { pageData }               from './lib/config/page-data.ts'
import { identityPlugin }         from './lib/identity/sheet.ts'
import { markdownRules }          from './lib/markdown/rules.ts'
import { projectFacts }           from './lib/site/manifest.ts'
import * as paths                 from './lib/site/paths.ts'

const TITLE = 'Scotch'
const facts = projectFacts(import.meta.url)

export default defineConfig({
  buildEnd          : async built => { await writeCards(built, import.meta.url) },
  cacheDir          : paths.cacheDir(import.meta.url, 'vitepress'),
  cleanUrls         : true,
  description       : facts.description,
  head              : head.siteHead(TITLE),
  lang              : 'en-US',
  markdown          : { config: markdownRules },
  sitemap           : { hostname: facts.homepage },
  srcDir            : paths.pagesDir(import.meta.url),
  title             : TITLE,
  transformHead     : context => head.pageHead(facts, context.pageData, TITLE),
  transformPageData : (page, context) => pageData(page, context, import.meta.url),

  themeConfig: {
    footer    : FOOTER,
    nav       : buildNav(),
    notFound  : NOT_FOUND,
    outline   : { label: 'On This Page', level: [2, 3] },
    search    : { provider: 'local' },
    sidebar   : buildSidebar(paths.pagesDir(import.meta.url)),
    siteTitle : TITLE
  },

  vite: {
    css       : { transformer: 'lightningcss' },
    plugins   : [identityPlugin()],
    publicDir : paths.publicDir(import.meta.url)
  }
})
