import { defineConfig } from 'vitepress'

import { writeCards }             from '../lib/cards/write.ts'
import * as chrome                from '../lib/config/chrome.ts'
import * as head                  from '../lib/config/head.ts'
import { buildNav, buildSidebar } from '../lib/config/navigation.ts'
import { pageData }               from '../lib/config/page-data.ts'
import { sitePlugins }            from '../lib/config/plugins.ts'
import { markdownRules }          from '../lib/markdown/rules.ts'
import * as manifest              from '../lib/site/manifest.ts'
import * as paths                 from '../lib/site/paths.ts'

const TITLE     = 'Scotch'
const commit    = manifest.commitOf(import.meta.url)
const facts     = manifest.projectFacts(import.meta.url)
const providers = manifest.providersOf(import.meta.url)

export default defineConfig<chrome.SiteTheme>({
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
    colophon  : chrome.colophonOf(commit, facts, providers),
    nav       : buildNav(),
    notFound  : chrome.NOT_FOUND,
    outline   : { label: 'On This Page', level: [2, 3] },
    search    : { provider: 'local' },
    sidebar   : buildSidebar(paths.pagesDir(import.meta.url)),
    siteTitle : TITLE
  },

  vite: {
    css       : { transformer: 'lightningcss' },
    plugins   : sitePlugins(),
    publicDir : paths.publicDir(import.meta.url)
  }
})
