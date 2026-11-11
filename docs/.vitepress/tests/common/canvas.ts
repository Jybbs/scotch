import { vi } from 'vitest'

/**
 * Builds a stand-in for a canvas's 2D context, recording each call and holding
 * each drawing setting a call writes.
 */
export function context(): CanvasRenderingContext2D {
  return {
    arc          : vi.fn<() => void>(),
    beginPath    : vi.fn<() => void>(),
    clearRect    : vi.fn<() => void>(),
    clip         : vi.fn<() => void>(),
    drawImage    : vi.fn<() => void>(),
    fillRect     : vi.fn<() => void>(),
    fillStyle    : '',
    fillText     : vi.fn<() => void>(),
    font         : '',
    globalAlpha  : 1,
    lineWidth    : 1,
    rect         : vi.fn<() => void>(),
    restore      : vi.fn<() => void>(),
    rotate       : vi.fn<() => void>(),
    roundRect    : vi.fn<() => void>(),
    save         : vi.fn<() => void>(),
    scale        : vi.fn<() => void>(),
    setTransform : vi.fn<() => void>(),
    stroke       : vi.fn<() => void>(),
    strokeStyle  : '',
    textBaseline : 'alphabetic'
  } as unknown as CanvasRenderingContext2D
}
