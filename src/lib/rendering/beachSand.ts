import { createNoise2D } from "simplex-noise";

import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import type { Puzzle } from "@/lib/game/types";

export const BEACH_SUBCELLS = 4;

const GRAIN_SCALE = 0.44;

const SAND_LIGHT = { r: 248, g: 232, b: 182 };
const SAND_SHADOW = { r: 188, g: 158, b: 98 };
const SAND_SPECK = { r: 170, g: 136, b: 82 };

export type BeachSandField = {
  sampleNoise: (
    row: number,
    col: number,
    subRow?: number,
    subCol?: number,
  ) => number;
};

function normalizeNoise(value: number): number {
  return (value + 1) * 0.5;
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function thresholdNoise(value: number, levels: number): number {
  if (levels <= 1) {
    return value;
  }

  const band = Math.min(levels - 1, Math.floor(value * levels));
  return band / (levels - 1);
}

function grainSamplePoint(
  col: number,
  row: number,
  subCol: number,
  subRow: number,
): { x: number; y: number } {
  const x = (col + (subCol + 0.5) / BEACH_SUBCELLS) * GRAIN_SCALE;
  const y = (row + (subRow + 0.5) / BEACH_SUBCELLS) * GRAIN_SCALE;
  return { x, y };
}

function sampleSandNoise(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
): number {
  const drift = normalizeNoise(noise2D(x * 0.85 + 6, y * 0.85 + 14));
  const coarse = normalizeNoise(noise2D(x * 1.2, y * 1.2));
  const coarseBand = thresholdNoise(coarse, 5);
  const fine = normalizeNoise(noise2D(x * 3.4 + 22, y * 3.4 + 11));
  const fineBand = thresholdNoise(fine, 4);
  const speckle = normalizeNoise(noise2D(x * 6.2 + 41, y * 6.2 + 27));

  return (
    drift * 0.18 +
    coarseBand * 0.46 +
    fineBand * 0.28 +
    thresholdNoise(speckle, 3) * 0.08
  );
}

export function modulateSandColorRgb(
  base: { r: number; g: number; b: number },
  noise: number,
): { r: number; g: number; b: number } {
  const delta = (noise - 0.5) * 2;
  const strength = 0.42;

  if (delta >= 0) {
    const t = delta * strength;
    if (delta > 0.72) {
      return mixRgb(mixRgb(base, SAND_LIGHT, t), SAND_SPECK, (delta - 0.72) * 0.35);
    }
    return mixRgb(base, SAND_LIGHT, t);
  }

  return mixRgb(base, SAND_SHADOW, -delta * strength * 0.85);
}

export function buildBeachSandField(puzzle: Puzzle): BeachSandField {
  const noise2D = createNoise2D(
    mulberry32(hashStringToSeed(`${puzzle.seed}-beach-sand`)),
  );

  return {
    sampleNoise(row, col, subRow = 0, subCol = 0) {
      const { x, y } = grainSamplePoint(col, row, subCol, subRow);
      return sampleSandNoise(noise2D, x, y);
    },
  };
}
