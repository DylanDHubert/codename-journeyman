import { hashStringToSeed } from "@/lib/game/seed";
import {
  hasBridgeAt,
  isWaterCell,
  type AppearanceContext,
} from "@/lib/rendering/cellAppearance";
import { terrainSurfaceRgb } from "@/lib/rendering/cellAppearance";
import type { Puzzle } from "@/lib/game/types";
import { WATER_SUBCELLS } from "@/lib/rendering/waterNoise";

type Rgb = { r: number; g: number; b: number };

/** GAP WIDTH MATCHES ONE TEXTURE PIXEL (SUB-CELL) */
export function terrainTexturePixelSize(cellSize: number): number {
  return Math.max(1, Math.floor(cellSize / WATER_SUBCELLS));
}

export function terrainGridGap(cellSize: number): number {
  return terrainTexturePixelSize(cellSize);
}

const LAND_TINT_ALPHA = 0.44;

function rgbString(color: Rgb): string {
  return `rgb(${color.r} ${color.g} ${color.b})`;
}

function rgbaString(color: Rgb, alpha: number): string {
  return `rgb(${color.r} ${color.g} ${color.b} / ${alpha})`;
}

function ditherHash(blockX: number, blockY: number, seed: number): number {
  let hash = (blockX * 374761393 + blockY * 668265263 + seed) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

function surfaceAt(
  puzzle: Puzzle,
  context: AppearanceContext,
  row: number,
  col: number,
): Rgb {
  if (row < 0 || col < 0 || row >= puzzle.rows || col >= puzzle.cols) {
    return { r: 12, g: 48, b: 92 };
  }

  return terrainSurfaceRgb(row, col, context);
}

type EdgeTransition =
  | { mode: "opaque"; primary: Rgb; secondary: Rgb }
  | { mode: "land-tint"; land: Rgb }
  | { mode: "skip" };

function edgeTransition(
  puzzle: Puzzle,
  context: AppearanceContext,
  rowA: number,
  colA: number,
  rowB: number,
  colB: number,
): EdgeTransition {
  if (
    hasBridgeAt(context.bridges, rowA, colA) ||
    hasBridgeAt(context.bridges, rowB, colB)
  ) {
    return { mode: "skip" };
  }

  const waterA = isWaterCell(puzzle, context.bridges, rowA, colA);
  const waterB = isWaterCell(puzzle, context.bridges, rowB, colB);

  if (waterA && waterB) {
    return { mode: "skip" };
  }

  if (waterA) {
    return { mode: "land-tint", land: surfaceAt(puzzle, context, rowB, colB) };
  }

  if (waterB) {
    return { mode: "land-tint", land: surfaceAt(puzzle, context, rowA, colA) };
  }

  return {
    mode: "opaque",
    primary: surfaceAt(puzzle, context, rowA, colA),
    secondary: surfaceAt(puzzle, context, rowB, colB),
  };
}

function cornerTransition(
  puzzle: Puzzle,
  context: AppearanceContext,
  row: number,
  col: number,
): EdgeTransition {
  const cells = [
    { row, col },
    { row, col: col + 1 },
    { row: row + 1, col },
    { row: row + 1, col: col + 1 },
  ];

  if (
    cells.some(({ row: r, col: c }) => hasBridgeAt(context.bridges, r, c)) ||
    cells.some(({ row: r, col: c }) => isWaterCell(puzzle, context.bridges, r, c))
  ) {
    return { mode: "skip" };
  }

  return {
    mode: "opaque",
    primary: surfaceAt(puzzle, context, row, col),
    secondary: surfaceAt(puzzle, context, row, col + 1),
  };
}

function fillDitherBetween(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  transition: EdgeTransition,
  blockSize: number,
  seed: number,
): void {
  if (width <= 0 || height <= 0 || transition.mode === "skip") {
    return;
  }

  const startX = Math.round(x);
  const startY = Math.round(y);

  for (let row = 0; row < height; row += blockSize) {
    const blockH = Math.min(blockSize, height - row);

    for (let col = 0; col < width; col += blockSize) {
      const blockW = Math.min(blockSize, width - col);
      const blockCol = Math.floor((startX + col) / blockSize);
      const blockRow = Math.floor((startY + row) / blockSize);
      const hash = ditherHash(blockCol, blockRow, seed);

      if (transition.mode === "land-tint") {
        if (hash <= 0.5) {
          continue;
        }

        ctx.fillStyle = rgbaString(transition.land, LAND_TINT_ALPHA);
        ctx.fillRect(startX + col, startY + row, blockW, blockH);
        continue;
      }

      const pick = hash > 0.5 ? transition.secondary : transition.primary;
      ctx.fillStyle = rgbString(pick);
      ctx.fillRect(startX + col, startY + row, blockW, blockH);
    }
  }
}

function fillCornerDither(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  row: number,
  col: number,
  puzzle: Puzzle,
  context: AppearanceContext,
  blockSize: number,
  seed: number,
): void {
  const transition = cornerTransition(puzzle, context, row, col);
  if (transition.mode === "skip" || transition.mode === "land-tint") {
    return;
  }

  const startX = Math.round(x);
  const startY = Math.round(y);
  const options = [
    surfaceAt(puzzle, context, row, col),
    surfaceAt(puzzle, context, row, col + 1),
    surfaceAt(puzzle, context, row + 1, col),
    surfaceAt(puzzle, context, row + 1, col + 1),
  ];

  for (let blockRow = 0; blockRow < height; blockRow += blockSize) {
    const blockH = Math.min(blockSize, height - blockRow);

    for (let blockCol = 0; blockCol < width; blockCol += blockSize) {
      const blockW = Math.min(blockSize, width - blockCol);
      const sampleCol = Math.floor((startX + blockCol) / blockSize);
      const sampleRow = Math.floor((startY + blockRow) / blockSize);
      const bucket = Math.min(3, Math.floor(ditherHash(sampleCol, sampleRow, seed) * 4));

      ctx.fillStyle = rgbString(options[bucket]!);
      ctx.fillRect(startX + blockCol, startY + blockRow, blockW, blockH);
    }
  }
}

function drawWhiteGrid(
  ctx: CanvasRenderingContext2D,
  puzzle: Puzzle,
  context: AppearanceContext,
  rows: number,
  cols: number,
  cellSize: number,
  gap: number,
): void {
  const stride = cellSize + gap;

  ctx.fillStyle = "rgb(255 255 255 / 0.72)";

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (hasBridgeAt(context.bridges, row, col)) {
        continue;
      }

      const x = col * stride;
      const y = row * stride;

      ctx.fillRect(x, y, cellSize, 1);
      ctx.fillRect(x, y + cellSize - 1, cellSize, 1);
      ctx.fillRect(x, y, 1, cellSize);
      ctx.fillRect(x + cellSize - 1, y, 1, cellSize);
    }
  }
}

export function drawTerrainBorders(
  ctx: CanvasRenderingContext2D,
  puzzle: Puzzle,
  context: AppearanceContext,
  cellSize: number,
  gap: number,
): void {
  const { rows, cols } = puzzle;
  const stride = cellSize + gap;
  const blockSize = terrainTexturePixelSize(cellSize);
  const seed = hashStringToSeed(`${puzzle.seed}-terrain-border`);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      fillDitherBetween(
        ctx,
        col * stride + cellSize,
        row * stride,
        gap,
        cellSize,
        edgeTransition(puzzle, context, row, col, row, col + 1),
        blockSize,
        seed,
      );
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      fillDitherBetween(
        ctx,
        col * stride,
        row * stride + cellSize,
        cellSize,
        gap,
        edgeTransition(puzzle, context, row, col, row + 1, col),
        blockSize,
        seed,
      );
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      fillCornerDither(
        ctx,
        col * stride + cellSize,
        row * stride + cellSize,
        gap,
        gap,
        row,
        col,
        puzzle,
        context,
        blockSize,
        seed,
      );
    }
  }

  drawWhiteGrid(ctx, puzzle, context, rows, cols, cellSize, gap);
}
