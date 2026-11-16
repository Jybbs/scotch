/**
 * The part of gifenc's encoder the README's preview writes through, which the
 * package ships without types.
 */
declare module 'gifenc' {
  interface FrameOptions {
    delay?            : number
    dispose?          : number
    first?            : boolean
    palette?          : readonly (readonly number[])[]
    transparent?      : boolean
    transparentIndex? : number
  }

  interface Encoder {
    bytes()     : Uint8Array
    bytesView() : Uint8Array
    finish()    : void
    writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void
    writeHeader() : void
  }

  export function GIFEncoder(options?: { auto?: boolean }): Encoder
}
