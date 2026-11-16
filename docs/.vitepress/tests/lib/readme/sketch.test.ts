import { describe, expect, it } from 'vitest'

import { Sketch } from '../../../lib/readme/sketch.ts'

describe('Sketch', () => {
  it('writes each rectangle filled as an SVG rect in the fill set when it was filled', () => {
    const sketch = new Sketch()
    sketch.fillStyle = '#123456'
    sketch.context.fillRect(1, 2, 3, 4)
    expect(sketch.svg).toBe('<rect fill="#123456" height="4" width="3" x="1" y="2"/>')
  })

  it('keeps each line of text in the font and the fill set when it was written', () => {
    const sketch = new Sketch()
    Object.assign(sketch, { fillStyle: '#000', font: '12px Mono' })
    sketch.context.fillText('MEET', 5, 6)
    expect(sketch.lines).toEqual([{ fill: '#000', font: '12px Mono', text: 'MEET', x: 5, y: 6 }])
  })

  it('drops everything drawn once the canvas is cleared', () => {
    const sketch = new Sketch()
    sketch.context.fillRect(0, 0, 1, 1)
    sketch.context.fillText('a', 0, 0)
    sketch.context.clearRect(0, 0, 10, 10)
    expect([sketch.svg, sketch.lines]).toEqual(['', []])
  })
})
