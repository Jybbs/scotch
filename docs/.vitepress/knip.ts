import { defineConfig } from 'knip/config'

export default defineConfig({
  ignoreDependencies : ['oxlint', /^@fontsource\//u],
  rules              : { cycles: 'error' },
  typescript         : { config: ['.vitepress/tsconfig.json'] },
  vitest             : { config: ['.vitepress/vitest.config.ts'] }
})
