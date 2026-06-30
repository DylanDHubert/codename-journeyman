import { indexFor } from "./coords";
import type { CellCoord, Puzzle, PuzzleCell } from "./types";

/** ROTATE PUZZLE 90° CLOCKWISE — PORTRAIT GENERATION → LANDSCAPE DESKTOP VIEW */
export function rotatePuzzleClockwise(puzzle: Puzzle): Puzzle {
  const { rows, cols, cells, start, waypoint, goal } = puzzle;
  const newRows = cols;
  const newCols = rows;

  const rotateCoord = (coord: CellCoord): CellCoord => ({
    row: coord.col,
    col: rows - 1 - coord.row,
  });

  const rotatedCells: PuzzleCell[] = Array.from(
    { length: newRows * newCols },
    () => ({
      kind: "ocean",
      role: "none",
      componentId: -1,
    }),
  );

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const rotated = rotateCoord({ row, col });
      rotatedCells[indexFor(rotated.row, rotated.col, newCols)] =
        cells[indexFor(row, col, cols)]!;
    }
  }

  return {
    ...puzzle,
    rows: newRows,
    cols: newCols,
    cells: rotatedCells,
    start: rotateCoord(start),
    waypoint: rotateCoord(waypoint),
    goal: rotateCoord(goal),
  };
}
