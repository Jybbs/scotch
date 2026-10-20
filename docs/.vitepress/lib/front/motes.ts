import type { Game, Kind } from './example.ts'

/**
 * One piece on the front page at a home it drifts about, either a piece of a
 * ply the oval shows, which travels to its place on the oval's arc, or a loose
 * piece, which stays near its home and, where it stands in the oval's path,
 * makes way as the oval's pieces pass.
 *
 * Attributes:
 *   ax, ay : How far the piece drifts across and down from its home.
 *   dx, dy : Where its drift has carried it at the current time.
 *   fx, fy : Where across and down its drift starts in its period.
 *   game   : The game whose move it plays.
 *   home   : Its home's place in the field's list of homes.
 *   hx, hy : Its home.
 *   id     : The key the scene finds a piece of the oval by while a loose piece
 *     makes way, `moteId` of its game and ply for a piece of the oval, and
 *     `loose` behind its place among the loose pieces otherwise.
 *   k      : The ply it plays on the oval counted from 0, or -1 for a loose
 *     piece.
 *   kind   : The kind of piece it is.
 *   ox, oy : How far a pointer or a passing piece has pushed it.
 *   px, py : How many seconds one drift across and one drift down take.
 *   vx, vy : How fast its push is moving it.
 *   way    : Where a loose piece in the oval's path makes way to.
 */
export interface Mote {
  ax   : number
  ay   : number
  dx   : number
  dy   : number
  fx   : number
  fy   : number
  game : Game
  home : number
  hx   : number
  hy   : number
  id   : string
  k    : number
  kind : Kind
  ox   : number
  oy   : number
  px   : number
  py   : number
  vx   : number
  vy   : number
  way? : Way
}

/**
 * Where a loose piece in the oval's path goes while the oval's pieces pass: the
 * spot it moves to, the places it stands near, and the distances from those
 * places at which an arriving piece starts and finishes moving it.
 */
export interface Way {
  near : { d: number, id: string, k: number, x: number, y: number }[]
  r0   : number
  r1   : number
  tx   : number
  ty   : number
}
