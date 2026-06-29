"use client";

import { useEffect, useRef } from "react";

import type { AppearanceContext } from "@/lib/rendering/cellAppearance";
import { drawTerrainBorders } from "@/lib/rendering/terrainBorders";
import type { Puzzle } from "@/lib/game/types";

type TerrainBorderOverlayProps = {
  puzzle: Puzzle;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
};

export function TerrainBorderOverlay({
  puzzle,
  context,
  cellSize,
  gap,
}: TerrainBorderOverlayProps) {
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

    drawTerrainBorders(ctx, puzzle, context, cellSize, gap);
  }, [puzzle, context, cellSize, gap]);

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
