"use client";

import { useEffect, useRef } from "react";

import { cliffBaseForCell, type AppearanceContext } from "@/lib/rendering/cellAppearance";
import {
  CLIFF_SUBCELLS,
  modulateRockColorRgb,
  type CliffRockField,
} from "@/lib/rendering/cliffRock";
import type { Puzzle } from "@/lib/game/types";

type CliffCanvasOverlayProps = {
  puzzle: Puzzle;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
};

function isCliffCell(puzzle: Puzzle, row: number, col: number): boolean {
  return puzzle.cells[row * puzzle.cols + col]?.kind === "cliff";
}

export function drawCliffSurface(
  ctx: CanvasRenderingContext2D,
  puzzle: Puzzle,
  context: AppearanceContext,
  cliffRock: CliffRockField,
  cellSize: number,
  gap: number,
): void {
  const { rows, cols } = puzzle;
  const subcells = CLIFF_SUBCELLS;
  const subSize = Math.max(1, Math.floor(cellSize / subcells));
  const stride = cellSize + gap;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isCliffCell(puzzle, row, col)) {
        continue;
      }

      const base = cliffBaseForCell(row, col, context);
      if (!base) {
        continue;
      }

      const originX = col * stride;
      const originY = row * stride;

      for (let subRow = 0; subRow < subcells; subRow += 1) {
        for (let subCol = 0; subCol < subcells; subCol += 1) {
          const noise = cliffRock.sampleNoise(row, col, subRow, subCol);
          const { r, g, b } = modulateRockColorRgb(base.rgb, noise);
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

export function CliffCanvasOverlay({
  puzzle,
  context,
  cellSize,
  gap,
}: CliffCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = puzzle.cols * cellSize + Math.max(0, puzzle.cols - 1) * gap;
  const height = puzzle.rows * cellSize + Math.max(0, puzzle.rows - 1) * gap;
  const hasCliff = puzzle.cells.some((cell) => cell.kind === "cliff");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawCliffSurface(ctx, puzzle, context, context.cliffRock, cellSize, gap);
  }, [puzzle, context, cellSize, gap]);

  if (!hasCliff) {
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
