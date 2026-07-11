"use client";

import { useEffect, useRef } from "react";

import { beachBaseForCell, type AppearanceContext } from "@/lib/rendering/cellAppearance";
import {
  BEACH_SUBCELLS,
  modulateSandColorRgb,
  type BeachSandField,
} from "@/lib/rendering/beachSand";
import { terrainSubcellRect, terrainSubcellSize } from "@/lib/rendering/terrainBorders";
import type { TerrainView } from "@/lib/rendering/terrainView";

type BeachCanvasOverlayProps = {
  view: TerrainView;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
};

function isBeachCell(view: TerrainView, row: number, col: number): boolean {
  return view.terrain[row * view.cols + col] === "beach";
}

export function drawBeachSurface(
  ctx: CanvasRenderingContext2D,
  view: TerrainView,
  context: AppearanceContext,
  beachSand: BeachSandField,
  cellSize: number,
  gap: number,
): void {
  const { rows, cols } = view;
  const subcells = BEACH_SUBCELLS;
  const subSize = terrainSubcellSize(cellSize, subcells);
  const stride = cellSize + gap;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isBeachCell(view, row, col)) {
        continue;
      }

      const base = beachBaseForCell(row, col, context);
      if (!base) {
        continue;
      }

      const originX = col * stride;
      const originY = row * stride;

      for (let subRow = 0; subRow < subcells; subRow += 1) {
        for (let subCol = 0; subCol < subcells; subCol += 1) {
          const noise = beachSand.sampleNoise(row, col, subRow, subCol);
          const { r, g, b } = modulateSandColorRgb(base.rgb, noise);
          const rect = terrainSubcellRect(
            originX,
            originY,
            cellSize,
            subcells,
            subSize,
            subCol,
            subRow,
          );
          ctx.fillStyle = `rgb(${r} ${g} ${b})`;
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
      }
    }
  }
}

export function BeachCanvasOverlay({
  view,
  context,
  cellSize,
  gap,
}: BeachCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = view.cols * cellSize + Math.max(0, view.cols - 1) * gap;
  const height = view.rows * cellSize + Math.max(0, view.rows - 1) * gap;
  const hasBeach = view.terrain.some((kind) => kind === "beach");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawBeachSurface(ctx, view, context, context.beachSand, cellSize, gap);
  }, [view, context, cellSize, gap]);

  if (!hasBeach) {
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
