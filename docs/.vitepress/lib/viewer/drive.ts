import { usePreferredReducedMotion } from '@vueuse/core'
import { type ShallowRef, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

import { type Address, useAddress } from './address.ts'
import { FLIP, controlOf, idle }    from './controls.ts'
import type { GameBoard, Reach }    from './gameboard.ts'
import { PARTIES, type Party }      from './loaded.ts'
import { moveTo }                   from './placements.ts'
import type { Viewer }              from './state.ts'

/**
 * The Viewer's drive: the page's address, the refs its parts bind to, and the
 * call answering a key pressed inside the tool.
 */
export interface Drive extends Address {
  answer : (event: KeyboardEvent) => void
  parts  : Parts
}

/**
 * A board's figure as the Viewer reaches it once it mounts.
 */
interface Figure {
  board? : GameBoard
}

/**
 * A part the Viewer paints on each step once it has taken a loaded match.
 */
export interface Painted {
  load  : () => void
  paint : (cursor: number, glide: boolean) => void
}

/**
 * The refs the Viewer's parts bind to, each filled once its part mounts: the
 * sheets, the tool's root, the two boards' figures, and the track.
 */
export interface Parts {
  ledger    : ShallowRef<Painted | undefined>
  root      : ShallowRef<HTMLElement | null>
  stored    : ShallowRef<Figure | undefined>
  submitted : ShallowRef<Figure | undefined>
  track     : ShallowRef<Painted | undefined>
}

/**
 * Answers a key pressed inside the tool: F turns the boards, the keys each
 * control names step the cursor, and Up and Down move a row of the sheets while
 * focus sits on a move there, focus then moving to the move the cursor lands
 * on. A key the track already answered, a key pressed with a modifier, and a
 * key pressed inside a field pass through untouched.
 */
function answerKey(event: KeyboardEvent, viewer: Viewer): void {
  const target = event.target as HTMLElement
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
  if (target.matches('input, select, textarea')) return
  const move    = target.closest<HTMLElement>('.sc-viewer-move')
  const row     = { ArrowDown: 2, ArrowUp: -2 }[event.key]
  const control = controlOf(event.key)
  const flips   = FLIP.keys.includes(event.key.toLowerCase())
  if (flips) viewer.turn(viewer.facing.value === 'white' ? 'black' : 'white')
  else if (move && row) viewer.go(viewer.cursor.value + row)
  else if (control && !idle(control, viewer.cursor.value, viewer.loaded.value)) {
    viewer.go(control.to(viewer.loaded.value, viewer.cursor.value))
  } else return
  event.preventDefault()
  if (move) void nextTick(() => {
    refocus(move)
  })
}

/**
 * Marks the tool's root with whether the boards share a position at the cursor
 * and whether a stored game matched, and with how long the boards' moves take
 * to land, which the stylesheet times the sheets' motion by.
 */
function markRoot(root: HTMLElement, motion: number, viewer: Viewer): void {
  const step = `${Math.round(motion)}ms`
  Object.assign(root.dataset, marksOf(viewer))
  if (root.style.getPropertyValue('--sc-viewer-step') === step) return
  root.style.setProperty('--sc-viewer-step', step)
}

/**
 * Turns each board to the side it faces, moves it to the cursor, marks the move
 * reaching its ply, and at the last position the two share draws both games'
 * next moves on both boards.
 *
 * Returns:
 *   How many milliseconds from now the boards' moves take to land.
 */
function moveBoards(figures: Pick<Parts, Party>, reach: Reach, viewer: Viewer): number {
  const [cursor, loaded] = [viewer.cursor.value, viewer.loaded.value]
  const partings         = cursor === loaded.shared?.last ? loaded.partings : {}
  let motion             = 0
  for (const party of PARTIES) {
    const board = figures[party].value?.board
    const side  = loaded.sideOf(party)
    if (!board) continue
    board.turn(viewer.facing.value)
    board.point(partings)
    if (!side) continue
    const ply = loaded.plyOf(party, cursor)
    motion    = Math.max(motion, board.go(ply, reach))
    board.mark(moveTo(side.placements, ply))
  }
  return motion
}

/**
 * Moves focus from a move in the sheets to the move the cursor now stands on in
 * the same game's column, so the keys that step the cursor walk the sheets as
 * the grid pattern sets.
 */
function refocus(from: HTMLElement): void {
  from.closest('[role="grid"]')
    ?.querySelector<HTMLElement>(`.sc-viewer-move[data-party='${from.dataset.party}'][aria-current='step']`)
    ?.focus({ preventScroll: true })
}

/**
 * Marks the squares the boards differ on at the cursor while the reader hovers
 * or focuses their count, once a step's moves land, and clears them once the
 * reader leaves the count.
 *
 * Returns:
 *   The call marking the squares once `delay` milliseconds have passed.
 */
function useDiffers(figures: Pick<Parts, Party>, viewer: Viewer): (delay: number) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const mark = (delay: number): void => {
    const squares = viewer.showing.value ? viewer.loaded.value.differing(viewer.cursor.value) : []
    clearTimeout(timer)
    timer = setTimeout(() => {
      for (const party of PARTIES) figures[party].value?.board?.differ(squares)
    }, delay)
  }
  watch(viewer.showing, () => {
    mark(0)
  })
  onBeforeUnmount(() => clearTimeout(timer))
  return mark
}

/**
 * Reads the marks the tool's root carries at the Viewer's cursor: whether a
 * stored game matched and whether the boards share a position there.
 */
export function marksOf({ cursor, loaded }: Viewer): { matched: 'no' | 'yes', shared: 'no' | 'yes' } {
  return {
    matched : loaded.value.match.stored ? 'yes' : 'no',
    shared  : loaded.value.sharing(cursor.value) ? 'yes' : 'no'
  }
}

/**
 * Drives the Viewer's parts from its state. Each load and each step moves the
 * boards, marks the root with whether the boards share a position, and paints
 * the sheets and the track, gliding on a step unless the reader prefers reduced
 * motion, then rewrites the page's address once the boards' moves land. The
 * Viewer opens on the match a link's fragment carries where the page was
 * reached through one.
 */
export function useDrive(viewer: Viewer): Drive {
  const reduced      = usePreferredReducedMotion()
  const address      = useAddress(viewer)
  const parts: Parts = {
    ledger    : shallowRef(),
    root      : shallowRef(null),
    stored    : shallowRef(),
    submitted : shallowRef(),
    track     : shallowRef()
  }
  const differ = useDiffers(parts, viewer)

  const drive = (fresh: boolean): void => {
    const loaded = viewer.loaded.value
    const cursor = viewer.cursor.value
    const reach  = reduced.value === 'reduce' ? 'still' : fresh ? 'jump' : 'glide'
    if (fresh) {
      for (const party of PARTIES) parts[party].value?.board?.load(loaded.sideOf(party))
      parts.ledger.value?.load()
      parts.track.value?.load()
      void address.carry(loaded)
    }
    const motion = moveBoards(parts, reach, viewer)
    markRoot(parts.root.value!, motion, viewer)
    parts.ledger.value?.paint(cursor, reach === 'glide')
    parts.track.value?.paint(cursor, reach === 'glide')
    address.settle(motion)
    differ(motion)
  }

  watch([viewer.loaded, viewer.cursor, viewer.facing], ([loaded], [was]) => {
    drive(loaded !== was)
  }, { flush: 'post' })
  onMounted(() => {
    drive(true)
    void address.open()
  })

  return {
    ...address,
    parts: parts,

    answer: event => {
      answerKey(event, viewer)
    }
  }
}
