import { type Loaded, PARTIES, type Party } from './loaded.ts'
import { RowScroller }                      from './scroller.ts'
import { type Sheet, rowAt }                from './sheet.ts'
import { Threads }                          from './threads.ts'

/**
 * The parts of the drawn sheets the marker reads and writes: the box the rows
 * scroll in, the list of rows, and the picture of the threads over the gutter.
 */
export interface Drawn {
  box  : HTMLElement
  rows : HTMLElement
  svg  : SVGSVGElement
}

/**
 * Draws the two threads and the run's band into the gutter's picture, hiding
 * the band where the two games share no position.
 */
function drawThreads(svg: SVGSVGElement, threads: Threads): void {
  for (const party of PARTIES) {
    svg.querySelector(`.sc-viewer-thread[data-game='${party}']`)!.setAttribute('d', threads.pathOf(party))
  }
  const band = svg.querySelector('.sc-viewer-bar')!
  const area = threads.band
  band.setAttribute('opacity', area ? '1' : '0')
  for (const [name, value] of Object.entries(area ?? {})) band.setAttribute(name, String(value))
}

/**
 * Marks the cursor on the two score sheets once a match's rows are drawn. The
 * moves reaching it take `aria-current` and the one tab stop, the row holding
 * them is lit and kept a third of the way down the box, and each game's ring
 * moves along its thread down the gutter. A move the two games played in
 * another order is outlined beside its twin, one pair at a time, the pair at
 * the cursor's move unless the pointer or focus rests on another move. It lays
 * the threads out again whenever the box resizes.
 */
export class SheetMarker {
  readonly #abort    = new AbortController()
  readonly #drawn    : Drawn
  readonly #observer : ResizeObserver
  readonly #scroller : RowScroller
  #cells             : Record<Party, HTMLElement[]> = { stored: [], submitted: [] }
  #current           : HTMLElement[] = []
  #cursor            = 0
  #held?             : HTMLElement
  #hovered           = false
  #lit?              : HTMLElement
  #shown?            : { loaded: Loaded, sheet: Sheet }
  #threads?          : Threads
  #twinned           : HTMLElement[] = []
  #twinOf            = new Map<HTMLElement, HTMLElement>()

