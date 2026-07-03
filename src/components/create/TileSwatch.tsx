"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { drawBeachSurface } from "@/components/game/BeachCanvasOverlay";
import { drawCliffSurface } from "@/components/game/CliffCanvasOverlay";
import { drawGrassSurface } from "@/components/game/GrassCanvasOverlay";
import { drawWaterSurface } from "@/components/game/WaterCanvasOverlay";
import { createAppearanceContext } from "@/lib/rendering/cellAppearance";
import { terrainGridGap } from "@/lib/rendering/terrainBorders";
import { isLandKind } from "@/lib/game/tiles";
import type { Puzzle, TileKind } from "@/lib/game/types";

const WATER_FRAME_MS = 420;

const WATER_KINDS: ReadonlySet<TileKind> = new Set([
  "ocean",
  "marsh",
  "whirlpool",
]);

// A 1×1 PUZZLE SO THE REAL TERRAIN DRAW ROUTINES CAN PAINT A SINGLE CELL
function singleCellPuzzle(kind: TileKind): Puzzle {
  return {
    seed: `swatch-${kind}`,
    rows: 1,
    cols: 1,
    cells: [
      {
        kind,
        role: "none",
        componentId: isLandKind(kind) ? 0 : -1,
      },
    ],
    start: { row: 0, col: 0 },
    waypoint: { row: 0, col: 0 },
    goal: { row: 0, col: 0 },
    parCost: 0,
  };
}

export function TileSwatch({
  kind,
  size = 40,
}: {
  kind: TileKind;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waterPhase, setWaterPhase] = useState(0);
  const isWater = WATER_KINDS.has(kind);

  const puzzle = useMemo(() => singleCellPuzzle(kind), [kind]);
  const context = useMemo(
    () => createAppearanceContext(puzzle, new Set<string>(), new Set<string>(), false),
    [puzzle],
  );

  useEffect(() => {
    if (!isWater) {
      return;
    }

    const timer = window.setInterval(() => {
      setWaterPhase((phase) => phase + 1);
    }, WATER_FRAME_MS);

    return () => window.clearInterval(timer);
  }, [isWater]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const gap = terrainGridGap(size);

    switch (kind) {
      case "grass":
        drawGrassSurface(ctx, puzzle, context, context.grassTerrain, size, gap);
        break;
      case "beach":
        drawBeachSurface(ctx, puzzle, context, context.beachSand, size, gap);
        break;
      case "cliff":
        drawCliffSurface(ctx, puzzle, context, context.cliffRock, size, gap);
        break;
      default:
        drawWaterSurface(
          ctx,
          puzzle,
          context,
          context.waterNoise,
          waterPhase,
          size,
          gap,
        );
        break;
    }
  }, [kind, puzzle, context, waterPhase, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-hidden
      className="block"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}
