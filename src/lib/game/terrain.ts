import { DIRECTIONS } from "./constants";
import { cellKey, indexFor, inBounds } from "./coords";
import { isLandKind } from "./rules";
import type { CellCoord, TileKind } from "./types";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { terrainKindAt } from "@/lib/rendering/terrainView";

export type TerrainMaps = {
  distanceFromLand: number[][];
  isBeach: boolean[][];
};

const WATER_KINDS: TileKind[] = ["ocean", "marsh"];

function isWaterKind(kind: TileKind): boolean {
  return WATER_KINDS.includes(kind);
}

export function buildTerrainMaps(view: TerrainView): TerrainMaps {
  const { rows, cols } = view;
  const distanceFromLand = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(Infinity),
  );
  const isBeach = Array.from({ length: rows }, () =>
    Array<boolean>(cols).fill(false),
  );
  const queue: CellCoord[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kind = terrainKindAt(view, row, col)!;
      if (!isLandKind(kind)) {
        continue;
      }

      distanceFromLand[row]![col] = 0;
      queue.push({ row, col });

      if (kind === "beach") {
        isBeach[row]![col] = true;
      }

      for (const { dr, dc } of DIRECTIONS) {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc, rows, cols)) {
          continue;
        }
        const neighbor = terrainKindAt(view, nr, nc)!;
        if (isWaterKind(neighbor)) {
          isBeach[row]![col] = kind === "beach" || kind === "grass";
          break;
        }
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const { row, col } = queue[head]!;
    head += 1;
    const currentDistance = distanceFromLand[row]![col]!;

    for (const { dr, dc } of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(nr, nc, rows, cols)) {
        continue;
      }
      const nextDistance = currentDistance + 1;
      if (nextDistance >= distanceFromLand[nr]![nc]!) {
        continue;
      }
      distanceFromLand[nr]![nc] = nextDistance;
      queue.push({ row: nr, col: nc });
    }
  }

  return { distanceFromLand, isBeach };
}

export function waterDepthAt(distance: number, maxDepth: number): number {
  if (!Number.isFinite(distance)) {
    return 1;
  }
  const clamped = Math.min(distance, maxDepth);
  return clamped / maxDepth;
}

export function maxWaterDistance(maps: TerrainMaps): number {
  let max = 1;
  for (const row of maps.distanceFromLand) {
    for (const value of row) {
      if (Number.isFinite(value) && value > max) {
        max = value;
      }
    }
  }
  return max;
}

export function pathKeySet(path: CellCoord[]): Set<string> {
  return new Set(path.map(({ row, col }) => cellKey(row, col)));
}
