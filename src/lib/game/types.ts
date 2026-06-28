export type TileKind =
  | "grass"
  | "beach"
  | "cliff"
  | "ocean"
  | "marsh"
  | "whirlpool";

export type CellRole = "none" | "start" | "waypoint" | "goal";

export type CellCoord = {
  row: number;
  col: number;
};

export type PuzzleCell = {
  kind: TileKind;
  role: CellRole;
  /** COMPONENT ID FOR LAND TILES; -1 FOR WATER */
  componentId: number;
};

export type CourierRoute = {
  /** X — DEPARTURE */
  start: CellCoord;
  /** Y — MUST VISIT BEFORE Z */
  waypoint: CellCoord;
  /** Z — FINAL DESTINATION */
  goal: CellCoord;
};

export type PuzzleGrid = CourierRoute & {
  seed: string;
  rows: number;
  cols: number;
  cells: PuzzleCell[];
};

export type Puzzle = PuzzleGrid & {
  /** MINIMUM TOTAL BRIDGE COST FOR X → Y → Z */
  parCost: number;
};

export type SimulationResult = {
  connected: boolean;
  bridgeCount: number;
  bridgeCost: number;
  /** FULL COURIER PATH X → Y → Z (IF CONNECTED) */
  path: CellCoord[];
  reachable: Set<string>;
};

export type GamePhase = "editing" | "success" | "disconnected";

export type GameState = {
  puzzle: Puzzle;
  bridges: Set<string>;
  phase: GamePhase;
  result: SimulationResult | null;
  showComponents: boolean;
};

/** LAND TILES — WALKABLE WITHOUT BRIDGES */
export const LAND_TILES: readonly TileKind[] = ["grass", "beach", "cliff"];

/** WATER TILES WHERE A BRIDGE MAY BE PLACED */
export const BRIDGEABLE_WATER: readonly TileKind[] = ["ocean", "marsh"];

export const MARSH_BRIDGE_COST = 2;
export const OCEAN_BRIDGE_COST = 1;
