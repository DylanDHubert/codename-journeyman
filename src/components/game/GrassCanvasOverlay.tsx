"use client";

import { useEffect, useRef } from "react";

import { grassBaseForCell, type AppearanceContext } from "@/lib/rendering/cellAppearance";
import {
  GRASS_SUBCELLS,
  modulateGrassColorRgb,
  type GrassTerrainField,
} from "@/lib/rendering/grassTerrain";
import { terrainSubcellRect, terrainSubcellSize } from "@/lib/rendering/terrainBorders";
import type { TerrainView } from "@/lib/rendering/terrainView";

type GrassCanvasOverlayProps = {
  view: TerrainView;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
};

function isGrassCell(view: TerrainView, row: number, col: number): boolean {
  return view.terrain[row * view.cols + col] === "grass";
}

export function drawGrassSurface(
  ctx: CanvasRenderingContext2D,
  view: TerrainView,
  context: AppearanceContext,
  grassTerrain: GrassTerrainField,
  cellSize: number,
  gap: number,
): void {
  const { rows, cols } = view;
  const subcells = GRASS_SUBCELLS;
  const subSize = terrainSubcellSize(cellSize, subcells);
  const stride = cellSize + gap;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isGrassCell(view, row, col)) {
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

export function GrassCanvasOverlay({
  view,
  context,
  cellSize,
  gap,
}: GrassCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = view.cols * cellSize + Math.max(0, view.cols - 1) * gap;
  const height = view.rows * cellSize + Math.max(0, view.rows - 1) * gap;
  const hasGrass = view.terrain.some((kind) => kind === "grass");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawGrassSurface(ctx, view, context, context.grassTerrain, cellSize, gap);
  }, [view, context, cellSize, gap]);

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