  /**
   * Takes the drawn sheets, laying the threads out again whenever their box
   * resizes and outlining the pair under the pointer or focus.
   */
  constructor(drawn: Drawn) {
    this.#drawn    = drawn
    this.#scroller = new RowScroller(drawn.box)
    this.#observer = new ResizeObserver(() => {
      this.layout()
    })
    this.#observer.observe(drawn.box)
    this.#listen()
  }

  /**
   * Stops measuring the box and its rows and answering the pointer and focus,
   * as the sheets leave the page.
   */
  dispose(): void {
    this.#abort.abort()
    this.#observer.disconnect()
    this.#scroller.dispose()
  }

  /**
   * Measures the gutter and the first row and draws the threads and the run's
   * band to them, measuring nothing before a match loads or while no row has a
   * height, as before the first layout and while the sheets are hidden.
   */
  layout(): void {
    const { rows, svg } = this.#drawn
    const first         = rows.querySelector<HTMLElement>('[role="row"]')
    const gutter        = first?.querySelector<HTMLElement>('.sc-viewer-gutter')
    if (!this.#shown || !first?.offsetHeight || !gutter) return
    const { loaded, sheet } = this.#shown
    this.#threads           = new Threads({
      first : sheet.first,
      left  : gutter.offsetLeft,
      row   : first.offsetHeight,
      top   : sheet.rows[0]?.index ?? 0,
      width : gutter.offsetWidth
    }, loaded)
    svg.setAttribute('viewBox', `0 0 ${rows.offsetWidth} ${rows.offsetHeight}`)
    Object.assign(svg.style, { height: `${rows.offsetHeight}px`, width: `${rows.offsetWidth}px` })
    drawThreads(svg, this.#threads)
    this.#ring(false)
  }

  /**
   * Takes a match's newly drawn rows, collecting each game's moves in order,
   * each move's twin, and the marks the rows were drawn with, and lays the
   * threads out over them.
   */
  load(loaded: Loaded, sheet: Sheet): void {
    const rows  = this.#drawn.rows
    this.#cells = Object.fromEntries(PARTIES.map(party => [
      party,
      [...rows.querySelectorAll<HTMLElement>(`[data-party='${party}']`)]
    ])) as Record<Party, HTMLElement[]>
    this.#current = [...rows.querySelectorAll<HTMLElement>('[aria-current]')]
    this.#lit     = rows.querySelector<HTMLElement>('[data-at]') ?? undefined
    this.#shown   = { loaded, sheet }
    this.#threads = undefined
    this.#twinned = [...rows.querySelectorAll<HTMLElement>('[data-twin]')]
    this.#twinOf  = new Map(loaded.pairs.flatMap(({ stored, submitted }) => {
      const twin = this.#cells.stored[loaded.plyOf('stored', stored) - 1]!
      const pair = [this.#cells.submitted[submitted - 1]!, twin]
      return [pair, pair.toReversed()] as [HTMLElement, HTMLElement][]
    }))
    this.#scroller.watch(rows)
    this.layout()
  }

  /**
   * Marks the move reaching `cursor` in each game as the current step, leaving
   * the submitted game's first move the tab stop where neither game reaches it,
   * lights the row holding them, and moves the rings.
   *
   * Args:
   *   cursor : The ply of the submitted game the boards show.
   *   glide  : Whether the box and the rings glide there rather than jumping.
   */
  paint(cursor: number, glide: boolean): void {
    if (!this.#shown) return
    const { loaded, sheet } = this.#shown
    const now               = PARTIES.flatMap(party => {
      const at = loaded.sideOf(party) && this.#cells[party][loaded.plyOf(party, cursor) - 1]
      return at ? [at] : []
    })
    for (const cell of this.#current.filter(stale => !now.includes(stale))) {
      cell.removeAttribute('aria-current')
      cell.tabIndex = -1
    }
    for (const cell of now) {
      cell.setAttribute('aria-current', 'step')
      cell.tabIndex = 0
    }
    if (now.length === 0 && this.#cells.submitted[0]) this.#cells.submitted[0].tabIndex = 0
    const index = rowAt(cursor, sheet.first) - (sheet.rows[0]?.index ?? 0)
    const lit   = this.#drawn.rows.children[index] as HTMLElement | undefined
    if (this.#lit && lit !== this.#lit) delete this.#lit.dataset.at
    if (lit) lit.dataset.at = ''
    this.#current = now
    this.#cursor  = cursor
    this.#held    = this.#cells.submitted[loaded.plyOf('submitted', cursor) - 1]
    this.#lit     = lit
    this.#scroller.show(Math.max(0, index), glide)
    this.#ring(glide)
    if (!this.#hovered) this.#pair(this.#held)
  }

  /**
   * Outlines the move the pointer or focus rests on beside its twin, or no pair
   * where that move has none, and the pair at the cursor's move again once the
   * pointer leaves the sheets or focus leaves a move.
   */
  #listen(): void {
    const options = { signal: this.#abort.signal }
    const enter   = (event: Event): void => {
      const move = (event.target as Element).closest<HTMLElement>('.sc-viewer-move')
      if (!move) return
      this.#hovered = true
      this.#pair(move)
    }
    const leave = (): void => {
      this.#hovered = false
      this.#pair(this.#held)
    }
    this.#drawn.rows.addEventListener('focusin', enter, options)
    this.#drawn.rows.addEventListener('pointerover', enter, options)
    this.#drawn.rows.addEventListener('focusout', leave, options)
    this.#drawn.rows.addEventListener('pointerleave', leave, options)
  }

  /**
   * Outlines a move beside its twin, clearing the pair outlined before, or
   * outlines nothing where the move has no twin.
   */
  #pair(move?: HTMLElement): void {
    const twin = move && this.#twinOf.get(move)
    const now  = twin ? [move, twin] : []
    for (const cell of this.#twinned.filter(was => !now.includes(was))) delete cell.dataset.twin
    for (const cell of now.filter(fresh => !this.#twinned.includes(fresh))) cell.dataset.twin = ''
    this.#twinned = now
  }

  /**
   * Moves each game's ring to where its thread passes the cursor, hiding the
   * ring of a game holding no position there.
   */
  #ring(glide: boolean): void {
    if (!this.#threads || !this.#shown) return
    const rings = this.#drawn.svg.querySelector<SVGGElement>('.sc-viewer-rings')!
    rings.classList.toggle('sc-viewer-gliding', glide)
    for (const party of PARTIES) {
      const ring           = rings.querySelector<SVGGElement>(`[data-game='${party}']`)!
      const { x, y }       = this.#threads.ringAt(party, this.#cursor)
      ring.style.transform = `translate(${x}px, ${y}px)`
      ring.style.opacity   = this.#shown.loaded.has(party, this.#cursor) ? '' : '0'
    }
  }
}
