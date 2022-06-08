import type { Point } from 'geometrik'

export const Heuristics = {
  Manhattan: (a: Point, b: Point) => a.manhattan(b),
  Euclidean: (a: Point, b: Point) => a.euclidean(b),
  Chebyshev: (a: Point, b: Point) => a.chebyshev(b),
}
