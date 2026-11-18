/**
 * The ring a Viewer control draws in the run's color while it holds keyboard
 * focus.
 */
export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-run'
/**
 * The small capitals heading a part of the Viewer.
 */
export const KICKER = 'm-0 inline-flex items-center gap-[7px] font-code text-[0.64rem]/[16px] font-medium '
                    + 'tracking-[0.12em] text-quiet uppercase'
/**
 * The raised pill a Viewer button sits on, outlined in the run's color while
 * the pointer rests on it and filled with the tint while it is pressed.
 */
export const PILL = 'inline-flex cursor-pointer items-center rounded-[999px] border border-rule bg-raised '
                  + 'py-0 text-ink hover:border-run aria-pressed:border-run aria-pressed:bg-tint '
                  + 'aria-pressed:[box-shadow:inset_0_0_0_1px_var(--sc-run)]'
/**
 * The fill of a board's square for each of its two shades, mixed toward the
 * ink where the two boards differ on it.
 */
export const SHADES = {
  dark  : 'fill-primary data-differ:fill-[color-mix(in_oklab,var(--sc-primary)_55%,var(--sc-ink))]',
  light : 'fill-light data-differ:fill-[color-mix(in_oklab,var(--sc-light)_55%,var(--sc-ink))]'
} as const
/**
 * A Viewer chip, a pill naming an action in the code face's capitals, beside
 * its icon where it carries one.
 */
export const CHIP = `${PILL} ${FOCUS} h-[34px] gap-[7px] px-[13px] font-code text-[0.64rem]/none `
                  + 'font-semibold tracking-[0.1em] whitespace-nowrap uppercase '
                  + 'transition-[border-color,background-color] has-[svg]:pl-[11px]'
