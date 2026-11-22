/**
 * The squares in the order a reader sees them, from a8 across to h8 and down to
 * h1, which the grids of squares and of washes lay out in.
 */
export const readingOrder = Array.from({ length: 64 }, (_, at) => (7 - Math.floor(at / 8)) * 8 + at % 8)
