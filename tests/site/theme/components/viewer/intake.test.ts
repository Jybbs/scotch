// @vitest-environment happy-dom
import { type DOMWrapper, mount } from '@vue/test-utils'
import { describe, expect, it }   from 'vitest'

import { Intake } from '../../../../../docs/.vitepress/theme/components/viewer/intake.ts'

/**
 * Pastes `text` into the entry as a browser does, at whatever the entry selects
 * once its `paste` handler has run.
 */
async function pasted(field: DOMWrapper<HTMLTextAreaElement>, text: string): Promise<void> {
  await field.trigger('paste')
  const { selectionEnd, selectionStart } = field.element
  field.element.setRangeText(text, selectionStart, selectionEnd, 'end')
  await field.trigger('input', { inputType: 'insertFromPaste' })
}

describe('Intake taking a second game', () => {
  it.each<[string, (field: DOMWrapper<HTMLTextAreaElement>) => unknown]>([
    ['pasted', field => pasted(field, '1. e4 *')],
    ['pasted, then edited', async field => {
      await pasted(field, '1. e4 *')
      await field.setValue('1. e4 e5 *')
    }],
    ['typed', async field => {
      await field.setValue('1. e4 *')
      await field.trigger('keydown', { key: 'Enter' })
    }]
  ])('submits a game pasted after one %s by itself', async (_, earlier) => {
    const wrapper = mount(Intake, { attachTo: document.body, props: { problem: '' } })
    const field   = wrapper.find('textarea')
    await earlier(field)
    await pasted(field, '1. d4 *')
    expect(wrapper.emitted('pgn')?.at(-1)).toEqual(['1. d4 *'])
  })

  it('submits a pasted game as it stands on Enter once it is edited', async () => {
    const wrapper = mount(Intake, { attachTo: document.body, props: { problem: '' } })
    const field   = wrapper.find('textarea')
    await pasted(field, '1. d4 *')
    await field.setValue('1. d4 d5 *')
    await field.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('pgn')).toEqual([['1. d4 *'], ['1. d4 d5 *']])
  })
})
