import { pickCourierEndpoints } from "./endpoints";
import { buildRawTerrainGrid } from "./generation";
import type { CreateGenerationConfig } from "./createConfig";
import { normalizeCreateConfig } from "./createConfig";
import { hashStringToSeed, mulberry32 } from "./seed";
import {
  buildTileGridFromNoise,
  labelLandComponents,
  toPuzzleCells,
} from "./terrainFeatures";
import type { CellCoord, CourierRoute, PuzzleGrid } from "./types";

type DraftGenerationOptions = {
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

function fallbackDraftRoute(
  labels: number[][],
  rows: number,
  cols: number,
  rng: () => number,
): CourierRoute {
  const landCells: CellCoord[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (labels[row]![col]! >= 0) {
        landCells.push({ row, col });
      }
    }
  }

  if (landCells.length >= 3) {
    const [start, waypoint, goal] = distinctCoords(landCells, rng, 3);
    if (start && waypoint && goal) {
      return { start, waypoint, goal };
    }
  }

  return {
    start: { row: 1, col: 1 },
    waypoint: { row: Math.floor(rows / 2), col: Math.floor(cols / 2) },
    goal: { row: Math.max(1, rows - 2), col: Math.max(1, cols - 2) },
  };
}

function toTerrainConfig(config: CreateGenerationConfig) {
  return {
    grid: config.grid,
    noise: config.noise,
    minPar: 0,
    maxPar: 0,
    maxAttempts: 1,
  };
}

/** SINGLE-PASS RANDOM GENERATION — NO PAR SEARCH OR ACCEPT/REJECT LOOP */
export function generateDraftPuzzle(options: DraftGenerationOptions): PuzzleGrid {
  const config = normalizeCreateConfig(options.config);
  const { rows, cols } = config.grid;
  const seed = options.seed;
  const rng = mulberry32(hashStringToSeed(seed));

  const rawGrid = buildRawTerrainGrid(toTerrainConfig(config), seed);
  const tileGrid = buildTileGridFromNoise(rawGrid, seed, rng);
  const labels = labelLandComponents(tileGrid, rows, cols);
  const route =
    pickCourierEndpoints(tileGrid, labels, rows, cols, rng) ??
    fallbackDraftRoute(labels, rows, cols, rng);

  const cells = toPuzzleCells(
    tileGrid,
    labels,
    rows,
    cols,
    route.start,
    route.waypoint,
    route.goal,
  );

  return {
    seed,
    rows,
    cols,
    cells,
    ...route,
  };
}
