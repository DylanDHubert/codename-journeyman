import { DIRECTIONS } from "./constants";
import { cellKey, indexFor, inBounds } from "./coords";
import {
  canPlaceBridge,
  canTraverseHeuristic,
  getCellAt,
  isLandKind,
  manhattanDistance,
} from "./tiles";
import type { CellCoord, PuzzleGrid } from "./types";

export type BridgeSlot = {
  row: number;
  col: number;
  key: string;
  cost: number;
  /** ADJACENT LAND COMPONENT IDS THIS BRIDGE CAN CONNECT */
  touchesComponents: number[];
  distToWaypoint: number;
  distToGoal: number;
};

export type ParContext = {
  puzzle: PuzzleGrid;
  bridgeSlots: Map<string, BridgeSlot>;
  bridgeSlotList: BridgeSlot[];
  distToWaypoint: number[][];
  distToGoal: number[][];
  startComponent: number;
  waypointComponent: number;
  goalComponent: number;
  /** MIN SINGLE-BRIDGE COST BETWEEN COMPONENT PAIRS — KEY "a|b" WITH a < b */
  componentBridgeCost: Map<string, number>;
  costLowerBound: number;
};

function componentPairKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function bridgePlacementCostFromKind(
  puzzle: PuzzleGrid,
  row: number,
  col: number,
): number {
  const kind = getCellAt(puzzle, row, col)?.kind;
  if (kind === "marsh") {
    return 2;
  }
  if (kind === "ocean") {
    return 1;
  }

  return Infinity;
}

/** OPTIMISTIC BFS — LAND FREE, BRIDGEABLE WATER FREE (HEURISTIC ONLY) */
function buildHeuristicDistanceGrid(
  puzzle: PuzzleGrid,
  origin: CellCoord,
): number[][] {
  const { rows, cols } = puzzle;
  const dist = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(Infinity),
  );
  const queue: CellCoord[] = [origin];
  dist[origin.row]![origin.col] = 0;

  let head = 0;
  while (head < queue.length) {
    const { row, col } = queue[head]!;
    head += 1;
    const current = dist[row]![col]!;

    for (const { dr, dc } of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;

      if (!inBounds(nr, nc, rows, cols)) {
        continue;
      }

      if (!canTraverseHeuristic(puzzle, row, col, nr, nc)) {
        continue;
      }

      if (current + 1 >= dist[nr]![nc]!) {
        continue;
      }

      dist[nr]![nc] = current + 1;
      queue.push({ row: nr, col: nc });
    }
  }

  return dist;
}

function adjacentLandComponents(
  puzzle: PuzzleGrid,
  row: number,
  col: number,
): number[] {
  const components = new Set<number>();

  for (const { dr, dc } of DIRECTIONS) {
    const cell = getCellAt(puzzle, row + dr, col + dc);
    if (cell && isLandKind(cell.kind) && cell.componentId >= 0) {
      components.add(cell.componentId);
    }
  }

  return [...components];
}

function computeComponentBridgeCosts(
  bridgeSlotList: BridgeSlot[],
): Map<string, number> {
  const costs = new Map<string, number>();

  for (const slot of bridgeSlotList) {
    const comps = slot.touchesComponents;
    for (let i = 0; i < comps.length; i += 1) {
      for (let j = i + 1; j < comps.length; j += 1) {
        const key = componentPairKey(comps[i]!, comps[j]!);
        const prev = costs.get(key);
        if (prev === undefined || slot.cost < prev) {
          costs.set(key, slot.cost);
        }
      }
    }
  }

  return costs;
}

function minBridgeBetween(
  costs: Map<string, number>,
  a: number,
  b: number,
): number {
  if (a === b) {
    return 0;
  }

  return costs.get(componentPairKey(a, b)) ?? Infinity;
}

