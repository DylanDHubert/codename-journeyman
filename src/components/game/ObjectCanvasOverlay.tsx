"use client";

import { useEffect, useRef, useState } from "react";

import { objectDefinition } from "@/lib/game/objects/registry";
import type { LevelObject } from "@/lib/game/level/types";
import {
  ANIMATED_RENDERERS,
  objectRenderer,
} from "@/lib/rendering/objectRenderers";

type ObjectCanvasOverlayProps = {
  objects: LevelObject[];
  rows: number;
  cols: number;
  cellSize: number;
  gap: number;
  frameMs?: number;
};

const DEFAULT_FRAME_MS = 50;

export function drawObjectsSurface(
  ctx: CanvasRenderingContext2D,
  objects: LevelObject[],
  cellSize: number,
  gap: number,
  phase: number,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const stride = cellSize + gap;

  for (const object of objects) {
    const definition = objectDefinition(object.defId);
    if (!definition) {
      continue;
    }

    const renderer = objectRenderer(definition.render);
    if (!renderer) {
      continue;
    }

    // STABLE PER-CELL PHASE OFFSET SO ANIMATED OBJECTS DON'T ALL SPIN IN LOCKSTEP
    const phaseOffset = object.at.row * 5 + object.at.col * 11;

    renderer({
      ctx,
      originX: object.at.col * stride,
      originY: object.at.row * stride,
      cellSize,
      phase: phase + phaseOffset,
    });
  }
}

export function ObjectCanvasOverlay({
  objects,
  rows,
  cols,
  cellSize,
  gap,
  frameMs = DEFAULT_FRAME_MS,
}: ObjectCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0);

  const width = cols * cellSize + Math.max(0, cols - 1) * gap;
  const height = rows * cellSize + Math.max(0, rows - 1) * gap;

  const hasAnimated = objects.some((object) => {
    const definition = objectDefinition(object.defId);
    return definition ? ANIMATED_RENDERERS.has(definition.render) : false;
  });

  useEffect(() => {
    if (!hasAnimated) {
      return;
    }

    const timer = window.setInterval(() => {
      setPhase((value) => value + 1);
    }, frameMs);

    return () => window.clearInterval(timer);
  }, [hasAnimated, frameMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawObjectsSurface(ctx, objects, cellSize, gap, phase);
  }, [objects, cellSize, gap, phase]);

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
