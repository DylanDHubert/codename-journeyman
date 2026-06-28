import type { CellCoord } from "./types";

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseCellKey(key: string): CellCoord {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

export function coordKey(coord: CellCoord): string {
  return cellKey(coord.row, coord.col);
}

export function inBounds(
  row: number,
  col: number,
  rows: number,
  cols: number,
): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

export function indexFor(row: number, col: number, cols: number): number {
  return row * cols + col;
}
