"use client";

import { useEffect, useRef, useState } from "react";

import { TileSwatch } from "@/components/create/TileSwatch";
import { objectDefinition } from "@/lib/game/objects/registry";
import {
  ANIMATED_RENDERERS,
  objectRenderer,
} from "@/lib/rendering/objectRenderers";

const FRAME_MS = 50;

// PALETTE PREVIEW — BASE TERRAIN (VIA TileSwatch) WITH THE OBJECT DRAWN ON TOP
export function ObjectSwatch({
  defId,
  size = 40,
}: {
  defId: string;
  size?: number;
}) {
  const definition = objectDefinition(defId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0);
  const animated = definition ? ANIMATED_RENDERERS.has(definition.render) : false;

  useEffect(() => {
    if (!animated) {
      return;
    }
    const timer = window.setInterval(() => setPhase((value) => value + 1), FRAME_MS);
    return () => window.clearInterval(timer);
  }, [animated]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !definition) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const renderer = objectRenderer(definition.render);
    if (!renderer) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderer({ ctx, originX: 0, originY: 0, cellSize: size, phase });
  }, [definition, size, phase]);

  if (!definition) {
    return null;
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <TileSwatch kind={definition.previewTerrain} size={size} />
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: size, height: size, imageRendering: "pixelated" }}
      />
    </div>
  );
}
