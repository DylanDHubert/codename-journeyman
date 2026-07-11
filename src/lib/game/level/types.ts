import type { CellCoord, Mission, TileKind } from "../types";

export type TerrainKind = TileKind;

export const TERRAIN_KINDS: readonly TerrainKind[] = [
  "ocean",
  "marsh",
  "beach",
  "grass",
  "cliff",
];

export type ObjectDefId = string;
export type RouteDefId = string;

export type LevelObject = {
  defId: ObjectDefId;
  at: CellCoord;
  config?: Record<string, unknown>;
};

export type LevelRoute = {
  id: string;
  defId: RouteDefId;
  closed: boolean;
  path: CellCoord[];
  config?: Record<string, unknown>;
};

/** THE CANONICAL MAP — TERRAIN + OBJECTS + ROUTES + MISSION */
export type Level = {
  id: string;
  name: string;
  seed: string;
  rows: number;
  cols: number;
  terrain: TileKind[];
  objects: LevelObject[];
  routes: LevelRoute[];
  mission: Mission;
};

export const LEVEL_FILE_VERSION = 2;

export type LevelFile = {
  version: number;
  id: string;
  name: string;
  seed: string;
  grid: { rows: number; cols: number };
  terrain: string;
  mission: {
    x: [number, number];
    y: [number, number];
    z: [number, number];
  };
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
