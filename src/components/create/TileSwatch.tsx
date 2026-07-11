"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { drawBeachSurface } from "@/components/game/BeachCanvasOverlay";
import { drawCliffSurface } from "@/components/game/CliffCanvasOverlay";
import { drawGrassSurface } from "@/components/game/GrassCanvasOverlay";
import { drawWaterSurface } from "@/components/game/WaterCanvasOverlay";
import { createAppearanceContext } from "@/lib/rendering/cellAppearance";
import { terrainGridGap } from "@/lib/rendering/terrainBorders";
import type { TileKind } from "@/lib/game/types";
import type { TerrainView } from "@/lib/rendering/terrainView";

const WATER_FRAME_MS = 420;

function singleCellView(kind: TileKind): TerrainView {
  return {
    seed: `swatch-${kind}`,
    rows: 1,
    cols: 1,
    terrain: [kind],
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
  const isWater = kind === "ocean" || kind === "marsh";

  const view = useMemo(() => singleCellView(kind), [kind]);
  const context = useMemo(
    () => createAppearanceContext(view, new Set<string>(), new Set<string>(), false),
    [view],
  );

  useEffect(() => {
    if (!isWater) {
      return;
    }
    const timer = window.setInterval(() => setWaterPhase((p) => p + 1), WATER_FRAME_MS);
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
        drawGrassSurface(ctx, view, context, context.grassTerrain, size, gap);
        break;
      case "beach":
        drawBeachSurface(ctx, view, context, context.beachSand, size, gap);
        break;
      case "cliff":
        drawCliffSurface(ctx, view, context, context.cliffRock, size, gap);
        break;
      default:
        drawWaterSurface(ctx, view, context, context.waterNoise, waterPhase, size, gap);
        break;
    }
  }, [kind, view, context, waterPhase, size]);

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
