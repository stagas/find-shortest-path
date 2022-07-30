<h1>
find-shortest-path <a href="https://npmjs.org/package/find-shortest-path"><img src="https://img.shields.io/badge/npm-v1.0.0-F00.svg?colorA=000"/></a> <a href="src"><img src="https://img.shields.io/badge/loc-231-FFF.svg?colorA=000"/></a> <a href="https://cdn.jsdelivr.net/npm/find-shortest-path@1.0.0/dist/find-shortest-path.min.js"><img src="https://img.shields.io/badge/brotli-941b-333.svg?colorA=000"/></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F0B.svg?colorA=000"/></a>
</h1>

<p></p>

Find shortest path between two nodes using A-star search.

<h4>
<table><tr><td title="Triple click to select and copy paste">
<code>npm i find-shortest-path </code>
</td><td title="Triple click to select and copy paste">
<code>pnpm add find-shortest-path </code>
</td><td title="Triple click to select and copy paste">
<code>yarn add find-shortest-path</code>
</td></tr></table>
</h4>

## Examples

<details id="example$web" title="web" open><summary><span><a href="#example$web">#</a></span>  <code><strong>web</strong></code></summary>  <ul>    <details id="source$web" title="web source code" ><summary><span><a href="#source$web">#</a></span>  <code><strong>view source</strong></code></summary>  <a href="example/web.ts">example/web.ts</a>  <p>

```ts
import { Line, Point, Polygon, Rect } from 'geometrik'
import {
  findShortestPath,
  // findShortestPathBi,
  Heuristics,
  ShortestPath,
} from 'find-shortest-path'

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

const a = new Rect(find-shortest-path.new Point(0, 0).gridRoundSelf(step), 10, 10)
const b = new Rect(find-shortest-path.new Point(size, size).gridRoundSelf(step), 150, 150)

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
```

</p>
</details></ul></details>

## API

