import { createNoise2D } from "simplex-noise";

import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import type { Puzzle } from "@/lib/game/types";

export const GRASS_SUBCELLS = 4;

const GRAIN_SCALE = 0.46;

const GRASS_LIGHT = { r: 122, g: 192, b: 88 };
const GRASS_SHADOW = { r: 54, g: 112, b: 50 };
const GRASS_SPECK = { r: 42, g: 96, b: 46 };

export type GrassTerrainField = {
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
  const x = (col + (subCol + 0.5) / GRASS_SUBCELLS) * GRAIN_SCALE;
  const y = (row + (subRow + 0.5) / GRASS_SUBCELLS) * GRAIN_SCALE;
  return { x, y };
}

function sampleGrassNoise(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
): number {
  const patch = normalizeNoise(noise2D(x * 1.05 + 9, y * 1.05 + 18));
  const patchBand = thresholdNoise(patch, 4);
  const blade = normalizeNoise(noise2D(x * 2.6 + 24, y * 4.1 + 7));
  const bladeBand = thresholdNoise(blade, 5);
  const tuft = normalizeNoise(noise2D(x * 5.4 + 36, y * 5.4 + 29));

  return (
    patchBand * 0.44 +
    bladeBand * 0.34 +
    thresholdNoise(tuft, 3) * 0.12 +
    normalizeNoise(noise2D(x * 0.72 + 3, y * 0.72 + 11)) * 0.1
  );
}

export function modulateGrassColorRgb(
  base: { r: number; g: number; b: number },
  noise: number,
): { r: number; g: number; b: number } {
  const delta = (noise - 0.5) * 2;
  const strength = 0.36;

  if (delta >= 0) {
    const t = delta * strength;
    if (delta > 0.74) {
      return mixRgb(mixRgb(base, GRASS_LIGHT, t), GRASS_SPECK, (delta - 0.74) * 0.28);
    }
    return mixRgb(base, GRASS_LIGHT, t);
  }

  return mixRgb(base, GRASS_SHADOW, -delta * strength * 0.9);
}

export function buildGrassTerrainField(puzzle: Puzzle): GrassTerrainField {
  const noise2D = createNoise2D(
    mulberry32(hashStringToSeed(`${puzzle.seed}-grass-terrain`)),
  );

  return {
    sampleNoise(row, col, subRow = 0, subCol = 0) {
      const { x, y } = grainSamplePoint(col, row, subCol, subRow);
      return sampleGrassNoise(noise2D, x, y);
    },
  };
}
