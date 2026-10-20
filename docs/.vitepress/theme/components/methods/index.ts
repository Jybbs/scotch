import type { Component } from 'vue'

import { Run } from './run.ts'

/**
 * The widgets the Methods pages place, under the names `PLACED` gives them.
 */
export const METHODS_WIDGETS: Record<string, Component> = { run: Run }
