// @vitest-environment happy-dom
import { flushPromises, mount }            from '@vue/test-utils'
import { afterEach, describe, expect, vi } from 'vitest'

import { Session }      from '../../../../theme/components/front/session.ts'
import { homed, test }  from '../../../common/clock.ts'
import { reduceMotion } from '../../../common/motion.ts'

vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useElementVisibility: () => ({ value: true })
}))

afterEach(() => {
  sessionStorage.clear()
})

describe('Session', () => {
  test('opens on the whole session, its figure at its true value before any motion', async () => {
    const session = mount(Session)
    await flushPromises()
    expect(session.find('[data-spoken]').text()).toBe('6')
    expect(session.findAll('pre > div').at(-1)!.text()).toBe('❯')
  })

  test('starts over on an empty prompt, then types the first command a beat at a time', async ({ clock }) => {
    const session = mount(Session)
    await flushPromises()
    await homed(session)
    expect(session.find('pre').text()).toBe('❯')
    clock.advanceTimersByTime(220)
    await flushPromises()
    expect(session.find('pre').text()).toBe('❯ scotch')
    expect(session.find('[data-wait]').exists()).toBe(true)
  })

  test('prints what each command leaves, then a fresh prompt once the last is done', async () => {
    reduceMotion()
    const session = mount(Session)
    await flushPromises()
    const lines = session.findAll('pre > div').map(line => line.text())
    expect(lines[0]).toBe('❯ scotch fetch games')
    expect(lines.at(-2)).toMatch(/^Shares 6 positions, /u)
    expect(lines.at(-1)).toBe('❯')
    expect(session.findAll('[data-cursor]')).toHaveLength(1)
    expect(session.find('[data-spoken]').text()).toBe('6')
    expect(session.find('[data-unit]').text()).toBe('positions shared')
    expect(session.find('[data-say]').text())
      .toBe('Step III of III, from scotch match game docs/public/games/front.pgn')
  })

  test('names each command figure once it has printed', async () => {
    reduceMotion()
    const session = mount(Session)
    await flushPromises()
    expect(session.findAll('dl dt').map(term => term.text()))
      .toEqual(['Fetch', 'Index', 'Match'])
    expect(session.findAll('dl dd').map(value => value.text())).not.toContain('·')
  })
})
