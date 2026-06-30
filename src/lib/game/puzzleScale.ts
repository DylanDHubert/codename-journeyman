import { indexFor } from "./coords";
import type { CellCoord, Puzzle, PuzzleCell } from "./types";

function scaleCell(parent: PuzzleCell, subRow: number, subCol: number): PuzzleCell {
  if (parent.kind === "ocean" || parent.kind === "marsh") {
    if (subRow === 0 && subCol === 0) {
      return parent;
    }

    return {
      kind: "ocean",
      role: "none",
      componentId: -1,
    };
  }

  return {
    ...parent,
    role: subRow === 0 && subCol === 0 ? parent.role : "none",
  };
}

function scaleCoord(coord: CellCoord): CellCoord {
  return {
    row: coord.row * 2,
    col: coord.col * 2,
  };
}

/** DOUBLE ROWS AND COLS — BRIDGE SLOTS ONLY ON THE TOP-LEFT SUBCELL OF EACH PARENT TILE */
export function scalePuzzle2x(puzzle: Puzzle): Puzzle {
  const parentRows = puzzle.rows;
  const parentCols = puzzle.cols;
  const rows = parentRows * 2;
  const cols = parentCols * 2;
  const cells: PuzzleCell[] = Array.from({ length: rows * cols }, () => ({
    kind: "ocean",
    role: "none",
    componentId: -1,
  }));

  for (let row = 0; row < parentRows; row += 1) {
    for (let col = 0; col < parentCols; col += 1) {
      const parent = puzzle.cells[indexFor(row, col, parentCols)]!;

      for (let subRow = 0; subRow < 2; subRow += 1) {
        for (let subCol = 0; subCol < 2; subCol += 1) {
          const targetRow = row * 2 + subRow;
          const targetCol = col * 2 + subCol;
          cells[indexFor(targetRow, targetCol, cols)] = scaleCell(
            parent,
            subRow,
            subCol,
          );
        }
      }
    }
  }

  return {
    ...puzzle,
    rows,
    cols,
    cells,
    start: scaleCoord(puzzle.start),
    waypoint: scaleCoord(puzzle.waypoint),
    goal: scaleCoord(puzzle.goal),
  };
}
