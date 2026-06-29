"use client";

import { useEffect, useRef, useState } from "react";

import { waterBaseForCell, type AppearanceContext } from "@/lib/rendering/cellAppearance";
import {
  modulateWaterColorRgb,
  WATER_SUBCELLS,
  type WaterNoiseField,
} from "@/lib/rendering/waterNoise";
import type { Puzzle } from "@/lib/game/types";

type WaterCanvasOverlayProps = {
  puzzle: Puzzle;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
  frameMs?: number;
};

const DEFAULT_FRAME_MS = 420;

function isAnimatedWaterCell(
  puzzle: Puzzle,
  bridges: Set<string>,
  row: number,
  col: number,
): boolean {
  const key = `${row},${col}`;
  if (bridges.has(key)) {
    return false;
  }

  const kind = puzzle.cells[row * puzzle.cols + col]?.kind;
  return kind === "ocean" || kind === "marsh" || kind === "whirlpool";
}

export function drawWaterSurface(
  ctx: CanvasRenderingContext2D,
  puzzle: Puzzle,
  context: AppearanceContext,
  waterNoise: WaterNoiseField,
  waterPhase: number,
  cellSize: number,
  gap: number,
): void {
  const { rows, cols } = puzzle;
  const subcells = WATER_SUBCELLS;
  const subSize = Math.max(1, Math.floor(cellSize / subcells));
  const stride = cellSize + gap;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isAnimatedWaterCell(puzzle, context.bridges, row, col)) {
        continue;
      }

      const base = waterBaseForCell(row, col, context);
      if (!base) {
        continue;
      }

      const originX = col * stride;
      const originY = row * stride;

      for (let subRow = 0; subRow < subcells; subRow += 1) {
        for (let subCol = 0; subCol < subcells; subCol += 1) {
          const noise = waterNoise.sample(waterPhase, row, col, subRow, subCol);
          const { r, g, b } = modulateWaterColorRgb(base.rgb, noise, base.kind);
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

export function WaterCanvasOverlay({
  puzzle,
  context,
  cellSize,
  gap,
  frameMs = DEFAULT_FRAME_MS,
}: WaterCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waterPhase, setWaterPhase] = useState(0);

  const width = puzzle.cols * cellSize + Math.max(0, puzzle.cols - 1) * gap;
  const height = puzzle.rows * cellSize + Math.max(0, puzzle.rows - 1) * gap;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWaterPhase((phase) => phase + 1);
    }, frameMs);

    return () => window.clearInterval(timer);
  }, [frameMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawWaterSurface(
      ctx,
      puzzle,
      context,
      context.waterNoise,
      waterPhase,
      cellSize,
      gap,
    );
  }, [puzzle, context, waterPhase, cellSize, gap]);

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
