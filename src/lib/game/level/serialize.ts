import type { TileKind } from "../types";
import {
  LEVEL_FILE_VERSION,
  type Level,
  type LevelFile,
  type LevelObject,
  type LevelRoute,
} from "./types";

// SINGLE-CHAR TERRAIN CODES FOR COMPACT SERIALIZATION
const TERRAIN_TO_CODE: Record<Exclude<TileKind, "whirlpool">, string> = {
  ocean: "o",
  marsh: "m",
  beach: "b",
  grass: "g",
  cliff: "c",
};

const CODE_TO_TERRAIN: Record<string, TileKind> = {
  o: "ocean",
  m: "marsh",
  b: "beach",
  g: "grass",
  c: "cliff",
};

function encodeTerrain(terrain: TileKind[]): string {
  return terrain
    .map((kind) => TERRAIN_TO_CODE[kind as Exclude<TileKind, "whirlpool">] ?? "o")
    .join("");
}

function decodeTerrain(encoded: string, expectedLength: number): TileKind[] {
  const terrain: TileKind[] = [];
  for (let index = 0; index < expectedLength; index += 1) {
    terrain.push(CODE_TO_TERRAIN[encoded[index] ?? "o"] ?? "ocean");
  }
  return terrain;
}

export function serializeLevel(level: Level, author?: string): LevelFile {
  return {
    version: LEVEL_FILE_VERSION,
    id: level.id,
    name: level.name,
    seed: level.seed,
    grid: { rows: level.rows, cols: level.cols },
    terrain: encodeTerrain(level.terrain),
    objects: level.objects.map((object) => ({
      defId: object.defId,
      row: object.at.row,
      col: object.at.col,
      ...(object.config ? { config: object.config } : {}),
    })),
    routes: level.routes.map((route) => ({
      id: route.id,
      defId: route.defId,
      closed: route.closed,
      path: route.path.map((cell) => [cell.row, cell.col] as [number, number]),
      ...(route.config ? { config: route.config } : {}),
    })),
    meta: {
      ...(author ? { author } : {}),
      createdAt: new Date().toISOString(),
    },
  };
}

export function deserializeLevel(file: LevelFile): Level {
  const { rows, cols } = file.grid;
  const terrain = decodeTerrain(file.terrain, rows * cols);

  const objects: LevelObject[] = file.objects.map((object) => ({
    defId: object.defId,
    at: { row: object.row, col: object.col },
    ...(object.config ? { config: object.config } : {}),
  }));

  const routes: LevelRoute[] = file.routes.map((route) => ({
    id: route.id,
    defId: route.defId,
    closed: route.closed,
    path: route.path.map(([row, col]) => ({ row, col })),
    ...(route.config ? { config: route.config } : {}),
  }));

  return {
    id: file.id,
    name: file.name,
    seed: file.seed,
    rows,
    cols,
    terrain,
    objects,
    routes,
  };
}

// WHIRLPOOL MUST NEVER APPEAR IN THE TERRAIN LAYER (IT IS AN OBJECT)
export function levelHasInvalidTerrain(level: Level): boolean {
  return level.terrain.some((kind) => kind === "whirlpool");
}
