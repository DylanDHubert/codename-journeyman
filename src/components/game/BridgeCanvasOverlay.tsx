"use client";

import { useEffect, useRef } from "react";

import type { AppearanceContext } from "@/lib/rendering/cellAppearance";
import {
  BRIDGE_SUBCELLS,
  collectBridgePylonCorners,
  drawBridgeGapConnections,
  drawBridgePylon,
  drawMarshBridgeNails,
  type BridgeWoodField,
} from "@/lib/rendering/bridgeWood";
import { terrainSubcellRect, terrainSubcellSize } from "@/lib/rendering/terrainBorders";
import type { TerrainView } from "@/lib/rendering/terrainView";

type BridgeCanvasOverlayProps = {
  view: TerrainView;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
};

export function drawBridgeSurface(
  ctx: CanvasRenderingContext2D,
  view: TerrainView,
  bridges: Set<string>,
  bridgeWood: BridgeWoodField,
  cellSize: number,
  gap: number,
): void {
  const { rows, cols } = view;
  const subcells = BRIDGE_SUBCELLS;
  const subSize = terrainSubcellSize(cellSize, subcells);
  const stride = cellSize + gap;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const key of bridges) {
    const [rowText, colText] = key.split(",");
    const row = Number(rowText);
    const col = Number(colText);

    if (row < 0 || col < 0 || row >= rows || col >= cols) {
      continue;
    }

    const originX = col * stride;
    const originY = row * stride;

    for (let subRow = 0; subRow < subcells; subRow += 1) {
      for (let subCol = 0; subCol < subcells; subCol += 1) {
        const { r, g, b } = bridgeWood.sampleDeck(row, col, subRow, subCol);
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

  drawBridgeGapConnections(
    ctx,
    view,
    bridges,
    bridgeWood,
    cellSize,
    gap,
  );

  for (const key of bridges) {
    const [rowText, colText] = key.split(",");
    const row = Number(rowText);
    const col = Number(colText);

    if (row < 0 || col < 0 || row >= rows || col >= cols) {
      continue;
    }

    const originX = col * stride;
    const originY = row * stride;
    const cellIndex = row * cols + col;

    if (view.terrain[cellIndex]! === "marsh") {
      drawMarshBridgeNails(ctx, view, row, col, originX, originY, cellSize);
    }
  }

  const pylonCorners = collectBridgePylonCorners(
    view,
    bridges,
    cellSize,
    gap,
  );
  for (const { x, y, iron } of pylonCorners) {
    drawBridgePylon(ctx, x, y, cellSize, iron);
  }
}

export function BridgeCanvasOverlay({
  view,
  context,
  cellSize,
  gap,
}: BridgeCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = view.cols * cellSize + Math.max(0, view.cols - 1) * gap;
  const height = view.rows * cellSize + Math.max(0, view.rows - 1) * gap;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawBridgeSurface(
      ctx,
      view,
      context.bridges,
      context.bridgeWood,
      cellSize,
      gap,
    );
  }, [view, context, cellSize, gap]);

  if (context.bridges.size === 0) {
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
