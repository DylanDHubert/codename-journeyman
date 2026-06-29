import { createNoise2D } from "simplex-noise";

import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import type { Puzzle, TileKind } from "@/lib/game/types";

/** SUB-CELLS PER SIDE — FINER GRID WITHIN EACH TILE FOR INTERNAL TEXTURE */
export const WATER_SUBCELLS = 4;

/** WORLD-SPACE SAMPLE SCALE — LOWER = BROADER, MORE CONNECTED PATCHES */
const NOISE_SCALE = 0.35;

/** DRIFT APPLIED PER ANIMATION PHASE STEP — FLOWS FOREVER IN ONE DIRECTION */
export const WATER_DRIFT = { x: 0.035, y: 0.02 };

/** THRESHOLD OCTAVES — STEPPED BANDS AT COARSE + FINE FREQUENCIES */
const THRESHOLD_OCTAVES: ReadonlyArray<{
  frequency: number;
  weight: number;
  levels: number;
}> = [
  { frequency: 1, weight: 0.62, levels: 4 },
  { frequency: 2.6, weight: 0.38, levels: 3 },
];

export type WaterNoiseField = {
  cols: number;
  sample: (
    phase: number,
    row: number,
    col: number,
    subRow?: number,
    subCol?: number,
  ) => number;
};

function normalizeNoise(value: number): number {
  return (value + 1) * 0.5;
}

function thresholdNoise(value: number, levels: number): number {
  if (levels <= 1) {
    return value;
  }

  const band = Math.min(levels - 1, Math.floor(value * levels));
  return band / (levels - 1);
}

function octaveThresholdNoise(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
): number {
  let value = 0;
  let totalWeight = 0;

  for (const { frequency, weight, levels } of THRESHOLD_OCTAVES) {
    const raw = normalizeNoise(noise2D(x * frequency, y * frequency));
    value += thresholdNoise(raw, levels) * weight;
    totalWeight += weight;
  }

  return value / totalWeight;
}

function worldSamplePoint(
  col: number,
  row: number,
  subCol: number,
  subRow: number,
  driftX: number,
  driftY: number,
): { x: number; y: number } {
  const x = (col + (subCol + 0.5) / WATER_SUBCELLS) * NOISE_SCALE + driftX;
  const y = (row + (subRow + 0.5) / WATER_SUBCELLS) * NOISE_SCALE + driftY;
  return { x, y };
}

export function buildWaterNoiseField(puzzle: Puzzle): WaterNoiseField {
  const { seed } = puzzle;
  const noise2D = createNoise2D(
    mulberry32(hashStringToSeed(`${seed}-water-noise`)),
  );

  return {
    cols: puzzle.cols,
    sample(phase, row, col, subRow = Math.floor(WATER_SUBCELLS / 2), subCol = Math.floor(WATER_SUBCELLS / 2)) {
      const driftX = phase * WATER_DRIFT.x;
      const driftY = phase * WATER_DRIFT.y;
      const { x, y } = worldSamplePoint(col, row, subCol, subRow, driftX, driftY);
      return octaveThresholdNoise(noise2D, x, y);
    },
  };
}

function noiseStrength(kind: TileKind): number {
  switch (kind) {
    case "marsh":
      return 0.14;
    case "whirlpool":
      return 0.1;
    case "ocean":
    default:
      return 0.35;
  }
}

export function modulateWaterColorRgb(
  base: { r: number; g: number; b: number },
  noise: number,
  kind: TileKind,
): { r: number; g: number; b: number } {
  const strength = noiseStrength(kind);
  const delta = (noise - 0.5) * 2 * strength;
  const highlight = {
    r: Math.min(255, base.r + 52),
    g: Math.min(255, base.g + 48),
    b: Math.min(255, base.b + 36),
  };
  const shadow = {
    r: Math.max(0, base.r - 28),
    g: Math.max(0, base.g - 24),
    b: Math.max(0, base.b - 18),
  };

  if (delta >= 0) {
    return {
      r: Math.round(base.r + (highlight.r - base.r) * delta),
      g: Math.round(base.g + (highlight.g - base.g) * delta),
      b: Math.round(base.b + (highlight.b - base.b) * delta),
    };
  }

  const amount = -delta;
  return {
    r: Math.round(base.r + (shadow.r - base.r) * amount),
    g: Math.round(base.g + (shadow.g - base.g) * amount),
    b: Math.round(base.b + (shadow.b - base.b) * amount),
  };
}
