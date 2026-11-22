import { expect } from 'vitest'

/**
 * The marks and words a sentence the site publishes never carries, which the
 * `toReadAsProse` matcher holds every caption and definition to.
 */
const BANNED = [/—/u, /;\s/u, /\bfootgun\b/iu, /\bnamely\b/iu]

expect.extend({
  toAllEqual(received: readonly unknown[], expected: unknown) {
    const odd = received.findIndex(each => !this.equals(each, expected))
    return {
      message : () => `expected ${this.utils.printReceived(received)} to hold at least one element `
                    + `and every element ${this.isNot ? 'not ' : ''}to equal `
                    + this.utils.printExpected(expected),
      pass    : received.length > 0 && odd < 0
    }
  },

  toReadAsProse(received: string) {
    const found = BANNED.find(pattern => pattern.test(received))
    return {
      message : () => `expected ${JSON.stringify(received)} `
                    + `${found ? `to carry no ${found}` : 'to break a rule'}`,
      pass    : found === undefined
    }
  }
})

declare module 'vitest' {
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toAllEqual    : (expected: unknown) => R
    toReadAsProse : () => R
  }
}
