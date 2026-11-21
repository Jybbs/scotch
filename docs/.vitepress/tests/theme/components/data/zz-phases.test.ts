// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import { h } from 'vue'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementSize: (await import('../../../common/size.ts')).useElementSize
}))

it('phases', async () => {
  let t = performance.now()
  const lib = await import('../../../../lib/data/files.ts')
  const tJson = performance.now() - t
  t = performance.now()
  const { Files } = await import('../../../../theme/components/data/files.ts')
  const tComp = performance.now() - t
  const axes = await import('../../../../lib/data/axes.ts')
  const players = lib.sectionOf(lib.entriesOf(), 'Players')
  t = performance.now()
  axes.swarm(184, players, 600, lib.yearsOf(lib.decadesOf(players)))
  const tSwarm = performance.now() - t
  t = performance.now()
  const w = mount(() => h(Files))
  await flushPromises()
  const tMount = performance.now() - t
  t = performance.now()
  mount(() => h(Files)); await flushPromises()
  const tMount2 = performance.now() - t
  process.stderr.write(`PHASES ${JSON.stringify({ tJson, tComp, tSwarm, tMount, tMount2 })}\n`)
  expect(w.element).toBeInstanceOf(Element)
})
