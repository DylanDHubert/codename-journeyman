import { createNoise2D } from "simplex-noise";

import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import type { Puzzle } from "@/lib/game/types";

export const CLIFF_SUBCELLS = 4;

const GRAIN_SCALE = 0.43;

const ROCK_LIGHT = { r: 146, g: 134, b: 120 };
const ROCK_SHADOW = { r: 58, g: 50, b: 42 };
const ROCK_CRACK = { r: 42, g: 36, b: 32 };

export type CliffRockField = {
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
  const x = (col + (subCol + 0.5) / CLIFF_SUBCELLS) * GRAIN_SCALE;
  const y = (row + (subRow + 0.5) / CLIFF_SUBCELLS) * GRAIN_SCALE;
  return { x, y };
}

function sampleRockNoise(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
): number {
  const bed = normalizeNoise(noise2D(x * 0.95 + 5, y * 0.95 + 16));
  const bedBand = thresholdNoise(bed, 5);
  const fracture = normalizeNoise(noise2D(x * 1.35 + y * 0.55 + 21, y * 1.35 - x * 0.35 + 8));
  const fractureBand = thresholdNoise(fracture, 4);
  const grit = normalizeNoise(noise2D(x * 4.8 + 33, y * 4.8 + 19));
  const crack = normalizeNoise(noise2D(x * 3.1 + 47, y * 3.1 + 24));

  return (
    bedBand * 0.42 +
    fractureBand * 0.3 +
    thresholdNoise(grit, 4) * 0.16 +
    thresholdNoise(crack, 3) * 0.12
  );
}

export function modulateRockColorRgb(
  base: { r: number; g: number; b: number },
  noise: number,
): { r: number; g: number; b: number } {
  const delta = (noise - 0.5) * 2;
  const strength = 0.4;

  if (delta >= 0) {
    const t = delta * strength;
    if (delta > 0.7) {
      return mixRgb(mixRgb(base, ROCK_LIGHT, t), ROCK_CRACK, (delta - 0.7) * 0.22);
    }
    return mixRgb(base, ROCK_LIGHT, t);
  }

  return mixRgb(base, ROCK_SHADOW, -delta * strength * 0.92);
}

export function buildCliffRockField(puzzle: Puzzle): CliffRockField {
  const noise2D = createNoise2D(
    mulberry32(hashStringToSeed(`${puzzle.seed}-cliff-rock`)),
  );

  return {
    sampleNoise(row, col, subRow = 0, subCol = 0) {
      const { x, y } = grainSamplePoint(col, row, subCol, subRow);
      return sampleRockNoise(noise2D, x, y);
    },
  };
}
