import tailwindcss    from '@tailwindcss/vite'
import { expect, it } from 'vitest'

import { sitePlugins } from '../../../lib/config/plugins.ts'

it('serves the identity’s sheet ahead of every plugin Tailwind adds', () => {
  expect(sitePlugins().map(({ name }) => name))
    .toStrictEqual(['scotch-identity', ...tailwindcss().map(({ name }) => name)])
})
