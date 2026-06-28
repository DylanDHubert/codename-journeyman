import { DIRECTIONS } from "./constants";
import { cellKey, indexFor, inBounds } from "./coords";
import {
  BRIDGEABLE_WATER,
  LAND_TILES,
  MARSH_BRIDGE_COST,
  OCEAN_BRIDGE_COST,
  type CellCoord,
  type CourierRoute,
  type PuzzleCell,
  type PuzzleGrid,
  type TileKind,
} from "./types";

export function isLandKind(kind: TileKind): boolean {
  return (LAND_TILES as readonly string[]).includes(kind);
}

export function isBridgeableWaterKind(kind: TileKind): boolean {
  return (BRIDGEABLE_WATER as readonly string[]).includes(kind);
}

export function getCellAt(
  puzzle: PuzzleGrid,
  row: number,
  col: number,
): PuzzleCell | undefined {
  if (!inBounds(row, col, puzzle.rows, puzzle.cols)) {
    return undefined;
  }

  return puzzle.cells[indexFor(row, col, puzzle.cols)];
}

export function bridgePlacementCost(
  puzzle: PuzzleGrid,
  row: number,
  col: number,
): number {
  const kind = getCellAt(puzzle, row, col)?.kind;
  if (kind === "marsh") {
    return MARSH_BRIDGE_COST;
  }
  if (kind === "ocean") {
    return OCEAN_BRIDGE_COST;
  }

  return Infinity;
}

export function totalBridgeCost(
  puzzle: PuzzleGrid,
  bridges: Set<string>,
): number {
  let cost = 0;

  for (const key of bridges) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    cost += bridgePlacementCost(puzzle, row, col);
  }

  return cost;
}

export function canPlaceBridge(
  puzzle: PuzzleGrid,
  row: number,
  col: number,
): boolean {
  const cell = getCellAt(puzzle, row, col);
  return Boolean(cell && isBridgeableWaterKind(cell.kind));
}

export function isWalkable(
  puzzle: PuzzleGrid,
  row: number,
  col: number,
  bridges: Set<string>,
): boolean {
  const cell = getCellAt(puzzle, row, col);
  if (!cell) {
    return false;
  }

  if (isLandKind(cell.kind)) {
    return true;
  }

  return bridges.has(cellKey(row, col));
}

/** CLIFFS CAN SIT BESIDE BRIDGES BUT CANNOT STEP ON/OFF THEM */
export function canTraverse(
  puzzle: PuzzleGrid,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  bridges: Set<string>,
): boolean {
  if (!isWalkable(puzzle, toRow, toCol, bridges)) {
    return false;
  }

  if (!isWalkable(puzzle, fromRow, fromCol, bridges)) {
    return false;
  }

  const fromCell = getCellAt(puzzle, fromRow, fromCol)!;
  const toCell = getCellAt(puzzle, toRow, toCol)!;
  const fromIsCliff = fromCell.kind === "cliff";
  const toIsCliff = toCell.kind === "cliff";
  const fromIsBridge = bridges.has(cellKey(fromRow, fromCol));
  const toIsBridge = bridges.has(cellKey(toRow, toCol));

  if ((fromIsCliff && toIsBridge) || (fromIsBridge && toIsCliff)) {
    return false;
  }

  return true;
}

/** HEURISTIC GRID — CLIFF↔BRIDGEABLE WATER BLOCKED LIKE GAMEPLAY */
export function canTraverseHeuristic(
  puzzle: PuzzleGrid,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): boolean {
  const fromCell = getCellAt(puzzle, fromRow, fromCol);
  const toCell = getCellAt(puzzle, toRow, toCol);
  if (!fromCell || !toCell) {
    return false;
  }

  const toPassable =
    isLandKind(toCell.kind) || canPlaceBridge(puzzle, toRow, toCol);
  if (!toPassable) {
    return false;
  }

  const fromPassable =
    isLandKind(fromCell.kind) || canPlaceBridge(puzzle, fromRow, fromCol);
  if (!fromPassable) {
    return false;
  }

  const fromIsCliff = fromCell.kind === "cliff";
  const toIsCliff = toCell.kind === "cliff";
  const fromIsBridgeableWater = isBridgeableWaterKind(fromCell.kind);
  const toIsBridgeableWater = isBridgeableWaterKind(toCell.kind);

  if (
    (fromIsCliff && toIsBridgeableWater) ||
    (fromIsBridgeableWater && toIsCliff)
  ) {
    return false;
  }

  return true;
}

export function forEachTraversableNeighbor(
  puzzle: PuzzleGrid,
  row: number,
  col: number,
  bridges: Set<string>,
  visit: (neighbor: CellCoord) => void,
): void {
  for (const { dr, dc } of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (canTraverse(puzzle, row, col, nr, nc, bridges)) {
      visit({ row: nr, col: nc });
    }
  }
}

export function courierCheckpoints(puzzle: CourierRoute): CellCoord[] {
  return [puzzle.start, puzzle.waypoint, puzzle.goal];
}

export function manhattanDistance(a: CellCoord, b: CellCoord): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function defaultTileForLegacyTerrain(
  terrain: "land" | "water",
): TileKind {
  return terrain === "land" ? "grass" : "ocean";
}
