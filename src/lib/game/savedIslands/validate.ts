import { BRIDGEABLE_WATER, LAND_TILES } from "@/lib/game/types";
import type { CellRole, PuzzleCell, PuzzleGrid, TileKind } from "@/lib/game/types";

import { SAVED_ISLAND_FORMAT_VERSION } from "./types";
import type { SavedIslandRecord, SavedIslandsManifest } from "./types";

const TILE_KINDS = new Set<TileKind>([
  ...LAND_TILES,
  ...BRIDGEABLE_WATER,
  "whirlpool",
]);

const CELL_ROLES = new Set<CellRole>(["none", "start", "waypoint", "goal"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCoord(value: unknown): value is { row: number; col: number } {
  return (
    isRecord(value) &&
    typeof value.row === "number" &&
    Number.isInteger(value.row) &&
    typeof value.col === "number" &&
    Number.isInteger(value.col)
  );
}

function isPuzzleCell(value: unknown): value is PuzzleCell {
  return (
    isRecord(value) &&
    typeof value.kind === "string" &&
    TILE_KINDS.has(value.kind as TileKind) &&
    typeof value.role === "string" &&
    CELL_ROLES.has(value.role as CellRole) &&
    typeof value.componentId === "number" &&
    Number.isInteger(value.componentId)
  );
}

export function validatePuzzleGrid(value: unknown): PuzzleGrid {
  if (!isRecord(value)) {
    throw new Error("Saved island puzzle must be an object");
  }

  const { seed, rows, cols, cells, start, waypoint, goal } = value;

  if (typeof seed !== "string" || seed.length === 0) {
    throw new Error("Saved island puzzle is missing seed");
  }

  if (
    typeof rows !== "number" ||
    !Number.isInteger(rows) ||
    rows < 1 ||
    typeof cols !== "number" ||
    !Number.isInteger(cols) ||
    cols < 1
  ) {
    throw new Error("Saved island puzzle has invalid dimensions");
  }

  if (!Array.isArray(cells) || cells.length !== rows * cols) {
    throw new Error("Saved island puzzle cells length does not match grid size");
  }

  if (!cells.every(isPuzzleCell)) {
    throw new Error("Saved island puzzle has invalid cell data");
  }

  if (!isCoord(start) || !isCoord(waypoint) || !isCoord(goal)) {
    throw new Error("Saved island puzzle is missing X, Y, or Z coordinates");
  }

  const roles = new Set<CellRole>();
  for (const cell of cells) {
    if (cell.role !== "none") {
      roles.add(cell.role);
    }
  }

  for (const required of ["start", "waypoint", "goal"] as const) {
    if (!roles.has(required)) {
      throw new Error(`Saved island puzzle is missing ${required} role`);
    }
  }

  return {
    seed,
    rows,
    cols,
    cells: cells as PuzzleCell[],
    start,
    waypoint,
    goal,
  };
}

export function validateSavedIslandRecord(value: unknown): SavedIslandRecord {
  if (!isRecord(value)) {
    throw new Error("Saved island file must be an object");
  }

  if (value.version !== SAVED_ISLAND_FORMAT_VERSION) {
    throw new Error(`Unsupported saved island version: ${String(value.version)}`);
  }

  for (const key of ["id", "name", "savedAt", "fingerprint", "sourceSeed"] as const) {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      throw new Error(`Saved island is missing ${key}`);
    }
  }

  if (typeof value.parCost !== "number" || !Number.isFinite(value.parCost)) {
    throw new Error("Saved island is missing parCost");
  }

  const puzzle = validatePuzzleGrid(value.puzzle);

  return {
    version: SAVED_ISLAND_FORMAT_VERSION,
    id: value.id as string,
    name: value.name as string,
    savedAt: value.savedAt as string,
    fingerprint: value.fingerprint as string,
    sourceSeed: value.sourceSeed as string,
    parCost: value.parCost,
    puzzle,
  };
}

export function validateManifest(value: unknown): SavedIslandsManifest {
  if (!isRecord(value)) {
    return { version: SAVED_ISLAND_FORMAT_VERSION, islands: [] };
  }

  if (value.version !== SAVED_ISLAND_FORMAT_VERSION) {
    throw new Error(`Unsupported manifest version: ${String(value.version)}`);
  }

  if (!Array.isArray(value.islands)) {
    return { version: SAVED_ISLAND_FORMAT_VERSION, islands: [] };
  }

  const islands: SavedIslandsManifest["islands"] = [];

  for (const entry of value.islands) {
    if (!isRecord(entry)) {
      continue;
    }

    if (
      typeof entry.id !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.savedAt !== "string" ||
      typeof entry.fingerprint !== "string" ||
      typeof entry.sourceSeed !== "string" ||
      typeof entry.parCost !== "number" ||
      typeof entry.rows !== "number" ||
      typeof entry.cols !== "number"
    ) {
      continue;
    }

    islands.push({
      id: entry.id,
      name: entry.name,
      savedAt: entry.savedAt,
      fingerprint: entry.fingerprint,
      sourceSeed: entry.sourceSeed,
      parCost: entry.parCost,
      rows: entry.rows,
      cols: entry.cols,
    });
  }

  return { version: SAVED_ISLAND_FORMAT_VERSION, islands };
}