<p>  <details id="ShortestPath$1" title="Interface" ><summary><span><a href="#ShortestPath$1">#</a></span>  <code><strong>ShortestPath</strong></code>    </summary>  <a href="src/find-shortest-path.ts#L15">src/find-shortest-path.ts#L15</a>  <ul>        <p>  <details id="meta$2" title="Property" ><summary><span><a href="#meta$2">#</a></span>  <code><strong>meta</strong></code>    </summary>  <a href="src/find-shortest-path.ts#L16">src/find-shortest-path.ts#L16</a>  <ul><p><span>ShortestPathMeta</span></p>        </ul></details></p></ul></details><details id="Strategy$4" title="Interface" ><summary><span><a href="#Strategy$4">#</a></span>  <code><strong>Strategy</strong></code>    </summary>  <a href="src/find-shortest-path.ts#L26">src/find-shortest-path.ts#L26</a>  <ul>        <p>  <details id="accept$5" title="Property" ><summary><span><a href="#accept$5">#</a></span>  <code><strong>accept</strong></code>    </summary>  <a href="src/find-shortest-path.ts#L27">src/find-shortest-path.ts#L27</a>  <ul><p><span>Accept</span>&lt;<a href="#T$10">T</a>&gt;</p>        </ul></details><details id="distance$6" title="Property" ><summary><span><a href="#distance$6">#</a></span>  <code><strong>distance</strong></code>    </summary>  <a href="src/find-shortest-path.ts#L20">src/find-shortest-path.ts#L20</a>  <ul><p><span>Scaled</span>&lt;<span>Distance</span>&lt;<a href="#T$10">T</a>&gt;&gt;</p>        </ul></details><details id="heuristic$7" title="Property" ><summary><span><a href="#heuristic$7">#</a></span>  <code><strong>heuristic</strong></code>    </summary>  <a href="src/find-shortest-path.ts#L21">src/find-shortest-path.ts#L21</a>  <ul><p><span>Scaled</span>&lt;<span>Heuristic</span>&lt;<a href="#T$10">T</a>&gt;&gt;</p>        </ul></details><details id="maxIterations$8" title="Property" ><summary><span><a href="#maxIterations$8">#</a></span>  <code><strong>maxIterations</strong></code>    </summary>  <a href="src/find-shortest-path.ts#L22">src/find-shortest-path.ts#L22</a>  <ul><p>number</p>        </ul></details><details id="negativeHeap$9" title="Property" ><summary><span><a href="#negativeHeap$9">#</a></span>  <code><strong>negativeHeap</strong></code>    </summary>  <a href="src/find-shortest-path.ts#L23">src/find-shortest-path.ts#L23</a>  <ul><p>boolean</p>        </ul></details></p></ul></details><details id="Heuristics$19" title="Variable" ><summary><span><a href="#Heuristics$19">#</a></span>  <code><strong>Heuristics</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>  <a href="src/heuristics.ts#L3">src/heuristics.ts#L3</a>  <ul><p>{<p>  <details id="Chebyshev$31" title="Property" ><summary><span><a href="#Chebyshev$31">#</a></span>  <code><strong>Chebyshev</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>    <ul><p><details id="__type$32" title="Function" ><summary><span><a href="#__type$32">#</a></span>  <em>(a, b)</em>    </summary>    <ul>    <p>    <details id="a$34" title="Parameter" ><summary><span><a href="#a$34">#</a></span>  <code><strong>a</strong></code>    </summary>    <ul><p><span>Point</span></p>        </ul></details><details id="b$35" title="Parameter" ><summary><span><a href="#b$35">#</a></span>  <code><strong>b</strong></code>    </summary>    <ul><p><span>Point</span></p>        </ul></details>  <p><strong></strong><em>(a, b)</em>  &nbsp;=&gt;  <ul>number</ul></p></p>    </ul></details></p>        </ul></details><details id="Euclidean$26" title="Property" ><summary><span><a href="#Euclidean$26">#</a></span>  <code><strong>Euclidean</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>    <ul><p><details id="__type$27" title="Function" ><summary><span><a href="#__type$27">#</a></span>  <em>(a, b)</em>    </summary>    <ul>    <p>    <details id="a$29" title="Parameter" ><summary><span><a href="#a$29">#</a></span>  <code><strong>a</strong></code>    </summary>    <ul><p><span>Point</span></p>        </ul></details><details id="b$30" title="Parameter" ><summary><span><a href="#b$30">#</a></span>  <code><strong>b</strong></code>    </summary>    <ul><p><span>Point</span></p>        </ul></details>  <p><strong></strong><em>(a, b)</em>  &nbsp;=&gt;  <ul>number</ul></p></p>    </ul></details></p>        </ul></details><details id="Manhattan$21" title="Property" ><summary><span><a href="#Manhattan$21">#</a></span>  <code><strong>Manhattan</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>    <ul><p><details id="__type$22" title="Function" ><summary><span><a href="#__type$22">#</a></span>  <em>(a, b)</em>    </summary>    <ul>    <p>    <details id="a$24" title="Parameter" ><summary><span><a href="#a$24">#</a></span>  <code><strong>a</strong></code>    </summary>    <ul><p><span>Point</span></p>        </ul></details><details id="b$25" title="Parameter" ><summary><span><a href="#b$25">#</a></span>  <code><strong>b</strong></code>    </summary>    <ul><p><span>Point</span></p>        </ul></details>  <p><strong></strong><em>(a, b)</em>  &nbsp;=&gt;  <ul>number</ul></p></p>    </ul></details></p>        </ul></details></p>}</p>        </ul></details><details id="findShortestPath$11" title="Function" ><summary><span><a href="#findShortestPath$11">#</a></span>  <code><strong>findShortestPath</strong></code><em>(<span>FindShortestPathOptions</span>&lt;<a href="#T$13">T</a>&gt;)</em>    </summary>  <a href="src/find-shortest-path.ts#L131">src/find-shortest-path.ts#L131</a>  <ul>    <p>    <span>FindShortestPathOptions</span>&lt;<a href="#T$13">T</a>&gt;  <p><strong>findShortestPath</strong>&lt;<span>T</span>&gt;<em>(<span>FindShortestPathOptions</span>&lt;<a href="#T$13">T</a>&gt;)</em>  &nbsp;=&gt;  <ul><a href="#ShortestPath$1">ShortestPath</a>&lt;<a href="#T$13">T</a>&gt;</ul></p></p>    </ul></details><details id="findShortestPathBi$15" title="Function" ><summary><span><a href="#findShortestPathBi$15">#</a></span>  <code><strong>findShortestPathBi</strong></code><em>(<span>FindShortestPathOptions</span>&lt;<a href="#T$17">T</a>&gt;)</em>    </summary>  <a href="src/find-shortest-path.ts#L179">src/find-shortest-path.ts#L179</a>  <ul>    <p>    <span>FindShortestPathOptions</span>&lt;<a href="#T$17">T</a>&gt;  <p><strong>findShortestPathBi</strong>&lt;<span>T</span>&gt;<em>(<span>FindShortestPathOptions</span>&lt;<a href="#T$17">T</a>&gt;)</em>  &nbsp;=&gt;  <ul><a href="#ShortestPath$1">ShortestPath</a>&lt;<a href="#T$17">T</a>&gt;</ul></p></p>    </ul></details></p>

## Contributing

[Fork](https://github.com/stagas/find-shortest-path/fork) or [edit](https://github.dev/stagas/find-shortest-path) and submit a PR.

All contributions are welcome!

## License

<a href="LICENSE">MIT</a> &copy; 2022 [stagas](https://github.com/stagas)
