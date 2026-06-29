"use client";

import { useEffect, useRef } from "react";

import { grassBaseForCell, type AppearanceContext } from "@/lib/rendering/cellAppearance";
import {
  GRASS_SUBCELLS,
  modulateGrassColorRgb,
  type GrassTerrainField,
} from "@/lib/rendering/grassTerrain";
import type { Puzzle } from "@/lib/game/types";

type GrassCanvasOverlayProps = {
  puzzle: Puzzle;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
};

function isGrassCell(
  puzzle: Puzzle,
  bridges: Set<string>,
  row: number,
  col: number,
): boolean {
  const key = `${row},${col}`;
  if (bridges.has(key)) {
    return false;
  }

  return puzzle.cells[row * puzzle.cols + col]?.kind === "grass";
}

export function drawGrassSurface(
  ctx: CanvasRenderingContext2D,
  puzzle: Puzzle,
  context: AppearanceContext,
  grassTerrain: GrassTerrainField,
  cellSize: number,
  gap: number,
): void {
  const { rows, cols } = puzzle;
  const subcells = GRASS_SUBCELLS;
  const subSize = Math.max(1, Math.floor(cellSize / subcells));
  const stride = cellSize + gap;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isGrassCell(puzzle, context.bridges, row, col)) {
        continue;
      }

      const base = grassBaseForCell(row, col, context);
      if (!base) {
        continue;
      }

      const originX = col * stride;
      const originY = row * stride;

      for (let subRow = 0; subRow < subcells; subRow += 1) {
        for (let subCol = 0; subCol < subcells; subCol += 1) {
          const noise = grassTerrain.sampleNoise(row, col, subRow, subCol);
          const { r, g, b } = modulateGrassColorRgb(base.rgb, noise);
          ctx.fillStyle = `rgb(${r} ${g} ${b})`;
          ctx.fillRect(
            originX + subCol * subSize,
            originY + subRow * subSize,
            subSize,
            subSize,
          );
        }
      }
    }
  }
}

export function GrassCanvasOverlay({
  puzzle,
  context,
  cellSize,
  gap,
}: GrassCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = puzzle.cols * cellSize + Math.max(0, puzzle.cols - 1) * gap;
  const height = puzzle.rows * cellSize + Math.max(0, puzzle.rows - 1) * gap;
  const hasGrass = puzzle.cells.some((cell) => cell.kind === "grass");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawGrassSurface(ctx, puzzle, context, context.grassTerrain, cellSize, gap);
  }, [puzzle, context, cellSize, gap]);

  if (!hasGrass) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      style={{ width, height, imageRendering: "pixelated" }}
    />
  );
}
