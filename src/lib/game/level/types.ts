import type { CellCoord, TileKind } from "../types";

// TERRAIN KINDS ALLOWED IN THE LAYERED MODEL (WHIRLPOOL IS AN OBJECT NOW)
export type TerrainKind = Exclude<TileKind, "whirlpool">;

export const TERRAIN_KINDS: readonly TerrainKind[] = [
  "ocean",
  "marsh",
  "beach",
  "grass",
  "cliff",
];

export type ObjectDefId = string;
export type RouteDefId = string;

// A SINGLE-CELL BUILDING/ENTITY PLACED ON THE TERRAIN LAYER
export type LevelObject = {
  defId: ObjectDefId;
  at: CellCoord;
  config?: Record<string, unknown>;
};

// AN ORDERED PATH (PIRATE LOOP / MERCHANT LANE) DRAWN ON THE MAP
export type LevelRoute = {
  id: string;
  defId: RouteDefId;
  /** LOOP BACK TO THE FIRST CELL (PIRATES) */
  closed: boolean;
  path: CellCoord[];
  config?: Record<string, unknown>;
};

// THE AUTHORED LEVEL — THREE LAYERS: TERRAIN, OBJECTS, ROUTES
export type Level = {
  id: string;
  name: string;
  seed: string;
  rows: number;
  cols: number;
  /** ROWS*COLS TERRAIN KINDS; NEVER CONTAINS "whirlpool" */
  terrain: TileKind[];
  objects: LevelObject[];
  routes: LevelRoute[];
};

// ============================================================================
// SERIALIZABLE FILE FORMAT — public/levels/<id>.json
// ============================================================================

export const LEVEL_FILE_VERSION = 1;

export type LevelFile = {
  version: number;
  id: string;
  name: string;
  seed: string;
  grid: { rows: number; cols: number };
  /** ROWS*COLS SINGLE-CHAR TERRAIN CODES (SEE serialize.ts) */
  terrain: string;
  objects: Array<{
    defId: string;
    row: number;
    col: number;
    config?: Record<string, unknown>;
  }>;
  routes: Array<{
    id: string;
    defId: string;
    closed: boolean;
    path: Array<[number, number]>;
    config?: Record<string, unknown>;
  }>;
  meta?: {
    author?: string;
    createdAt?: string;
  };
};
