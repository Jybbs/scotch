// @vitest-environment happy-dom
import { type Mock, describe, expect, it, vi } from 'vitest'

import * as motion           from '../../../lib/methods/motion.ts'
import { CURVES, DURATIONS } from '../../../lib/motion/timing.ts'

/**
 * Builds a node holding a transform and an opacity in its inline style, its
 * `animate` recording each call it receives.
 */
function nodeAt(transform = '', opacity = ''): { animate: Mock<HTMLElement['animate']>, node: HTMLElement } {
  const node    = document.createElement('span')
  const animate = vi.fn<HTMLElement['animate']>(() => ({}) as Animation)
  Object.assign(node.style, { opacity, transform })
  node.animate = animate
  return { animate, node }
}

describe('howOf', () => {
  it.each([
    [6, false, 7, 'glide'],
    [7, false, 6, 'glide'],
    [0, false, 18, 'fade'],
    [6, true, 7, undefined],
    [0, true, 18, undefined]
  ])('moves from ply %i with reduced motion %s to ply %i as %s', (from, reduced, to, how) => {
    expect(motion.howOf(from, reduced, to)).toBe(how)
  })
})

describe('moveNode', () => {
  it('writes the target at once and starts nothing where no motion is named', () => {
    const { animate, node } = nodeAt('translate(0%, 0%)', '1')
    const running           = [] as Animation[]
    motion.moveNode(node, undefined, running, { opacity: 0.2, transform: 'translate(100%, 0%)' })
    expect([node.style.transform, node.style.opacity]).toEqual(['translate(100%, 0%)', '0.2'])
    expect(animate).not.toHaveBeenCalled()
    expect(running).toEqual([])
  })

  it('starts nothing for a node already at its target', () => {
    const { animate, node } = nodeAt('translate(0%, 0%)', '1')
    motion.moveNode(node, 'glide', [], { opacity: 1, transform: 'translate(0%, 0%)' })
    expect(animate).not.toHaveBeenCalled()
  })

  it('glides the transform along the glide and the opacity over the settle', () => {
    const { animate, node } = nodeAt('translate(0%, 0%)', '1')
    const running           = [] as Animation[]
    motion.moveNode(node, 'glide', running, { opacity: 0.2, transform: 'translate(100%, 0%)' })
    const easing = `cubic-bezier(${CURVES.glide.join(', ')})`
    expect(animate.mock.calls).toEqual([
      [
        [{ transform: 'translate(0%, 0%)' }, { transform: 'translate(100%, 0%)' }],
        { duration: DURATIONS.glide, easing }
      ],
      [[{ opacity: 1 }, { opacity: 0.2 }], { duration: DURATIONS.settle, easing }]
    ])
    expect(running).toHaveLength(2)
  })
})

describe('moveNode across plies', () => {
  it('fades a hidden node in at its new square, gliding nothing a reader could not see', () => {
    const { animate, node } = nodeAt('translate(0%, 0%)', '0')
    motion.moveNode(node, 'glide', [], { opacity: 1, transform: 'translate(100%, 0%)' })
    expect(animate.mock.calls.map(([frames]) => frames)).toEqual([[{ opacity: 0 }, { opacity: 1 }]])
  })

  it('glides nothing for a shown node that holds no transform yet', () => {
    const { animate, node } = nodeAt('', '1')
    motion.moveNode(node, 'glide', [], { opacity: 1, transform: 'translate(100%, 0%)' })
    expect(animate).not.toHaveBeenCalled()
  })

  it('fades a node holding no transform yet in place, with no stop across', () => {
    const { animate, node } = nodeAt('', '0')
    motion.moveNode(node, 'fade', [], { opacity: 1, transform: 'translate(100%, 0%)' })
    expect(animate.mock.calls.map(([frames]) => frames)).toEqual([[{ opacity: 0 }, { opacity: 1 }]])
  })

  it('glides a node it never showed to its square without sliding it from nowhere', () => {
    const { animate, node } = nodeAt('', '')
    motion.moveNode(node, 'glide', [], { opacity: 1, transform: 'translate(100%, 0%)' })
    expect(animate.mock.calls.map(([frames]) => frames)).toEqual([[{ opacity: 0 }, { opacity: 1 }]])
  })

  it('fades a node out, across while hidden, and back in along the sway', () => {
    const { animate, node } = nodeAt('translate(0%, 0%)', '1')
    motion.moveNode(node, 'fade', [], { opacity: 1, transform: 'translate(700%, 0%)' })
    expect(animate.mock.calls).toEqual([[
      [
        { opacity: 1, transform: 'translate(0%, 0%)' },
        { offset: 0.45, opacity: 0, transform: 'translate(0%, 0%)' },
        { offset: 0.55, opacity: 0, transform: 'translate(700%, 0%)' },
        { opacity: 1, transform: 'translate(700%, 0%)' }
      ],
      { duration: DURATIONS.settle, easing: `cubic-bezier(${CURVES.sway.join(', ')})` }
    ]])
  })

  it('fades a node that keeps its place by its opacity alone', () => {
    const { animate, node } = nodeAt('', '1')
    motion.moveNode(node, 'fade', [], { opacity: 0 })
    expect(animate.mock.calls.map(([frames]) => frames)).toEqual([[{ opacity: 1 }, { opacity: 0 }]])
  })
})

describe('settleAll', () => {
  it('writes where each running animation stands before ending it, and empties the list', () => {
    const running = { cancel: vi.fn<() => void>(), commitStyles: vi.fn<() => void>(), playState: 'running' }
    const done    = { cancel: vi.fn<() => void>(), commitStyles: vi.fn<() => void>(), playState: 'finished' }
    const list    = [running, done] as unknown as Animation[]
    motion.settleAll(list)
    expect(running.commitStyles).toHaveBeenCalledBefore(running.cancel)
    expect(running.commitStyles).toHaveBeenCalledOnce()
    expect(running.cancel).toHaveBeenCalledOnce()
    expect(done.cancel).toHaveBeenCalledOnce()
    expect(done.commitStyles).not.toHaveBeenCalled()
    expect(list).toEqual([])
  })

  it('ends an animation the browser cannot write the place of', () => {
    const running = { cancel: vi.fn<() => void>(), playState: 'running' }
    motion.settleAll([running] as unknown as Animation[])
    expect(running.cancel).toHaveBeenCalledOnce()
  })
})
