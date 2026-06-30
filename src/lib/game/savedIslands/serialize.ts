import type { Puzzle, PuzzleGrid } from "@/lib/game/types";

import type { SavedIslandRecord, SavedIslandSummary } from "./types";

/** Strip runtime-only fields — bridges live in game state, never in saved data. */
export function puzzleToGrid(puzzle: Puzzle): PuzzleGrid {
  const { parCost: _parCost, ...grid } = puzzle;
  return structuredClone(grid);
}

export function gridToPuzzle(grid: PuzzleGrid, parCost: number): Puzzle {
  return {
    ...structuredClone(grid),
    parCost,
  };
}

export function recordToSummary(record: SavedIslandRecord): SavedIslandSummary {
  return {
    id: record.id,
    name: record.name,
    savedAt: record.savedAt,
    fingerprint: record.fingerprint,
    sourceSeed: record.sourceSeed,
    parCost: record.parCost,
    rows: record.puzzle.rows,
    cols: record.puzzle.cols,
  };
}
