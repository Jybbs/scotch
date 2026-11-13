/**
 * A GIF read back frame by frame: its screen's size, whether it loops, and
 * each frame as the RGB bytes the screen shows once it is drawn, beside the
 * delay it holds for in milliseconds and the size of the rectangle it stores.
 */
interface Decoded {
  delays : number[]
  frames : Uint8Array[]
  height : number
  loops  : boolean
  sizes  : [number, number][]
  width  : number
}

/**
 * Reads the run of sub-blocks starting at `at` into one buffer, returning it
 * beside the offset past the block that ends the run.
 */
function blocksAt(bytes: Buffer, at: number): [Buffer, number] {
  const parts = [] as Buffer[]
  let next = at
  for (; bytes[next]; next += bytes[next]! + 1) parts.push(bytes.subarray(next + 1, next + 1 + bytes[next]!))
  return [Buffer.concat(parts), next + 1]
}

/**
 * Decodes a GIF's LZW codes back into palette indices, growing the code size
 * once the table reaches the next power of two, as a browser's decoder does.
 */
export function unlzw(data: Uint8Array, start: number): number[] {
  const clear = 1 << start
  const out   = [] as number[]
  let table    = [] as number[][]
  let previous = undefined as number[] | undefined
  let size     = start + 1
  let [held, bits, at] = [0, 0, 0]
  const reset = (): void => {
    table    = Array.from({ length: clear + 2 }, (_, code) => [code])
    previous = undefined
    size     = start + 1
  }
  reset()
  for (;;) {
    for (; bits < size; bits += 8) held |= (data[at++] ?? 0) << bits
    const code = held & ((1 << size) - 1)
    ;[held, bits] = [held >>> size, bits - size]
    if (code === clear) reset()
    if (code === clear) continue
    if (code === clear + 1) return out
    const entry = table[code] ?? [...previous!, previous![0]!]
    if (previous && table.length < 4096) table.push([...previous, entry[0]!])
    if (table.length >= 1 << size && size < 12) size++
    out.push(...entry)
    previous = entry
  }
}

/**
 * Reads a GIF with one global palette, drawing each frame over the frames
 * before it and leaving each pixel its transparent index covers as it was.
 */
export function decoded(gif: Uint8Array): Decoded {
  const bytes   = Buffer.from(gif)
  const width   = bytes.readUInt16LE(6)
  const height  = bytes.readUInt16LE(8)
  const palette = bytes.subarray(13, 13 + 3 * 2 ** ((bytes[10]! & 7) + 1))
  const screen  = new Uint8Array(3 * width * height)
  const result: Decoded = { delays: [], frames: [], height, loops: false, sizes: [], width }
  let [at, delay, clear] = [13 + palette.length, 0, -1]
  while (bytes[at] !== 0x3b) {
    if (bytes[at] === 0x21) {
      if (bytes[at + 1] === 0xf9) {
        delay = 10 * bytes.readUInt16LE(at + 4)
        clear = bytes[at + 3]! & 1 ? bytes[at + 6]! : -1
      }
      if (bytes.toString('ascii', at + 3, at + 14) === 'NETSCAPE2.0') result.loops = true
      at = blocksAt(bytes, at + 2)[1]
      continue
    }
    const [left, top]  = [bytes.readUInt16LE(at + 1), bytes.readUInt16LE(at + 3)]
    const [w, h]       = [bytes.readUInt16LE(at + 5), bytes.readUInt16LE(at + 7)]
    const [data, next] = blocksAt(bytes, at + 11)
    for (const [place, index] of unlzw(data, bytes[at + 10]!).entries()) {
      const pixel = 3 * ((top + Math.floor(place / w)) * width + left + (place % w))
      if (index !== clear) screen.set(palette.subarray(3 * index, 3 * index + 3), pixel)
    }
    result.frames.push(screen.slice())
    result.sizes.push([w, h])
    result.delays.push(delay)
    at = next
  }
  return result
}
