import type { Outliner }       from '../../../docs/.vitepress/lib/readme/outline.ts'
import type { Shot }           from '../../../docs/.vitepress/lib/readme/parts.ts'
import { colorsOf }            from '../../../docs/.vitepress/lib/readme/preview.ts'
import { type Scene, sceneOf } from '../../../docs/.vitepress/lib/readme/scene.ts'

/**
 * Stands in for the outliner, setting each line as its text in brackets, so a
 * drawing reads back which words it set.
 */
const echo = { line: (text: string) => Promise.resolve(`[${text}]`) } as unknown as Outliner
/**
 * The preview's scene, played from the front page's example.
 */
export const scene = sceneOf()

/**
 * Poses a frame of the preview in the light scheme, moving from ply `from` to
 * ply `to` and `t` milliseconds into a slide of 100, a hold where the two match.
 */
export function shotAt(from: number, to = from, t = 50, played: Scene = scene): Shot {
  return { colors: colorsOf('light'), frame: { from, span: 100, t, to }, outliner: echo, scene: played }
}
