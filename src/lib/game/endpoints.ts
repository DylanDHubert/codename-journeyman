import { DIRECTIONS } from "./constants";
import { inBounds } from "./coords";
import { isInteriorGrass } from "./terrainFeatures";
import { manhattanDistance } from "./tiles";
import type { CellCoord, CourierRoute, TileKind } from "./types";

const MIN_COMPONENT_CELLS = 3;
const ENDPOINT_TOP_FRACTION = 0.25;
const ENDPOINT_DISTANCE_JITTER = 0.45;
const MAX_CELLS_PER_COMPONENT = 6;

type EndpointTriple = CourierRoute & {
  spread: number;
};

function coordSortKey(coord: CellCoord): string {
  return `${coord.row},${coord.col}`;
}

function sampleEndpointCells(
  cells: CellCoord[],
  rng: () => number,
): CellCoord[] {
  if (cells.length <= MAX_CELLS_PER_COMPONENT) {
    return cells;
  }

  const picked = new Map<string, CellCoord>();
  let minRow = cells[0]!;
  let maxRow = cells[0]!;
  let minCol = cells[0]!;
  let maxCol = cells[0]!;

  for (const cell of cells) {
    if (cell.row < minRow.row || (cell.row === minRow.row && cell.col < minRow.col)) {
      minRow = cell;
    }
    if (cell.row > maxRow.row || (cell.row === maxRow.row && cell.col > maxRow.col)) {
      maxRow = cell;
    }
    if (cell.col < minCol.col || (cell.col === minCol.col && cell.row < minCol.row)) {
      minCol = cell;
    }
    if (cell.col > maxCol.col || (cell.col === maxCol.col && cell.row > maxCol.row)) {
      maxCol = cell;
    }
  }

  for (const cell of [minRow, maxRow, minCol, maxCol]) {
    picked.set(coordSortKey(cell), cell);
  }

  while (picked.size < MAX_CELLS_PER_COMPONENT) {
    const cell = cells[Math.floor(rng() * cells.length)]!;
    picked.set(coordSortKey(cell), cell);
  }

  return [...picked.values()];
}

function pickWeightedTriple(
  pool: EndpointTriple[],
  rng: () => number,
): EndpointTriple {
  if (pool.length === 1) {
    return pool[0]!;
  }

  const maxSpread = pool[0]!.spread;
  const jitterScale = maxSpread * ENDPOINT_DISTANCE_JITTER;
  let totalWeight = 0;
  const weights: number[] = [];

  for (const candidate of pool) {
    const weight = candidate.spread + rng() * jitterScale;
    weights.push(weight);
    totalWeight += weight;
  }

  let roll = rng() * totalWeight;
  for (let i = 0; i < pool.length; i += 1) {
    roll -= weights[i]!;
    if (roll <= 0) {
      return pool[i]!;
    }
  }

  return pool[pool.length - 1]!;
}

function tripleSpread(a: CellCoord, b: CellCoord, c: CellCoord): number {
  return (
    manhattanDistance(a, b) +
    manhattanDistance(b, c) +
    manhattanDistance(a, c)
  );
}

/** PICK X, Y, Z ON THREE DIFFERENT ISLANDS — FAVOR FAR-APART TRIPLES */
export function pickCourierEndpoints(
  grid: TileKind[][],
  labels: number[][],
  rows: number,
  cols: number,
  rng: () => number,
): CourierRoute | null {
  const interiorByComponent = new Map<number, CellCoord[]>();
  const landByComponent = new Map<number, CellCoord[]>();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const componentId = labels[row]![col]!;
      if (componentId === -1) {
        continue;
      }

      const coord = { row, col };
      const landList = landByComponent.get(componentId) ?? [];
      landList.push(coord);
      landByComponent.set(componentId, landList);

      if (isInteriorGrass(grid, row, col, rows, cols)) {
        const interiorList = interiorByComponent.get(componentId) ?? [];
        interiorList.push(coord);
        interiorByComponent.set(componentId, interiorList);
      }
    }
  }

  const componentIds = [...landByComponent.keys()].filter(
    (id) => (landByComponent.get(id)?.length ?? 0) >= MIN_COMPONENT_CELLS,
  );

  if (componentIds.length < 3) {
    return null;
  }

  const cellsForComponent = (componentId: number): CellCoord[] => {
    const interior = interiorByComponent.get(componentId);
    if (interior && interior.length > 0) {
      return interior;
    }

    return landByComponent.get(componentId) ?? [];
  };

  const candidates: EndpointTriple[] = [];
  const poolCap = 24;

  for (let i = 0; i < componentIds.length; i += 1) {
    for (let j = 0; j < componentIds.length; j += 1) {
      for (let k = 0; k < componentIds.length; k += 1) {
        if (i === j || j === k || i === k) {
          continue;
        }

        const xCells = sampleEndpointCells(cellsForComponent(componentIds[i]!), rng);
        const yCells = sampleEndpointCells(cellsForComponent(componentIds[j]!), rng);
        const zCells = sampleEndpointCells(cellsForComponent(componentIds[k]!), rng);

        for (const start of xCells) {
          for (const waypoint of yCells) {
            for (const goal of zCells) {
              const spread = tripleSpread(start, waypoint, goal);
              const triple: EndpointTriple = { start, waypoint, goal, spread };

              if (candidates.length < poolCap) {
                candidates.push(triple);
                candidates.sort((a, b) => b.spread - a.spread);
                continue;
              }

              const worst = candidates[candidates.length - 1]!;
              if (spread <= worst.spread) {
                continue;
              }

              candidates.pop();
              candidates.push(triple);
              candidates.sort((a, b) => b.spread - a.spread);
            }
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const poolSize = Math.max(
    1,
    Math.ceil(candidates.length * ENDPOINT_TOP_FRACTION),
  );
  const picked = pickWeightedTriple(candidates.slice(0, poolSize), rng);

  return {
    start: picked.start,
    waypoint: picked.waypoint,
    goal: picked.goal,
  };
}

export function endpointSpread(route: CourierRoute): number {
  return tripleSpread(route.start, route.waypoint, route.goal);
}
