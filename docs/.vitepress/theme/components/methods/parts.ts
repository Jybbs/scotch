/**
 * A step button, a pill in the run's color, filled while it plays and quieted
 * while it goes nowhere.
 */
export const BUTTON = [
  'h-[26px] cursor-pointer rounded-[999px] border border-rule bg-raised px-3 py-0 font-code',
  'text-[0.6rem]/[24px] font-semibold tracking-[0.1em] text-run uppercase duration-move ease-glide',
  'transition-[border-color,background-color,color] hover:border-run disabled:cursor-default',
  'disabled:border-rule disabled:text-quiet aria-pressed:border-run aria-pressed:bg-run',
  'aria-pressed:text-page focus-ring'
]
/**
 * The widget's card: the controls and status over the timeline, the board
 * beside the list of plies, and the key beneath the board, stacked in one
 * column on a narrow screen, each part of it carrying a game's color by its
 * `data-game`, `data-cell`, or `data-kind`.
 */
export const CARD = [
  'grid grid-cols-[minmax(0,3fr)_minmax(0,5fr)] items-start gap-x-6 gap-y-4 rounded-md border border-rule',
  'bg-page p-4 [grid-template-areas:"controls_status"_"lanes_cells"_"._ruler"_"board_plies"_"key_note"]',
  'max-sm:grid-cols-[minmax(0,1fr)]',
  'max-sm:[grid-template-areas:"controls"_"status"_"lanes"_"cells"_"ruler"_"board"_"key"_"note"_"plies"]',
  '[&_:is([data-game=submitted],[data-cell=submitted],[data-kind=submitted])]:[--sc-run-game:var(--sc-submitted)]',
  '[&_:is([data-game=stored],[data-cell=stored],[data-kind=stored])]:[--sc-run-game:var(--sc-stored)]'
]
/**
 * A cell of the timeline, quiet at the start, in the run's color through the
 * run, and in its game's color in its game's lane.
 */
export const CELL = [
  'rounded-xs data-[cell=run]:bg-[color-mix(in_oklab,var(--sc-run)_70%,var(--sc-page))]',
  'data-[cell=start]:bg-[color-mix(in_oklab,var(--sc-quiet)_28%,var(--sc-page))]',
  '[&:is([data-cell=submitted],[data-cell=stored])]:bg-(--sc-run-game)'
]
/**
 * The timeline's grid, a column per ply across two lanes.
 */
export const CELLS = 'relative grid grid-cols-[repeat(var(--sc-run-cells),minmax(0,1fr))] grid-rows-[10px_10px] '
                   + 'gap-x-(--sc-run-gap) gap-y-[3px] [grid-area:cells]'
/**
 * The columns the heads and the list of plies share.
 */
const COLUMNS = 'grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)]'
/**
 * The row of buttons stepping the widget.
 */
export const CONTROLS = 'flex flex-wrap items-center gap-2 [grid-area:controls]'
/**
 * The head of a column naming a game, opened by a swatch in its game's color.
 */
export const GAME_HEAD = 'flex items-center gap-2 py-0 pr-2 pl-3 before:size-2 before:flex-none '
                       + 'before:rounded-xs before:bg-(--sc-run-game)'
/**
 * The ring over the timeline's cell at the ply in view, a cell wide.
 */
export const HEAD = 'pointer-events-none absolute -top-1 -bottom-1 left-0 rounded-sm will-change-transform '
                  + 'w-[calc((100%_-_(var(--sc-run-cells)_-_1)_*_var(--sc-run-gap))_/_var(--sc-run-cells))] '
                  + '[box-shadow:0_0_0_2px_var(--sc-ink)]'
/**
 * A lane's name, set before a swatch in its game's color.
 */
export const LANE = 'flex items-center justify-end gap-2 font-code text-[0.56rem]/[10px] font-medium '
                  + 'tracking-[0.1em] text-quiet uppercase after:size-2 after:flex-none after:rounded-xs '
                  + 'after:bg-(--sc-run-game)'
/**
 * The two lanes' names, beside the timeline's two rows.
 */
