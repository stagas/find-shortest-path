import { Line, Point, Polygon, Rect } from 'geometrik'
import {
  findShortestPath,
  // findShortestPathBi,
  Heuristics,
  ShortestPath,
} from '../src'

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

let ri = 2392
const rnd = () => Math.sin(++ri * 10e10 * Math.sin(ri * 10e10)) * 0.5 + 0.5
const size = Math.min(window.innerWidth / 2, window.innerHeight / 2)
const rects = Array.from({ length: 15 }, () => {
  return new Rect(
    rnd() * size + 50,
    rnd() * size + 50,
    rnd() * size / 3,
    rnd() * size / 3
  )
})

for (const rect of rects) {
  rect.draw()
}

const step = 30

const a = new Rect(...new Point(0, 0).gridRoundSelf(step), 10, 10)
const b = new Rect(...new Point(size, size).gridRoundSelf(step), 150, 150)

const pa = a.topLeft
let pb = b.bottomRight.gridRound(step)

pa.draw()
pb.draw()

const big = Rect.combine([a, b]).zoomLinear(step * 4)
big.draw()

declare const console: Console & {
  edit: <T>(object: T, callback: (changed: T) => void) => void
}

// const multipliers = {
//   distance: 0.45,
//   heuristic: 20.65,
// }

// window.onload = () => {
//   console.edit(multipliers, changed => {
//     console.log('yes changed', changed)
//     Object.assign(multipliers, changed)

//     points = solve()
//     console.table(points.meta)
//     if (points.length > 2) {
//       path.setAttribute('d', Point.toSVGPath(points))
//     }
//   })
// }

const solve = () => {
  const intersects = (a: Point, b: Point) => {
    const line = new Line(a, b)
    for (const rect of rects) {
      if (line.intersectsRect(rect)) return true
    }
    return false
  }
  const acceptTolerance = 1 * step
  const points = findShortestPath({
    start: pa,
    goal: pb,
    hash: p => p.gridRound(step).toString(),
    strategies: [
      {
        accept: (a, b) => !intersects(a, b) && a.manhattan(b) <= acceptTolerance,
        distance: [Heuristics.Manhattan, 1.45],
        heuristic: [Heuristics.Chebyshev, 10],
        // distance: [Heuristics.Manhattan],
        // heuristic: [Heuristics.Chebyshev, 50],
        negativeHeap: true,
        maxIterations: 30,
      },

      {
        accept: (a, b) => !intersects(a, b) && a.manhattan(b) <= acceptTolerance,
        // distance: [Heuristics.Manhattan, multipliers.distance],
        // heuristic: [Heuristics.Chebyshev, multipliers.heuristic],
        distance: [Heuristics.Manhattan, 0.8],
        heuristic: [Heuristics.Euclidean, 10.65],
        // distance: [Heuristics.Manhattan, 0.45],
        // heuristic: [Heuristics.Euclidean, 20.65],
        maxIterations: 30,
      },
      {
        accept: (a, b) => a.manhattan(b) <= step * 1.5,
        distance: [Heuristics.Manhattan],
        heuristic: [Heuristics.Chebyshev, 50],
        maxIterations: 300,
      },
    ],
    neighbors(p) {
      return [
        // TODO: we can try the shortest directions first
        p.translate(+step, 0),
        p.translate(0, +step),
        p.translate(-step, 0),
        p.translate(0, -step),

        p.translate(+step, +step),
        p.translate(+step, -step),
        p.translate(-step, +step),
        p.translate(-step, -step),
      ]
        .filter(p => p.withinRect(big))
        .filter(n => {
          const line = new Line(p, n)
          return rects.every(r => !line.intersectsRect(r))
        })
    },
  })
  return points
}

let points!: ShortestPath<Point>
for (let i = 50; i--;) {
  points = solve()
  if (!points.length) break
}
console.table(points.meta)

let followPointer = true
document.onclick = () => {
  followPointer = !followPointer
}

if (points) {
  svg.setAttribute('width', '' + window.innerWidth)
  svg.setAttribute('height', '' + window.innerHeight)
  path.setAttribute('stroke', '#fff')
  path.setAttribute('stroke-width', '2')
  path.setAttribute('d', Polygon.toSVGPath(points))
  svg.appendChild(path)
  document.body.appendChild(svg)
  document.body.onpointermove = e => {
    if (!followPointer) return

    pb = new Point(e.pageX, e.pageY)
    if (pb.withinRect(big)) {
      for (const rect of rects) {
        if (pb.withinRect(rect)) {
          pb.set(pb.touchPoint(rect))
          break
        }
      }

      points = solve()
      console.table(points.meta)
      if (points.length > 2) {
        path.setAttribute('d', Polygon.toSVGPath(points))
      }
    }
  }
}
