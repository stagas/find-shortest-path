type Accept<T> = (currentStart: T, currentGoal: T, startFrom: Map<T, T>, goalFrom: Map<T, T>) => boolean
type Hash<T> = (node: T) => string
type Heuristic<T> = (node: T, goal: T) => number
type Neighbors<T> = (node: T) => T[]
type Distance<T> = (current: T, neighbor: T, from: Map<T, T>) => number
type Scaled<T> = [T, number?]

type ShortestPathMeta = {
  attempt: number
  iterations: number
  totalIterations: number
  totalTimeMs: number
}

export interface ShortestPath<T> extends Array<T> {
  meta: ShortestPathMeta
}

interface AgentStrategy<T> {
  distance: Scaled<Distance<T>>
  heuristic: Scaled<Heuristic<T>>
  maxIterations?: number
  negativeHeap?: boolean
}

export interface Strategy<T> extends AgentStrategy<T> {
  accept: Accept<T>
}

interface FindShortestPathAgentOptions<T> {
  start: T
  goal: T
  hash: Hash<T>
  neighbors: Neighbors<T>
}

interface AgentOptions<T> extends AgentStrategy<T>, FindShortestPathAgentOptions<T> {}

interface FindShortestPathOptions<T> extends FindShortestPathAgentOptions<T> {
  strategies: Strategy<T>[]
  attempt?: number
  totalIterations?: number
  startedAt?: number
}

const backtrace = <T>(current: T, from: Map<T, T>): T[] => {
  const path = [current]
  let next
  while (next = from.get(current)) {
    path.push(next)
    current = next
  }
  return path
}

const distanceFnMap = new WeakMap<Distance<any>, WeakMap<any, Map<any, number>>>()

const getDistance = <T>([fn, scale = 1]: [Distance<T>, number?], current: T, neighbor: T, from: Map<T, T>) => {
  let neighborsMap = distanceFnMap.get(fn)
  if (!neighborsMap) neighborsMap = new WeakMap()

  let neighbors = neighborsMap.get(current)
  if (!neighbors) neighbors = new Map()

  let dist = neighbors.get(neighbor)
  if (dist == null) {
    dist = fn(current, neighbor, from) * scale
    neighbors.set(neighbor, dist)
  }

  return dist
}

const getAgent = <T>(
  { start, goal, hash, heuristic: [heuristic, scale = 1], neighbors, distance, negativeHeap = false }: AgentOptions<T>,
) => {
  const add = negativeHeap ? -1 : 1
  const from = new Map<T, T>()

  const G = new Map<T, number>()
  G.set(start, 0)

  const F = new Map<T, number>()
  F.set(start, heuristic(start, goal) * scale)

  const heap: Record<number, T> = { 0: start }
  const opened: Record<string, T> = { [hash(start)]: start }

  return {
    from,
    get: (node: T) => opened[hash(node)],

    peek: () => {
      let current!: T
      for (const key in heap) {
        current = heap[key]
        delete heap[key]
        break
      }
      return current
    },

    advance: (current: T) => {
      const cg = G.get(current) ?? Infinity

      for (const neighbor of neighbors(current)) {
        const key = hash(neighbor)
        if (key in opened) continue
        opened[key] = neighbor

        const g = cg + getDistance(distance, current, neighbor, from)

        const cheapest = G.get(neighbor) ?? Infinity

        if (g < cheapest) {
          from.set(neighbor, current)

          G.set(neighbor, g)

          let f = (g + heuristic(neighbor, goal) * scale) << 4
          while (f in heap) f += add
          F.set(neighbor, f)

          heap[f] = neighbor
        }
      }
    },
  }
}

export const findShortestPath = <T>(
  { start, goal, hash, neighbors, strategies, startedAt = performance.now(), attempt = 0, totalIterations = 0 }:
    FindShortestPathOptions<T>,
): ShortestPath<T> => {
  const { accept, heuristic, distance, negativeHeap, maxIterations = 200 } = strategies[attempt++]

  const agent = getAgent({ start, goal, hash, heuristic, neighbors, distance, negativeHeap })
  let current: T | undefined

  let iterations = 0
  while (++iterations < maxIterations && (current = agent.peek())) {
    if (accept(current, goal, agent.from, agent.from)) {
      const result = [goal].concat(backtrace(current, agent.from)) as ShortestPath<T>
      result.meta = {
        attempt,
        iterations,
        totalIterations: totalIterations + iterations,
        totalTimeMs: performance.now() - startedAt,
      }
      return result
    }

    agent.advance(current)
  }

  if (attempt < strategies.length) {
    return findShortestPath({
      start,
      goal,
      hash,
      neighbors,
      strategies,
      attempt,
      startedAt,
      totalIterations: totalIterations + iterations,
    })
  }

  const result = [] as unknown as ShortestPath<T>
  result.meta = {
    attempt,
    iterations,
    totalIterations: totalIterations + iterations,
    totalTimeMs: performance.now() - startedAt,
  }
  return result
}

export const findShortestPathBi = <T>({
  start,
  goal,
  hash,
  strategies,
  neighbors,
  startedAt = performance.now(),
  attempt = 0,
  totalIterations = 0,
}: FindShortestPathOptions<T>): ShortestPath<T> => {
  const { accept, heuristic, distance, negativeHeap, maxIterations = 200 } = strategies[attempt++]

  const startAgent = getAgent({ start, goal, hash, heuristic, neighbors, distance, negativeHeap })
  const goalAgent = getAgent({ start: goal, goal: start, hash, heuristic, neighbors, distance, negativeHeap })

  let currentStart: T | undefined = start
  let currentGoal: T | undefined = goal
  let lastStart: T = start
  let lastGoal: T = goal
  let maybeStart: T | undefined
  let maybeGoal: T | undefined

  let iterations = 0
  while (++iterations < maxIterations) {
    if (currentStart) {
      currentStart = startAgent.peek()
      if (currentStart) {
        lastStart = currentStart
      }
    }
    if (currentGoal) {
      currentGoal = goalAgent.peek()
      if (currentGoal) {
        lastGoal = currentGoal
      }
    }

    maybeStart = startAgent.get(lastGoal)
    maybeGoal = goalAgent.get(lastStart)

    if (maybeStart) lastStart = maybeStart
    if (maybeGoal) lastGoal = maybeGoal

    if (maybeStart || maybeGoal || accept(lastStart, lastGoal, startAgent.from, goalAgent.from)) {
      let startPath = backtrace(lastStart, startAgent.from).reverse()
      let goalPath = backtrace(lastGoal, goalAgent.from)

      // const joined = accept(startPath.at(-1)!, goalPath[0])
      // if (joined) {
      if (goalPath.length > 1) goalPath = goalPath.slice(1)
      else startPath = startPath.slice(0, -1)
      // }

      const result = startPath.concat(goalPath) as ShortestPath<T>
      result.meta = {
        attempt,
        iterations,
        totalIterations: totalIterations + iterations,
        totalTimeMs: performance.now() - startedAt,
      }
      return result
    }

    if (currentStart) {
      startAgent.advance(currentStart)
    }
    if (currentGoal) {
      goalAgent.advance(currentGoal)
    }
  }

  if (attempt < strategies.length) {
    return findShortestPathBi({
      start,
      goal,
      hash,
      neighbors,
      strategies,
      attempt,
      startedAt,
      totalIterations: totalIterations + iterations,
    })
  }

  const result = [] as unknown as ShortestPath<T>
  result.meta = {
    attempt,
    iterations,
    totalIterations: totalIterations + iterations,
    totalTimeMs: performance.now() - startedAt,
  }
  return result
}
