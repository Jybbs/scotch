/**
 * The label of a chart's axes, in the code face.
 */
export const AXIS = 'fill-(--sc-data-quiet) font-code text-[0.65rem] font-medium tracking-[0.06em] '
                  + 'tabular-nums'
/**
 * A list with no margin, start padding, or marker, and no margin on its rows,
 * each marked important past the doc column's list rules.
 */
export const BARE = 'm-0! list-none! p-0! *:m-0!'
/**
 * A figure in the display face set at the size the plate's head sets it.
 */
export const BIG = 'min-w-[3.2em] font-display text-[2rem]/[32px] font-normal whitespace-nowrap lining-nums '
                 + 'tabular-nums'
/**
 * The chart a plate holds, ringed in the link's color while it holds the
 * focus.
 */
export const CHART = 'relative min-w-0 outline-offset-4 focus-visible:outline-2 '
                   + 'focus-visible:outline-(--sc-data-link)'
/**
 * The colors every Data widget draws in, each read from the identity and
 * open to a widget or a page setting its own.
 */
export const DATA = [
  '[--sc-data-draw:var(--sc-series-1)] [--sc-data-ink:var(--sc-ink)] [--sc-data-link:var(--sc-run)]',
  '[--sc-data-page:var(--sc-page)] [--sc-data-quiet:var(--sc-quiet)] [--sc-data-rule:var(--sc-rule)]',
  '[--sc-data-fill:color-mix(in_oklab,var(--sc-data-ink)_42%,var(--sc-data-page))]',
  '[--sc-data-hairline:1px_solid_color-mix(in_oklab,var(--sc-data-rule)_70%,transparent)]',
  '[--sc-data-tint:color-mix(in_oklab,var(--sc-data-link)_14%,var(--sc-data-page))]'
]
/**
 * The fade a part of a chart takes on and off, its depth set beside it.
 */
export const FADE = 'transition-opacity duration-settle ease-glide'
/**
 * The figure and its sentence heading a plate, stacked on a narrow screen.
 */
export const HEAD = 'grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 '
                  + 'max-sm:grid-cols-[minmax(0,1fr)] max-sm:gap-y-1'
/**
 * The sentence a plate's figure reads as.
 */
export const SAY = 'm-0! min-h-10 max-w-[60ch] font-body text-[0.8125rem]/[20px]! font-normal'
/**
 * A chart's drawing, its marks free to draw past its box.
 */
export const SVG = 'block overflow-visible'
/**
 * The fade of a part of a chart while a corner mark other than its own is lit.
 */
export const DIM = [FADE, 'data-off:opacity-22']
/**
 * The list of the files behind a count, in columns scrolling inside their own
 * height, each file's name ruled beneath and its count at its end.
 */
export const FILES = [
  BARE,
  'grid max-h-64 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-5 overflow-y-auto font-code',
  'text-[0.65rem]/[22px] font-medium tabular-nums *:flex *:justify-between *:gap-3',
  '*:[border-bottom:var(--sc-data-hairline)]'
]
/**
 * The card every Data widget sits on, clear of the front page's backdrop
 * unless the reader asks for less transparency.
 */
export const PLATE = [
  DATA,
  'relative grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-md border border-rule bg-page p-4',
  'text-(--sc-data-ink) in-[.VPHome_[data-entry]]:bg-transparent in-[.VPHome_[data-entry]]:opaque:bg-page'
]
