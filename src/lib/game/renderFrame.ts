import type { CellCoord, Puzzle, PuzzleCell, PuzzleGrid } from "@/lib/game/types";

/** ONE-CELL RING AROUND PLAYABLE GRID FOR RENDERING BORDERS AND WATER GAPS */
export const TERRAIN_BORDER_RING = 1;

export type PuzzleRenderFrame = {
  rows: number;
  cols: number;
  cells: PuzzleCell[];
  /** PLAYABLE TOP-LEFT IN FRAME COORDS */
  originRow: number;
  originCol: number;
};

const OCEAN_BORDER_CELL: PuzzleCell = {
  kind: "ocean",
  role: "none",
  componentId: -1,
};

export function frameCellIndex(row: number, col: number, cols: number): number {
  return row * cols + col;
}

export function frameCellAt(
  frame: PuzzleRenderFrame,
  row: number,
  col: number,
): PuzzleCell | null {
  if (row < 0 || col < 0 || row >= frame.rows || col >= frame.cols) {
    return null;
  }

  return frame.cells[frameCellIndex(row, col, frame.cols)] ?? null;
}

export function playableToFrame(
  row: number,
  col: number,
  frame: PuzzleRenderFrame,
): CellCoord {
  return {
    row: row + frame.originRow,
    col: col + frame.originCol,
  };
}

export function frameToPlayable(
  row: number,
  col: number,
  frame: PuzzleRenderFrame,
  playableRows: number,
  playableCols: number,
): CellCoord | null {
  const playableRow = row - frame.originRow;
  const playableCol = col - frame.originCol;

  if (
    playableRow < 0 ||
    playableCol < 0 ||
    playableRow >= playableRows ||
    playableCol >= playableCols
  ) {
    return null;
  }

  return { row: playableRow, col: playableCol };
}

export function synthesizeWaterBorderFrame(puzzle: PuzzleGrid): PuzzleRenderFrame {
  const ring = TERRAIN_BORDER_RING;
  const rows = puzzle.rows + 2 * ring;
  const cols = puzzle.cols + 2 * ring;
  const cells: PuzzleCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const playableRow = row - ring;
      const playableCol = col - ring;

      if (
        playableRow >= 0 &&
        playableCol >= 0 &&
        playableRow < puzzle.rows &&
        playableCol < puzzle.cols
      ) {
        cells.push(
          puzzle.cells[playableRow * puzzle.cols + playableCol]!,
        );
      } else {
        cells.push(OCEAN_BORDER_CELL);
      }
    }
  }

  return {
    rows,
    cols,
    cells,
    originRow: ring,
    originCol: ring,
  };
}

export function getPuzzleRenderFrame(puzzle: Puzzle): PuzzleRenderFrame {
  return puzzle.renderFrame ?? synthesizeWaterBorderFrame(puzzle);
}

export function puzzleGridFromRenderFrame(
  puzzle: Puzzle,
  frame: PuzzleRenderFrame,
): PuzzleGrid {
  const shift = (coord: CellCoord): CellCoord => ({
    row: coord.row + frame.originRow,
    col: coord.col + frame.originCol,
  });

  return {
    seed: puzzle.seed,
    rows: frame.rows,
    cols: frame.cols,
    cells: frame.cells,
    start: shift(puzzle.start),
    waypoint: shift(puzzle.waypoint),
    goal: shift(puzzle.goal),
  };
}

export function cropPlayableCells(
  frameCells: PuzzleCell[],
  frameCols: number,
  originRow: number,
  originCol: number,
  playableRows: number,
  playableCols: number,
): PuzzleCell[] {
  const cells: PuzzleCell[] = [];

  for (let row = 0; row < playableRows; row += 1) {
    for (let col = 0; col < playableCols; col += 1) {
      const frameRow = originRow + row;
      const frameCol = originCol + col;
      cells.push(
        frameCells[frameCellIndex(frameRow, frameCol, frameCols)]!,
      );
    }
  }

  return cells;
}

export function shiftCoord(
  coord: CellCoord,
  deltaRow: number,
  deltaCol: number,
): CellCoord {
  return {
    row: coord.row + deltaRow,
    col: coord.col + deltaCol,
  };
}

export function routeInsideInnerRing(
  route: { start: CellCoord; waypoint: CellCoord; goal: CellCoord },
  ring: number,
  rows: number,
  cols: number,
): boolean {
  const coords = [route.start, route.waypoint, route.goal];
  const maxRow = rows - ring - 1;
  const maxCol = cols - ring - 1;

  return coords.every(
    ({ row, col }) =>
      row >= ring && col >= ring && row <= maxRow && col <= maxCol,
  );
}
