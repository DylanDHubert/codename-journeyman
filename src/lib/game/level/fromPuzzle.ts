import { isLandKind } from "../tiles";
import type { Puzzle, PuzzleCell, PuzzleGrid, TileKind } from "../types";
import type { Level, LevelObject } from "./types";

// STABLE-ISH ID FROM A SEED (EDITOR LEVELS ARE KEYED BY SEED)
function levelIdFromSeed(seed: string): string {
  const safe = seed.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return safe.replace(/^-+|-+$/g, "") || "level";
}

/**
 * CONVERT A GENERATED PUZZLE INTO THE LAYERED LEVEL MODEL.
 * WHIRLPOOL TERRAIN BECOMES OCEAN + A WHIRLPOOL OBJECT. COURIER ROLES ARE
 * DROPPED — ROUTES ARE AUTHORED WITH THE ROUTE TOOL, NOT GENERATED.
 */
export function puzzleToLevel(puzzle: PuzzleGrid, name?: string): Level {
  const terrain: TileKind[] = new Array(puzzle.cells.length);
  const objects: LevelObject[] = [];

  for (let index = 0; index < puzzle.cells.length; index += 1) {
    const cell = puzzle.cells[index]!;
    const row = Math.floor(index / puzzle.cols);
    const col = index % puzzle.cols;

    if (cell.kind === "whirlpool") {
      terrain[index] = "ocean";
      objects.push({ defId: "whirlpool", at: { row, col } });
    } else {
      terrain[index] = cell.kind;
    }
  }

  const id = levelIdFromSeed(puzzle.seed);

  return {
    id,
    name: name ?? id,
    seed: puzzle.seed,
    rows: puzzle.rows,
    cols: puzzle.cols,
    terrain,
    objects,
    routes: [],
  };
}

/**
 * BUILD A RENDER-ONLY PUZZLE FROM A LEVEL'S TERRAIN LAYER SO THE EXISTING
 * TERRAIN OVERLAYS CAN PAINT IT. OBJECTS/ROUTES ARE DRAWN BY THEIR OWN LAYERS.
 */
export function levelToPuzzle(level: Level): Puzzle {
  const cells: PuzzleCell[] = level.terrain.map((kind) => ({
    kind,
    role: "none",
    componentId: isLandKind(kind) ? 0 : -1,
  }));

  const origin = { row: 0, col: 0 };

  return {
    seed: level.seed,
    rows: level.rows,
    cols: level.cols,
    cells,
    start: origin,
    waypoint: origin,
    goal: origin,
    parCost: 0,
  };
}
