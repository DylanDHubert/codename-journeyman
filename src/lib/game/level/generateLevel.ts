import { pickMissionEndpoints } from "../endpoints";
import { buildRawTerrainGrid } from "../terrainNoise";
import type { CreateGenerationConfig } from "../createConfig";
import { normalizeCreateConfig } from "../createConfig";
import { hashStringToSeed, mulberry32 } from "../seed";
import {
  buildTileGridFromNoise,
  labelLandComponents,
} from "../terrainFeatures";
import type { CellCoord } from "../types";
import {
  buildLevel,
  missionFromEndpoints,
  tileGridToLevelParts,
} from "./gridToLevel";
import type { Level } from "./types";

type GenerateLevelOptions = {
  seed: string;
  config?: CreateGenerationConfig;
};

function distinctCoords(
  coords: CellCoord[],
  rng: () => number,
  count: number,
): CellCoord[] {
  const picked: CellCoord[] = [];
  const used = new Set<string>();

  for (let attempt = 0; attempt < coords.length * 4 && picked.length < count; attempt += 1) {
    const coord = coords[Math.floor(rng() * coords.length)]!;
    const key = `${coord.row},${coord.col}`;
    if (used.has(key)) {
      continue;
    }
    used.add(key);
    picked.push(coord);
  }

  return picked;
}

function fallbackMission(
  labels: number[][],
  rows: number,
  cols: number,
  rng: () => number,
) {
  const landCells: CellCoord[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (labels[row]![col]! >= 0) {
        landCells.push({ row, col });
      }
    }
  }

  if (landCells.length >= 3) {
    const [x, y, z] = distinctCoords(landCells, rng, 3);
    if (x && y && z) {
      return missionFromEndpoints(x, y, z);
    }
  }

  return missionFromEndpoints(
    { row: 1, col: 1 },
    { row: Math.floor(rows / 2), col: Math.floor(cols / 2) },
    { row: Math.max(1, rows - 2), col: Math.max(1, cols - 2) },
  );
}

function toTerrainConfig(config: CreateGenerationConfig) {
  return { grid: config.grid, noise: config.noise };
}

/**
 * CREATE ENTRY — SINGLE-PASS RANDOM TERRAIN + AUTO MISSION (X/Y/Z).
 * OUTPUTS Level DIRECTLY; NO PAR SEARCH.
 */
export function generateLevel(options: GenerateLevelOptions): Level {
  const config = normalizeCreateConfig(options.config);
  const { rows, cols } = config.grid;
  const seed = options.seed;
  const rng = mulberry32(hashStringToSeed(seed));

  const rawGrid = buildRawTerrainGrid(toTerrainConfig(config), seed);
  const tileGrid = buildTileGridFromNoise(rawGrid, seed, rng);
  const labels = labelLandComponents(tileGrid, rows, cols);
  const mission =
    pickMissionEndpoints(tileGrid, labels, rows, cols, rng) ??
    fallbackMission(labels, rows, cols, rng);

  const { terrain, objects } = tileGridToLevelParts(tileGrid, rows, cols);

  return buildLevel(seed, rows, cols, terrain, objects, mission);
}
