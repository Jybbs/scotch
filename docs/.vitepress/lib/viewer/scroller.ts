import { clamp } from '@vueuse/core'

/**
 * Keeps one row of a list of rows of one height a third of the way down its
 * box, on a whole row so no row is cut at the box's top, measuring the box and
 * its rows only when either resizes, so a step scrolls the list without reading
 * its layout, gliding on a one-ply step and jumping on a longer move.
 */
export class RowScroller {
  readonly #box      : HTMLElement
  readonly #observer : ResizeObserver
  #boxHeight         = 0
  #max               = 0
  #rowHeight         = 0
  #rows?             : Element
  #to?               : number
  #want?             : number

  /**
   * Takes the box the rows scroll in, measuring it whenever it resizes.
   */
  constructor(box: HTMLElement) {
    this.#box      = box
    this.#observer = new ResizeObserver(() => {
      this.measure()
    })
    this.#observer.observe(box)
  }

  /**
   * Stops measuring the box and its rows, as the list leaves the page.
   */
  dispose(): void {
    this.#observer.disconnect()
  }

  /**
   * Measures the box and its first row and shows the row last asked for again,
   * measuring nothing while the box holds no row or has no height, as it has
   * before its first layout and while it is hidden.
   */
  measure(): void {
    const row = this.#box.querySelector('[role="row"]')
    if (!this.#box.clientHeight || !row) return
    this.#rowHeight = row.getBoundingClientRect().height
    this.#boxHeight = this.#box.clientHeight
    this.#max       = Math.max(0, this.#box.scrollHeight - this.#boxHeight)
    this.#to        = undefined
    if (this.#want !== undefined) this.show(this.#want, false)
  }

  /**
   * Scrolls the box to keep row `index` a third of the way down it.
   *
   * Args:
   *   index : The row to show, counted from the list's first.
   *   glide : Whether the box glides there rather than jumping.
   */
  show(index: number, glide: boolean): void {
    this.#want = index
    if (!this.#rowHeight) return
    const at = clamp(index * this.#rowHeight - this.#boxHeight / 3, 0, this.#max)
    const to = at < this.#max ? Math.round(at / this.#rowHeight) * this.#rowHeight : Math.round(at)
    if (to === this.#to) return
    this.#to = to
    this.#box.scrollTo({ behavior: glide ? 'smooth' : 'auto', top: to })
  }

  /**
   * Takes a new list of rows into the box, clearing what was measured of the
   * last and measuring the new one once the browser lays it out, so loading a
   * game forces no layout of its own.
   */
  watch(rows: Element): void {
    this.#rowHeight = 0
    this.#to        = undefined
    if (this.#rows) this.#observer.unobserve(this.#rows)
    this.#rows = rows
    this.#observer.observe(rows)
  }
}
