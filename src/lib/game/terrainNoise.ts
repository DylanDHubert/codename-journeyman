import { createNoise2D } from "simplex-noise";

import type { CreateGenerationConfig } from "./createConfig";
import type { GenerationConfig } from "./generationConfig";
import { hashStringToSeed, mulberry32 } from "./seed";

function layeredNoise(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
  config: GenerationConfig | CreateGenerationConfig,
): number {
  const { noise } = config;
  const n1 = noise2D(x * noise.octave1Scale, y * noise.octave1Scale);
  const n2 =
    noise2D(x * noise.octave2Scale + 40, y * noise.octave2Scale + 40) *
    noise.octave2Weight;
  const n3 =
    noise2D(x * noise.octave3Scale + 90, y * noise.octave3Scale + 90) *
    noise.octave3Weight;
  return n1 + n2 + n3;
}

/** RAW LAND/WATER FROM NOISE — SHARED BY generateLevel (CREATE ENTRY) */
export function buildRawTerrainGrid(
  config: GenerationConfig | CreateGenerationConfig,
  seed: string,
): Array<Array<"land" | "water">> {
  const { rows, cols } = config.grid;
  const rng = mulberry32(hashStringToSeed(seed));
  const noise2D = createNoise2D(rng);
  const grid: Array<Array<"land" | "water">> = [];

  for (let row = 0; row < rows; row += 1) {
    const line: Array<"land" | "water"> = [];
    for (let col = 0; col < cols; col += 1) {
      const nx = col - cols / 2;
      const ny = row - rows / 2;
      const falloff =
        1 -
        Math.sqrt(nx * nx + ny * ny) /
          (Math.max(rows, cols) * config.noise.falloffRadius);
      const value =
        layeredNoise(noise2D, col, row, config) +
        falloff * config.noise.falloffStrength;
      line.push(value > config.noise.landThreshold ? "land" : "water");
    }
    grid.push(line);
  }

  return grid;
}