export const LANES = 'grid grid-rows-[10px_10px] gap-y-[3px] justify-self-end [grid-area:lanes] '
                   + 'max-sm:justify-self-start'
/**
 * The mark naming where the run meets or parts, a pill at the end of its
 * move.
 */
export const MARK = 'ml-auto rounded-[999px] px-1.5 text-[0.48rem]/[14px] tracking-[0.1em] text-run uppercase '
                  + '[box-shadow:inset_0_0_0_1px_var(--sc-run)]'
/**
 * A move in a row of plies, barred in its game's color, or the run's, past the
 * starting position.
 */
export const MOVE = 'flex items-center gap-2 border-b border-[color-mix(in_oklab,var(--sc-rule)_60%,transparent)] '
                  + 'pr-2 pl-3 tabular-nums whitespace-nowrap [&_[data-start]]:text-(--sc-run-game) '
                  + 'not-in-data-[cell=start]:[box-shadow:inset_3px_0_0_var(--sc-run-game)]'
/**
 * The sentence next to the key.
 */
export const NOTE = 'm-0! font-body text-[0.8125rem]/[20px]! font-normal text-quiet [grid-area:note]'
/**
 * A row of the list of plies, tinted through the run and darker at the ply in
 * view, its moves barred in the run's color through the run.
 */
export const OPTION = [
  'col-span-full grid cursor-pointer grid-cols-subgrid data-[cell=run]:bg-tint',
  'data-at:bg-[color-mix(in_oklab,var(--sc-ink)_9%,var(--sc-page))]',
  'data-at:data-[cell=run]:bg-[color-mix(in_oklab,var(--sc-run)_26%,var(--sc-page))]',
  'data-[cell=run]:[&_[data-game]]:[--sc-run-game:var(--sc-run)]'
]
/**
 * The heads over the list of plies, beside the list, filling the height of
 * the board on a wide screen and a fixed height on a narrow one.
 */
export const PLIES = 'grid grid-rows-[auto_minmax(0,1fr)] self-stretch [contain:size] [grid-area:plies] '
                   + 'max-sm:h-60 max-sm:[contain:none]'
/**
 * The ply's number opening a row of plies, set in the ink while the row is
 * the one shown.
 */
export const PLY = 'flex items-center justify-end gap-2 border-b '
                 + 'border-[color-mix(in_oklab,var(--sc-rule)_60%,transparent)] px-2 text-quiet tabular-nums '
                 + 'whitespace-nowrap in-data-at:font-bold in-data-at:text-ink'
/**
 * The head of the column of ply numbers.
 */
export const PLY_HEAD = 'flex items-center justify-end gap-2 px-2 font-code text-[0.56rem]/[24px] font-medium '
                      + 'tracking-[0.1em] text-quiet uppercase'
/**
 * The labels under the timeline, a column per ply, the last ending where its
 * column ends.
 */
export const RULER = '-mt-3 grid h-3 grid-cols-[repeat(var(--sc-run-cells),minmax(0,1fr))] gap-x-(--sc-run-gap) '
                   + 'font-code text-[0.54rem]/[12px] font-medium tracking-[0.08em] text-quiet uppercase '
                   + '[grid-area:ruler] [&_span]:whitespace-nowrap [&_[data-end]]:justify-self-end'
/**
 * The line naming the ply in view, cut at its column's edge.
 */
export const STATUS = 'self-center justify-self-stretch overflow-hidden text-right font-code '
                    + 'text-[0.62rem]/[16px] font-medium tracking-[0.1em] whitespace-nowrap text-quiet uppercase '
                    + '[grid-area:status] max-sm:text-left'
/**
 * The heads over the list of plies, ruled above and below.
 */
export const HEADS = `${COLUMNS} border-t-[1.5px] border-b border-ink font-body text-[0.76rem]/[24px] `
                   + 'font-semibold'
/**
 * The list of plies, scrolling inside its own height.
 */
export const LIST = `${COLUMNS} relative auto-rows-[26px] content-start overflow-auto overscroll-contain `
                  + 'font-code text-[0.74rem]/[normal] font-normal [scrollbar-width:thin] focus-ring'
