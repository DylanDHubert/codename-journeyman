import { DIRECTIONS, MAX_PAR_SEARCH_DEPTH } from "./constants";
import { cellKey, coordKey, inBounds } from "./coords";
import {
  buildParContext,
  heuristicForBridgeSlot,
  minHeuristicFromReachable,
  parCostImpossibleAbove,
  type ParContext,
} from "./parPrecompute";
import {
  bridgePlacementCost,
  canPlaceBridge,
  canTraverse,
  courierCheckpoints,
  isWalkable,
  totalBridgeCost,
} from "./tiles";
import type { CellCoord, PuzzleGrid, SimulationResult } from "./types";

export function floodReachable(
  puzzle: PuzzleGrid,
  bridges: Set<string>,
  origin: CellCoord,
): Set<string> {
  const visited = new Set<string>();
  const queue: CellCoord[] = [origin];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = coordKey(current);

    if (visited.has(key)) {
      continue;
    }

    if (!isWalkable(puzzle, current.row, current.col, bridges)) {
      continue;
    }

    visited.add(key);

    for (const { dr, dc } of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (!canTraverse(puzzle, current.row, current.col, nr, nc, bridges)) {
        continue;
      }
      queue.push({ row: nr, col: nc });
    }
  }

  return visited;
}

export function shortestPath(
  puzzle: PuzzleGrid,
  bridges: Set<string>,
  from: CellCoord,
  to: CellCoord,
): CellCoord[] {
  const startKey = coordKey(from);
  const goalKey = coordKey(to);
  const queue: CellCoord[] = [from];
  const previous = new Map<string, string | null>([[startKey, null]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = coordKey(current);

    if (currentKey === goalKey) {
      break;
    }

    for (const { dr, dc } of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (!inBounds(nr, nc, puzzle.rows, puzzle.cols)) {
        continue;
      }

      const neighborKey = cellKey(nr, nc);
      if (previous.has(neighborKey)) {
        continue;
      }

      if (!canTraverse(puzzle, current.row, current.col, nr, nc, bridges)) {
        continue;
      }

      previous.set(neighborKey, currentKey);
      queue.push({ row: nr, col: nc });
    }
  }

  if (!previous.has(goalKey)) {
    return [];
  }

  const path: CellCoord[] = [];
  let cursor: string | null = goalKey;

  while (cursor) {
    const [row, col] = cursor.split(",").map(Number) as [number, number];
    path.unshift({ row, col });
    cursor = previous.get(cursor) ?? null;
  }

  return path;
}

export function courierPath(
  puzzle: PuzzleGrid,
  bridges: Set<string>,
): CellCoord[] {
  const [start, waypoint, goal] = courierCheckpoints(puzzle);
  const toWaypoint = shortestPath(puzzle, bridges, start, waypoint);
  if (toWaypoint.length === 0) {
    return [];
  }

  const toGoal = shortestPath(puzzle, bridges, waypoint, goal);
  if (toGoal.length === 0) {
    return [];
  }

  return [...toWaypoint, ...toGoal.slice(1)];
}

export function isCourierConnected(
  puzzle: PuzzleGrid,
  bridges: Set<string>,
): boolean {
  return courierPath(puzzle, bridges).length > 0;
}

export function simulate(
  puzzle: PuzzleGrid,
  bridges: Set<string>,
): SimulationResult {
  const reachable = floodReachable(puzzle, bridges, puzzle.start);
  const path = courierPath(puzzle, bridges);
  const connected = path.length > 0;

  return {
    connected,
    bridgeCount: bridges.size,
    bridgeCost: totalBridgeCost(puzzle, bridges),
    path,
    reachable,
  };
}

function waypointReached(
  puzzle: PuzzleGrid,
  reachable: Set<string>,
): boolean {
  return reachable.has(coordKey(puzzle.waypoint));
}

function bridgeCandidates(
  puzzle: PuzzleGrid,
  context: ParContext,
  reachable: Set<string>,
  bridges: Set<string>,
  limit?: number,
): CellCoord[] {
  const yReached = waypointReached(puzzle, reachable);
  const candidates: CellCoord[] = [];
  const seen = new Set<string>();

  for (const key of reachable) {
    const [row, col] = key.split(",").map(Number) as [number, number];

    for (const { dr, dc } of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      const waterKey = cellKey(nr, nc);

      if (bridges.has(waterKey) || seen.has(waterKey)) {
        continue;
      }

      const slot = context.bridgeSlots.get(waterKey);
      if (!slot) {
        continue;
      }

      seen.add(waterKey);
      candidates.push({ row: nr, col: nc });
    }
  }

  if (limit !== undefined && candidates.length > limit) {
    candidates.sort((a, b) => {
      const slotA = context.bridgeSlots.get(cellKey(a.row, a.col))!;
      const slotB = context.bridgeSlots.get(cellKey(b.row, b.col))!;
      return (
        heuristicForBridgeSlot(context, slotA, yReached) -
        heuristicForBridgeSlot(context, slotB, yReached)
      );
    });

    return candidates.slice(0, limit);
  }

  return candidates;
}

function trimCostLayer(
  puzzle: PuzzleGrid,
  layer: CostSearchState[],
  maxStates: number,
  context: ParContext,
): CostSearchState[] {
  if (layer.length <= maxStates) {
    return layer;
  }

  return [...layer]
    .sort((a, b) => {
      const aReached = waypointReached(puzzle, a.reachable);
      const bReached = waypointReached(puzzle, b.reachable);
      return (
        minHeuristicFromReachable(context, a.reachable, aReached) -
        minHeuristicFromReachable(context, b.reachable, bReached)
      );
    })
    .slice(0, maxStates);
}

type CostSearchState = {
  bridges: Set<string>;
  reachable: Set<string>;
  cost: number;
};

function bridgesSignature(bridges: Set<string>): string {
  return [...bridges].sort().join("|");
}

function pushCostState(
  buckets: Map<number, CostSearchState[]>,
  visited: Map<string, number>,
  state: CostSearchState,
): void {
  const signature = bridgesSignature(state.bridges);
  const previousBest = visited.get(signature);
  if (previousBest !== undefined && previousBest <= state.cost) {
    return;
  }

  visited.set(signature, state.cost);
  const layer = buckets.get(state.cost) ?? [];
  layer.push(state);
  buckets.set(state.cost, layer);
}

type ParSearchOptions = {
  maxStatesPerLayer?: number;
  maxCandidatesPerState?: number;
  context?: ParContext;
};

export type MinimumSolution = {
  cost: number;
  bridges: Set<string>;
};

/** COST-BUCKET BFS — RETURNS PAR BRIDGES WHEN FOUND */
export function computeMinimumSolution(
  puzzle: PuzzleGrid,
  maxCost = MAX_PAR_SEARCH_DEPTH * 2,
  options: ParSearchOptions = {},
): MinimumSolution | null {
  const context = options.context ?? buildParContext(puzzle);
  const maxStatesPerLayer = options.maxStatesPerLayer ?? Infinity;
  const maxCandidatesPerState = options.maxCandidatesPerState ?? Infinity;

  if (parCostImpossibleAbove(context, maxCost)) {
    return null;
  }

  const emptyBridges = new Set<string>();
  if (isCourierConnected(puzzle, emptyBridges)) {
    return { cost: 0, bridges: emptyBridges };
  }

  const visited = new Map<string, number>();
  const buckets = new Map<number, CostSearchState[]>();

  pushCostState(buckets, visited, {
    bridges: emptyBridges,
    reachable: floodReachable(puzzle, emptyBridges, puzzle.start),
    cost: 0,
  });

  for (let cost = 0; cost <= maxCost; cost += 1) {
    const rawLayer = buckets.get(cost);
    if (!rawLayer || rawLayer.length === 0) {
      continue;
    }

    buckets.delete(cost);
    const layer = trimCostLayer(
      puzzle,
      rawLayer,
      maxStatesPerLayer,
      context,
    );

    for (const state of layer) {
      if (state.cost !== cost) {
        continue;
      }

      if (isCourierConnected(puzzle, state.bridges)) {
        return { cost: state.cost, bridges: state.bridges };
      }

      const candidates = bridgeCandidates(
        puzzle,
        context,
        state.reachable,
        state.bridges,
        maxCandidatesPerState,
      );

      for (const candidate of candidates) {
        const key = cellKey(candidate.row, candidate.col);
        const bridges = new Set(state.bridges);
        bridges.add(key);

        const slot = context.bridgeSlots.get(key);
        const placementCost = slot?.cost ?? bridgePlacementCost(
          puzzle,
          candidate.row,
          candidate.col,
        );
        const nextCost = cost + placementCost;
        if (nextCost > maxCost) {
          continue;
        }

        pushCostState(buckets, visited, {
          bridges,
          reachable: floodReachable(puzzle, bridges, puzzle.start),
          cost: nextCost,
        });
      }
    }
  }

  return null;
}

/** COST-BUCKET BFS WITH PRECOMPUTED PAR CONTEXT */
export function computeMinimumCost(
  puzzle: PuzzleGrid,
  maxCost = MAX_PAR_SEARCH_DEPTH * 2,
  options: ParSearchOptions = {},
): number | null {
  return computeMinimumSolution(puzzle, maxCost, options)?.cost ?? null;
}

export function computeMinimumCostFast(
  puzzle: PuzzleGrid,
  maxCost = MAX_PAR_SEARCH_DEPTH * 2,
): number | null {
  const context = buildParContext(puzzle);

  if (parCostImpossibleAbove(context, maxCost)) {
    return null;
  }

  return computeMinimumCost(puzzle, maxCost, {
    maxStatesPerLayer: 48,
    maxCandidatesPerState: 16,
    context,
  });
}

export { buildParContext, parCostImpossibleAbove, type ParContext } from "./parPrecompute";

export { canPlaceBridge, totalBridgeCost };

export const computeMinimumBridges = computeMinimumCost;
export const computeMinimumBridgesFast = computeMinimumCostFast;
