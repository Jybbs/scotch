// @vitest-environment happy-dom
import { flushPromises, mount }                from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EXAMPLES, type Match, type Sample } from '../../../../lib/viewer/examples.ts'
import * as games                            from '../../../../lib/viewer/games.ts'
import { Loaded }                            from '../../../../lib/viewer/loaded.ts'
import { Band }                              from '../../../../theme/components/viewer/band.ts'
import { fileOf, picked }                    from '../../../common/files.ts'
import { endedAt }                           from '../../../common/matches.ts'

const loaded = new Loaded(EXAMPLES.match)

/**
 * Builds a drag event carrying the files given, as a drag over the band from
 * the desktop does.
 */
function dragged(type: string, files: readonly File[]): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  const types = files.length > 0 ? ['Files'] : ['text/plain']
  Object.defineProperty(event, 'dataTransfer', { value: { files, types } })
  return event
}

/**
 * Mounts the band naming a match, the example `sample` names pressed in the
 * intake.
 */
function mounted(match = loaded, sample: Sample | null = 'match'): ReturnType<typeof mount<typeof Band>> {
  return mount(Band, {
    attachTo : document.body,
    props    : {
      link    : () => Promise.resolve('https://scotch.fyi/viewer'),
      loaded  : match,
      problem : '',
      sample  : sample ?? undefined
    }
  })
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('Band naming the match', () => {
  it('counts the positions the two share beside the stored game’s players', () => {
    const wrapper = mounted()
    expect(wrapper.find('.sc-viewer-count').text()).toBe(String(loaded.shared!.length))
    expect(wrapper.find('.sc-viewer-name').text()).toBe(games.nameOf(EXAMPLES.match.stored!))
  })

  it('names where the stored game was played, the run’s plies, and the two moves where they part', () => {
    const { last, meet } = loaded.shared!
    const where          = games.whereOf(EXAMPLES.match.stored!)
    expect(mounted().find('.sc-viewer-details').text())
      .toBe(`${where} · plies ${meet} to ${last} · then ${loaded.leaving} against ${loaded.parting}`)
  })

  it.each([
    [2, 36, 'one of 3 stored games sharing 36 positions'],
    [1, 1, 'one of 2 stored games sharing 1 position']
  ])('names how many stored games tie with %i others over %i positions', (ties, length, phrase) => {
    const span = { ...EXAMPLES.match.span!, length }
    const tied = new Loaded({ ...EXAMPLES.match, span, ties } as Match)
    expect(mounted(tied).find('.sc-viewer-details').text()).toContain(phrase)
  })

  it('names no stored game where none shares a position', () => {
    const wrapper = mounted(new Loaded(EXAMPLES.alone), 'alone')
    expect(['count', 'name', 'details'].map(part => wrapper.find(`.sc-viewer-${part}`).text()))
      .toEqual(['0', 'no stored game', 'No stored game shares a position with this game'])
  })

  it('names an unknown event and leaves out the parting where the stored game ends with the run', () => {
    const { last, meet } = loaded.shared!
    const ended          = endedAt(last, 'stored')
    const headers        = { ...ended.stored!.headers, Date: '????.??.??', Event: '?' }
    const unknown        = { ...ended.stored!, headers }
    expect(mounted(new Loaded({ ...ended, stored: unknown })).find('.sc-viewer-details').text())
      .toBe(`Unknown event · plies ${meet} to ${last}`)
  })

  it('draws the match afresh for each match it loads', async () => {
    const wrapper = mounted()
    const was     = wrapper.find('.sc-viewer-match').element
    await wrapper.setProps({ loaded: new Loaded(EXAMPLES.match) })
    expect(wrapper.find('.sc-viewer-match').element).not.toBe(was)
  })
})

describe('Band taking a match', () => {
  it.each([
    ['alone', EXAMPLES.alone, 'demo.pgn', 2],
    ['match', EXAMPLES.match, 'viewer.pgn', 1]
  ] as const)('loads the %s example its chip names', async (name, match, source, chip) => {
    const wrapper = mounted(loaded, null)
    await wrapper.find(`.sc-viewer-examples button:nth-child(${chip})`).trigger('click')
    expect(wrapper.emitted('load')).toEqual([[match, source, name]])
  })

  it('shows the opening of the example match’s own moves in the PGN entry', () => {
    expect(mounted().find('.sc-viewer-pgn-field').attributes('placeholder'))
      .toBe('1. Nf3 Nf6 2. c4 e6 3. Nc3 d5 4. d4 Bb4 5. cxd5 exd5 …')
  })

  it('presses the chip of the example it shows', () => {
    expect(mounted().findAll('.sc-viewer-examples button').map(chip => chip.attributes('aria-pressed')))
      .toEqual(['true', 'false'])
  })
})

describe('Band taking a file', () => {
  it('opens the file picker from its chip', async () => {
    const opened  = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = mounted()
    await wrapper.find('.sc-viewer-actions > button').trigger('click')
    expect(opened).toHaveBeenCalledOnce()
  })

  it('loads a match file picked, then clears the picker', async () => {
    const wrapper = mounted()
    const input   = await picked(wrapper, [fileOf(JSON.stringify(EXAMPLES.alone), 'mine.json')])
    expect(wrapper.emitted('load')).toEqual([[EXAMPLES.alone, 'mine.json']])
    expect(input.value).toBe('')
  })

  it('names what a picked file lacks', async () => {
    const wrapper = mounted()
    await picked(wrapper, [fileOf('{"submitted": 1}')])
    expect(wrapper.emitted('problem')?.[0]?.[0])
      .toBe("game.json: `submitted` holds a number rather than an object")
  })

  it('takes nothing where the picker closes with no file', async () => {
    const wrapper = mounted()
    await picked(wrapper, [])
    expect([wrapper.emitted('load'), wrapper.emitted('problem')]).toEqual([undefined, undefined])
  })
})

describe('Band taking a dropped file', () => {
  it('marks itself while a file is dragged over it and loads the file dropped', async () => {
    const wrapper = mounted()
    const band    = wrapper.find('.sc-viewer-band').element as HTMLElement
    const file    = fileOf(JSON.stringify(EXAMPLES.alone), 'dropped.json')
    band.dispatchEvent(dragged('dragenter', [file]))
    await flushPromises()
    expect('drag' in band.dataset).toBe(true)
    const over = dragged('dragover', [file])
    band.dispatchEvent(over)
    band.dispatchEvent(dragged('drop', [file]))
    await flushPromises()
    expect([over.defaultPrevented, 'drag' in band.dataset, wrapper.emitted('load')])
      .toEqual([true, false, [[EXAMPLES.alone, 'dropped.json']]])
  })

  it('leaves a drag carrying no file to the page', async () => {
    const wrapper = mounted()
    const band    = wrapper.find('.sc-viewer-band').element as HTMLElement
    const over    = dragged('dragover', [])
    band.dispatchEvent(dragged('dragenter', []))
    band.dispatchEvent(over)
    band.dispatchEvent(dragged('drop', []))
    await flushPromises()
    expect(['drag' in band.dataset, over.defaultPrevented, wrapper.emitted('load')])
      .toEqual([false, false, undefined])
  })

  it('unmarks itself once a drag leaves it', async () => {
    const wrapper = mounted()
    const band    = wrapper.find('.sc-viewer-band').element as HTMLElement
    const file    = fileOf('{}')
    band.dispatchEvent(dragged('dragenter', [file]))
    band.dispatchEvent(dragged('dragleave', [file]))
    band.dispatchEvent(dragged('dragleave', [file]))
    await flushPromises()
    expect('drag' in band.dataset).toBe(false)
  })

  it('names the problem it is handed under the intake', () => {
    const props   = { link: () => Promise.resolve(''), loaded, problem: 'The link holds no match' }
    const wrapper = mount(Band, { props })
    expect(wrapper.find('[role="alert"]').text()).toBe('The link holds no match')
  })
})
