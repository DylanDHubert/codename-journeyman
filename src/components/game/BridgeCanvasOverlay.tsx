"use client";

import { useEffect, useRef } from "react";

import type { AppearanceContext } from "@/lib/rendering/cellAppearance";
import {
  BRIDGE_SUBCELLS,
  collectBridgePylonCorners,
  drawBridgePylon,
  drawMarshBridgeNails,
  type BridgeWoodField,
} from "@/lib/rendering/bridgeWood";
import type { Puzzle } from "@/lib/game/types";

type BridgeCanvasOverlayProps = {
  puzzle: Puzzle;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
};

export function drawBridgeSurface(
  ctx: CanvasRenderingContext2D,
  puzzle: Puzzle,
  bridges: Set<string>,
  bridgeWood: BridgeWoodField,
  cellSize: number,
  gap: number,
): void {
  const { rows, cols } = puzzle;
  const subcells = BRIDGE_SUBCELLS;
  const subSize = Math.max(1, Math.floor(cellSize / subcells));
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
        ctx.fillStyle = `rgb(${r} ${g} ${b})`;
        ctx.fillRect(
          originX + subCol * subSize,
          originY + subRow * subSize,
          subSize,
          subSize,
        );
      }
    }

    const cellIndex = row * cols + col;
    if (puzzle.cells[cellIndex]!.kind === "marsh") {
      drawMarshBridgeNails(ctx, puzzle, row, col, originX, originY, cellSize);
    }
  }

  const pylonCorners = collectBridgePylonCorners(
    puzzle,
    bridges,
    cellSize,
    gap,
  );
  for (const { x, y, iron } of pylonCorners) {
    drawBridgePylon(ctx, x, y, cellSize, iron);
  }
}

export function BridgeCanvasOverlay({
  puzzle,
  context,
  cellSize,
  gap,
}: BridgeCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = puzzle.cols * cellSize + Math.max(0, puzzle.cols - 1) * gap;
  const height = puzzle.rows * cellSize + Math.max(0, puzzle.rows - 1) * gap;

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
      puzzle,
      context.bridges,
      context.bridgeWood,
      cellSize,
      gap,
    );
  }, [puzzle, context, cellSize, gap]);

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
