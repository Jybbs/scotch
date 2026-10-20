import measures                             from '../lib/front/fixtures/measures.json' with { type: 'json' }
import { ovalOf }                           from '../../lib/front/example.ts'
import { Field }                            from '../../lib/front/field.ts'
import { type Measure, type Point, layout } from '../../lib/front/layout.ts'
import type { Mote }                        from '../../lib/front/motes.ts'
import { Scene }                            from '../../lib/front/scene.ts'

/**
 * The oval the front page plays, read from the front example.
 */
export const front = ovalOf()

/**
 * Lists every pair of points that stand too close for the pieces drifting about
 * them to keep from touching.
 */
export function crowded(field: Field, points: Point[]): Point[][] {
  return points.flatMap((point, index) => points.slice(index + 1)
    .filter(other => !field.apart(point, other))
    .map(other => [point, other]))
}

/**
 * Builds the field the front oval lays out on a measured page.
 */
export function fieldOf(measure: Measure): Field {
  return new Field(measure, front, layout(measure, front.shared))
}

/**
 * Lists the pieces that wait loose on the page among `motes`.
 */
export function looseOf(motes: readonly Mote[]): Mote[] {
  return motes.filter(piece => piece.k < 0)
}

/**
 * Builds a scene on the wide fixture, its clock set to `time`.
 */
export function sceneAt(time = 5): Scene {
  const scene = new Scene(front)
  scene.build(measures.wide, layout(measures.wide, front.shared))
  return Object.assign(scene, { time })
}
