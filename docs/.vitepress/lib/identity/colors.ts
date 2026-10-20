import { clamp } from '@vueuse/core'

type Lab = readonly [number, number, number]
type Rgb = readonly [number, number, number]

/**
 * The spaces a mix runs in, as `color-mix()` names them.
 */
type Space = 'oklab' | 'srgb'

function channels(hex: string): Rgb {
  const value = /^#([0-9a-f]{6})$/iu.exec(hex)?.[1]
  if (value === undefined) throw new Error(`${hex} is not six hexadecimal digits behind a #`)
  return [0, 2, 4].map(at => Number.parseInt(value.slice(at, at + 2), 16) / 255) as unknown as Rgb
}

function fromChannels(rgb: Rgb): string {
  return `#${rgb.map(channel => byteHex(channel)).join('')}`
}

function fromOklab([lightness, a, b]: Lab): Rgb {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ]
}

function gamma(channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055
}

function linear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function linearOf(hex: string): Rgb {
  return channels(hex).map(channel => linear(channel)) as unknown as Rgb
}

/**
 * Converts linear sRGB to OKLab, per Björn Ottosson's reference matrices.
 */
function oklab([r, g, b]: Rgb): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

/**
 * Writes a share between 0 and 1 as the two hexadecimal digits of a byte, such
 * as `80` for 0.5, a share past either end held at that end.
 */
export function byteHex(share: number): string {
  return Math.round(clamp(share, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')
}

/**
 * Measures the contrast ratio between two colors as WCAG 2.2 defines it, the
 * lighter luminance plus 0.05 over the darker luminance plus 0.05.
 */
export function contrast(first: string, second: string): number {
  const luminances = [luminance(first), luminance(second)]
  return (Math.max(...luminances) + 0.05) / (Math.min(...luminances) + 0.05)
}

/**
 * Reads a color's relative luminance, the weighted sum of its linear channels
 * WCAG 2.2 defines its contrast ratio on.
 */
export function luminance(hex: string): number {
  const [r, g, b] = linearOf(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Mixes two colors the way `color-mix()` does, taking `share` percent of the
 * first and the rest of the second, interpolated in OKLab or in gamma-encoded
 * sRGB and clipped back into the sRGB gamut.
 *
 * Args:
 *   first  : The color `share` weighs.
 *   share  : The percentage of `first` in the mix.
 *   second : The color the rest of the mix takes.
 *   space  : The space the two are interpolated in.
 */
export function mix(first: string, share: number, second: string, space: Space = 'oklab'): string {
  const weight = share / 100
  const blend  = <T extends readonly number[]>(a: T, b: T): T =>
    a.map((value, index) => value * weight + b[index]! * (1 - weight)) as unknown as T

  if (space === 'srgb') return fromChannels(blend(channels(first), channels(second)))

  const [a, b] = [first, second].map(hex => oklab(linearOf(hex)))
  return fromChannels(fromOklab(blend(a!, b!)).map(channel => gamma(channel)) as unknown as Rgb)
}
