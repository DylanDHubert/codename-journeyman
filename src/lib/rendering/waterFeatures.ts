import { createNoise2D } from "simplex-noise";

import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { WATER_SUBCELLS } from "./waterNoise";

const SPLOTCH_SCALE = 0.48;

const MARSH_GREEN_SPLOTCH = { r: 44, g: 128, b: 74 };
const MARSH_YELLOW_SPLOTCH = { r: 198, g: 178, b: 52 };

export type MarshSplotchField = {
  greenStrength: (row: number, col: number, subRow: number, subCol: number) => number;
  yellowStrength: (row: number, col: number, subRow: number, subCol: number) => number;
};

function normalizeNoise(value: number): number {
  return (value + 1) * 0.5;
}

function splotchSamplePoint(
  col: number,
  row: number,
  subCol: number,
  subRow: number,
): { x: number; y: number } {
  return {
    x: (col + (subCol + 0.5) / WATER_SUBCELLS) * SPLOTCH_SCALE,
    y: (row + (subRow + 0.5) / WATER_SUBCELLS) * SPLOTCH_SCALE,
  };
}

function splotchStrength(value: number, threshold: number, softness: number): number {
  if (value <= threshold) {
    return 0;
  }

  return Math.min(1, (value - threshold) / softness);
}

export function buildMarshSplotchField(view: TerrainView): MarshSplotchField {
  const noise2D = createNoise2D(
    mulberry32(hashStringToSeed(`${view.seed}-marsh-splotch`)),
  );

  return {
    greenStrength(row, col, subRow, subCol) {
      const { x, y } = splotchSamplePoint(col, row, subCol, subRow);
      const patch = normalizeNoise(noise2D(x * 1.15, y * 1.15));
      const clump = normalizeNoise(noise2D(x * 2.4 + 18, y * 2.4 + 6));
      return splotchStrength(patch * 0.72 + clump * 0.28, 0.56, 0.22);
    },
    yellowStrength(row, col, subRow, subCol) {
      const { x, y } = splotchSamplePoint(col, row, subCol, subRow);
      const patch = normalizeNoise(noise2D(x * 1.05 + 44, y * 1.05 + 22));
      const clump = normalizeNoise(noise2D(x * 2.1 + 9, y * 2.1 + 31));
      return splotchStrength(patch * 0.68 + clump * 0.32, 0.6, 0.2);
    },
  };
}

export function applyMarshSplotches(
  base: { r: number; g: number; b: number },
  greenStrength: number,
  yellowStrength: number,
): { r: number; g: number; b: number } {
  let color = base;

  if (greenStrength > 0) {
    const t = greenStrength * 0.5;
    color = {
      r: Math.round(color.r + (MARSH_GREEN_SPLOTCH.r - color.r) * t),
      g: Math.round(color.g + (MARSH_GREEN_SPLOTCH.g - color.g) * t),
      b: Math.round(color.b + (MARSH_GREEN_SPLOTCH.b - color.b) * t),
    };
  }

  if (yellowStrength > 0) {
    const t = yellowStrength * 0.42;
    color = {
      r: Math.round(color.r + (MARSH_YELLOW_SPLOTCH.r - color.r) * t),
      g: Math.round(color.g + (MARSH_YELLOW_SPLOTCH.g - color.g) * t),
      b: Math.round(color.b + (MARSH_YELLOW_SPLOTCH.b - color.b) * t),
    };
  }

  return color;
}

export const WHIRLPOOL_SPIRAL_FRAMES = 4;

export function resolveWhirlpoolSpiralFrame(waterPhase: number): number {
  return Math.floor(waterPhase / 2) % WHIRLPOOL_SPIRAL_FRAMES;
}

export function drawWhirlpoolSpiral(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  cellSize: number,
  frame: number,
): void {
  const centerX = originX + cellSize / 2;
  const centerY = originY + cellSize / 2;
  const rotation =
    ((frame % WHIRLPOOL_SPIRAL_FRAMES) / WHIRLPOOL_SPIRAL_FRAMES) * Math.PI * 0.42;
  const maxRadius = cellSize * 0.34;
  const steps = Math.max(10, Math.floor(cellSize / 2.2));

  const dabLayers = [
    {
      radius: Math.max(2, Math.round(cellSize * 0.1)),
      color: "rgba(36 88 118 / 0.16)",
    },
    {
      radius: Math.max(1, Math.round(cellSize * 0.065)),
      color: "rgba(20 58 88 / 0.14)",
    },
    {
      radius: 1,
      color: "rgba(10 32 54 / 0.1)",
    },
  ];

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);

  const arms = [0, Math.PI];

  for (const armOffset of arms) {
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const angle = armOffset + t * Math.PI * 1.9;
      const radius = t * maxRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      for (const layer of dabLayers) {
        drawWhirlpoolDab(ctx, x, y, layer.radius, layer.color);
      }
    }
  }

  ctx.restore();
}

function drawWhirlpoolDab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  const px = Math.round(x);
  const py = Math.round(y);
  const size = radius * 2 + 1;

  ctx.fillStyle = color;
  ctx.fillRect(px - radius, py - radius, size, size);
}
