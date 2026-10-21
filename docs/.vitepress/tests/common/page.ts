import { vi } from 'vitest'

/**
 * The boxes the wide front page measured, which the stand-in page reports for
 * each of its elements, each as a left edge, a top edge, a width, and a height.
 */
const BOXES = {
  '.VPFooter'                : [0, 1756, 1440, 89],
  '.VPHero'                  : [0, 0, 1440, 461],
  '.VPHome'                  : [0, 0, 1440, 1628],
  '.VPNavBar'                : [0, 0, 1440, 64],
  '.actions .VPButton.alt'   : [706, 328, 176, 40],
  '.actions .VPButton.brand' : [557, 328, 137, 40],
  '.sc-wordmark svg'         : [528, 157, 384, 102]
} as const

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
    globalAlpha  : 1,
    lineWidth    : 1,
    rect         : vi.fn<() => void>(),
    restore      : vi.fn<() => void>(),
    save         : vi.fn<() => void>(),
    scale        : vi.fn<() => void>(),
    setTransform : vi.fn<() => void>(),
    stroke       : vi.fn<() => void>(),
    strokeStyle  : ''
  } as unknown as CanvasRenderingContext2D
}

/**
 * Lays a stand-in front page into the document, its bar, hero, lockup, actions,
 * and footer each reporting the box the wide page measured, every canvas
 * handing out `drawn` as its context, and every image decoding at once.
 *
 * Returns:
 *   The front page's element, which the backdrop mounts inside.
 */
export function standIn(drawn = context()): HTMLElement {
  document.body.innerHTML = `
    <div class="VPNavBar"></div>
    <div class="VPHome">
      <div class="VPHero">
        <div class="sc-lockup">
          <span class="sc-wordmark"><svg></svg></span><p class="sc-tagline">Find it.</p>
        </div>
        <div class="actions"><a class="VPButton brand">One</a><a class="VPButton alt">Two</a></div>
      </div>
      <div class="sc-card"><p>Card</p></div>
    </div>
    <div class="VPFooter"></div>`

  const boxes = new Map(Object.entries(BOXES)
    .map(([selector, box]) => [document.querySelector(selector)!, new DOMRect(...box)]))
  const lines = [new DOMRect(514, 275, 410, 26)] as unknown as DOMRectList
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return boxes.get(this) ?? new DOMRect()
  })
  vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue(lines)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawn as never)
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue()
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1440)
  return document.querySelector<HTMLElement>('.VPHome')!
}
