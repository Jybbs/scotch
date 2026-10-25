// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

import { snapRow } from '../../../lib/viewer/pixel.ts'

/**
 * Builds a row of two buttons, the first sized to its content and the second
 * stretched to fill the row, each standing in the box given.
 */
function row(
  left   : number,
  widths : readonly [number, number]
): { buttons: HTMLButtonElement[], row: HTMLElement } {
  const element     = document.createElement('div')
  element.innerHTML = '<button></button><button></button>'
  const buttons     = [...element.querySelectorAll('button')]
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(left, 0, 200, 20))
  for (const [at, button] of buttons.entries()) {
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(new DOMRect(left, 0, widths[at], 20))
  }
  vi.spyOn(globalThis, 'getComputedStyle')
    .mockImplementation(node => ({ flexGrow: node === buttons[1] ? '1' : '0' }) as CSSStyleDeclaration)
  return { buttons, row: element }
}

describe('snapRow', () => {
  it('widens a button sized to its content to a whole device pixel, leaving a stretched one as it is', () => {
    const { buttons, row: drawn } = row(10, [40.3, 60.3])
    snapRow(drawn, 2)
    expect(buttons.map(button => button.style.minWidth)).toEqual(['40.5px', ''])
  })

  it('moves the row by the fraction of a device pixel it sits off', () => {
    const { row: drawn } = row(10.2, [40, 60])
    snapRow(drawn, 2)
    expect(drawn.style.translate).toBe('-0.200px 0')
  })

  it('leaves a row already on whole device pixels as it stands, clearing what it set before', () => {
    const { buttons, row: drawn } = row(10, [40, 60])
    buttons[0]!.style.minWidth    = '41px'
    drawn.style.translate         = '0.5px 0'
    snapRow(drawn, 2)
    expect([buttons[0]!.style.minWidth, drawn.style.translate]).toEqual(['', ''])
  })
})