/** ADMISSIBLE-ISH LOWER BOUND ON COURIER PAR COST */
function computeCostLowerBound(
  startComponent: number,
  waypointComponent: number,
  goalComponent: number,
  componentBridgeCost: Map<string, number>,
): number {
  const xy = minBridgeBetween(
    componentBridgeCost,
    startComponent,
    waypointComponent,
  );
  const yz = minBridgeBetween(
    componentBridgeCost,
    waypointComponent,
    goalComponent,
  );

  if (!Number.isFinite(xy) || !Number.isFinite(yz)) {
    return Infinity;
  }

  return xy + yz;
}

export function buildParContext(puzzle: PuzzleGrid): ParContext {
  const { rows, cols } = puzzle;
  const bridgeSlots = new Map<string, BridgeSlot>();
  const distToWaypoint = buildHeuristicDistanceGrid(puzzle, puzzle.waypoint);
  const distToGoal = buildHeuristicDistanceGrid(puzzle, puzzle.goal);

  const startCell = getCellAt(puzzle, puzzle.start.row, puzzle.start.col)!;
  const waypointCell = getCellAt(
    puzzle,
    puzzle.waypoint.row,
    puzzle.waypoint.col,
  )!;
  const goalCell = getCellAt(puzzle, puzzle.goal.row, puzzle.goal.col)!;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!canPlaceBridge(puzzle, row, col)) {
        continue;
      }

      const key = cellKey(row, col);
      const cost = bridgePlacementCostFromKind(puzzle, row, col);
      const wpDist =
        distToWaypoint[row]![col] ??
        manhattanDistance({ row, col }, puzzle.waypoint);
      const goalDist =
        distToGoal[row]![col] ??
        manhattanDistance({ row, col }, puzzle.goal);

      bridgeSlots.set(key, {
        row,
        col,
        key,
        cost,
        touchesComponents: adjacentLandComponents(puzzle, row, col),
        distToWaypoint: wpDist,
        distToGoal: goalDist,
      });
    }
  }

  const bridgeSlotList = [...bridgeSlots.values()];
  const componentBridgeCost = computeComponentBridgeCosts(bridgeSlotList);
  const startComponent = startCell.componentId;
  const waypointComponent = waypointCell.componentId;
  const goalComponent = goalCell.componentId;

  return {
    puzzle,
    bridgeSlots,
    bridgeSlotList,
    distToWaypoint,
    distToGoal,
    startComponent,
    waypointComponent,
    goalComponent,
    componentBridgeCost,
    costLowerBound: computeCostLowerBound(
      startComponent,
      waypointComponent,
      goalComponent,
      componentBridgeCost,
    ),
  };
}

export function parCostLowerBound(context: ParContext): number {
  return context.costLowerBound;
}

/** REJECT BEFORE FULL PAR WHEN LOWER BOUND ALREADY EXCEEDS MAX — ONLY WHEN FINITE */
export function parCostImpossibleAbove(
  context: ParContext,
  maxCost: number,
): boolean {
  const lb = context.costLowerBound;
  if (!Number.isFinite(lb)) {
    return false;
  }

  return lb > maxCost;
}

export function heuristicForBridgeSlot(
  context: ParContext,
  slot: BridgeSlot,
  waypointReached: boolean,
): number {
  return waypointReached ? slot.distToGoal : slot.distToWaypoint;
}

export function minHeuristicFromReachable(
  context: ParContext,
  reachable: Set<string>,
  waypointReached: boolean,
): number {
  const grid = waypointReached ? context.distToGoal : context.distToWaypoint;
  let min = Infinity;

  for (const key of reachable) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    const value = grid[row]?.[col];
    if (value !== undefined && value < min) {
      min = value;
    }
  }

  return min;
}

export function lookupBridgeSlot(
  context: ParContext,
  row: number,
  col: number,
): BridgeSlot | undefined {
  return context.bridgeSlots.get(cellKey(row, col));
}

export function cellIndex(puzzle: PuzzleGrid, row: number, col: number): number {
  return indexFor(row, col, puzzle.cols);
}
