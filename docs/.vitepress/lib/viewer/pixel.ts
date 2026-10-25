/**
 * Keeps a row of buttons on whole device pixels by clearing the widths it set
 * before, widening each button its content sizes to a whole device pixel,
 * leaving a button the row stretches to fill its column as it is, and moving
 * the row by the fraction of a device pixel it sits off, so every outline stays
 * sharp and the row's width follows its column. A row reads its layout here
 * only, which runs when the row or its column resizes.
 *
 * Args:
 *   row   : The row of buttons.
 *   ratio : The device pixels in one CSS pixel.
 */
export function snapRow(row: HTMLElement, ratio: number): void {
  const buttons = [...row.querySelectorAll('button')]
  for (const button of buttons) button.style.minWidth = ''
  row.style.translate = ''
  const sized         = buttons.map(button => getComputedStyle(button).flexGrow === '0')
  const widths        = buttons.map(button => button.getBoundingClientRect().width)
  for (const [at, button] of buttons.entries()) {
    const whole = Math.ceil(widths[at]! * ratio - 0.01) / ratio
    if (sized[at] && whole - widths[at]! > 0.001) button.style.minWidth = `${whole}px`
  }
  const left = row.getBoundingClientRect().left
  const by   = Math.round(left * ratio) / ratio - left
  if (Math.abs(by) > 0.001) row.style.translate = `${by.toFixed(3)}px 0`
}
