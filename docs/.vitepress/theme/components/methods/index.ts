import type { Component } from 'vue'

import { Keys }   from './keys.ts'
import { Passes } from './passes.ts'
import { Run }    from './run.ts'

/**
 * The widgets the Methods pages place, under the names `PLACED` gives them.
 */
export const METHODS_WIDGETS: Record<string, Component> = { keys: Keys, passes: Passes, run: Run }
