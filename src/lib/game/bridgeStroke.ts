import { inBounds } from "./coords";
import type { CellCoord } from "./types";

export type StrokeMode = "add" | "remove";

/** MAP POINTER POSITION TO GRID CELL; NULL IN GAPS OR OUT OF BOUNDS */
export function cellAtPointer(
  gridRect: DOMRect,
  clientX: number,
  clientY: number,
  rows: number,
  cols: number,
  cellSize: number,
  gap: number,
): CellCoord | null {
  const x = clientX - gridRect.left;
  const y = clientY - gridRect.top;
  const stride = cellSize + gap;
  const col = Math.floor(x / stride);
  const row = Math.floor(y / stride);

  if (!inBounds(row, col, rows, cols)) {
    return null;
  }

  const localX = x - col * stride;
  const localY = y - row * stride;

  if (localX > cellSize || localY > cellSize) {
    return null;
  }

  return { row, col };
}

/** BRESENHAM LINE — FILLS SKIPPED CELLS ON FAST DRAGS */
export function cellsOnLineSegment(from: CellCoord, to: CellCoord): CellCoord[] {
  const cells: CellCoord[] = [];

  let col = from.col;
  let row = from.row;
  const endCol = to.col;
  const endRow = to.row;

  const dx = Math.abs(endCol - col);
  const dy = Math.abs(endRow - row);
  const stepCol = col < endCol ? 1 : -1;
  const stepRow = row < endRow ? 1 : -1;
  let err = dx - dy;

  while (true) {
    cells.push({ row, col });

    if (col === endCol && row === endRow) {
      break;
    }

    const err2 = 2 * err;
    if (err2 > -dy) {
      err -= dy;
      col += stepCol;
    }
    if (err2 < dx) {
      err += dx;
      row += stepRow;
    }
  }

  return cells;
}
