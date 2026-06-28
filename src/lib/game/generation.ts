import { createNoise2D } from "simplex-noise";

import { endpointSpread, pickCourierEndpoints } from "./endpoints";
import {
  DEFAULT_GENERATION_CONFIG,
  type GenerationConfig,
  normalizeConfig,
} from "./generationConfig";
import {
  logGeneration,
  nowMs,
  type GenerationAttemptStats,
  type GenerationDebugReport,
} from "./generationDebug";
import { computeMinimumCost } from "./par";
import {
  buildParContext,
  parCostImpossibleAbove,
} from "./parPrecompute";
import { hashStringToSeed, mulberry32 } from "./seed";
import {
  buildTileGridFromNoise,
  labelLandComponents,
  toPuzzleCells,
} from "./terrainFeatures";
import { manhattanDistance } from "./tiles";
import type { CellCoord, Puzzle, PuzzleGrid } from "./types";

type GenerationOptions = {
  seed?: string;
  config?: GenerationConfig;
};

const MIN_ENDPOINT_DISTANCE_RATIO = 0.35;

function layeredNoise(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
  config: GenerationConfig,
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

export function buildRawTerrainGrid(
  config: GenerationConfig,
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

export function generatePuzzle(options: GenerationOptions = {}): Puzzle {
  return generatePuzzleWithDebug(options).puzzle;
}

export function generatePuzzleWithDebug(options: GenerationOptions = {}): {
  puzzle: Puzzle;
  debug: GenerationDebugReport;
} {
  const startedAt = nowMs();
  const config = normalizeConfig(options.config ?? DEFAULT_GENERATION_CONFIG);
  const { rows, cols } = config.grid;
  const baseSeed = options.seed ?? "bridge-isles-default";
  const attemptLog: GenerationAttemptStats[] = [];
  let totalTerrainMs = 0;
  let totalEndpointsMs = 0;
  let totalParFastMs = 0;

  logGeneration("start", {
    seed: baseSeed,
    grid: `${rows}×${cols}`,
    minPar: config.minPar,
    maxPar: config.maxPar,
    maxAttempts: config.maxAttempts,
  });

  for (let attempt = 0; attempt < config.maxAttempts; attempt += 1) {
    const seed = `${baseSeed}-${attempt}`;
    const rng = mulberry32(hashStringToSeed(seed));

    const terrainStarted = nowMs();
    const rawGrid = buildRawTerrainGrid(config, seed);
    const tileGrid = buildTileGridFromNoise(rawGrid, seed, rng);
    const labels = labelLandComponents(tileGrid, rows, cols);
    const terrainMs = nowMs() - terrainStarted;
    totalTerrainMs += terrainMs;

    const endpointsStarted = nowMs();
    const route = pickCourierEndpoints(tileGrid, labels, rows, cols, rng);
    const endpointsMs = nowMs() - endpointsStarted;
    totalEndpointsMs += endpointsMs;

    const attemptStats: GenerationAttemptStats = {
      attempt,
      terrainMs,
      endpointsMs,
      parFastMs: 0,
      rejected: "",
    };

    if (!route) {
      attemptStats.rejected = "no courier endpoints";
      attemptLog.push(attemptStats);
      logGeneration(`attempt ${attempt} rejected`, { reason: attemptStats.rejected });
      continue;
    }

    const spread = endpointSpread(route);
    const minLegDistance = Math.floor((rows + cols) * MIN_ENDPOINT_DISTANCE_RATIO);
    if (
      manhattanDistance(route.start, route.waypoint) < minLegDistance ||
      manhattanDistance(route.waypoint, route.goal) < minLegDistance
    ) {
      attemptStats.rejected = "legs too close";
      attemptLog.push(attemptStats);
      logGeneration(`attempt ${attempt} rejected`, { reason: attemptStats.rejected });
      continue;
    }

    const cells = toPuzzleCells(
      tileGrid,
      labels,
      rows,
      cols,
      route.start,
      route.waypoint,
      route.goal,
    );
    const puzzleWithoutPar: PuzzleGrid = {
      seed,
      rows,
      cols,
      cells,
      ...route,
    };

    const parContext = buildParContext(puzzleWithoutPar);

    if (parCostImpossibleAbove(parContext, config.maxPar)) {
      attemptStats.rejected = "par lower bound too high";
      attemptLog.push(attemptStats);
      logGeneration(`attempt ${attempt} rejected`, {
        reason: attemptStats.rejected,
        lowerBound: parContext.costLowerBound,
      });
      continue;
    }

    logGeneration(`attempt ${attempt} par search`, {
      lowerBound: parContext.costLowerBound,
      bridgeSlots: parContext.bridgeSlotList.length,
    });

    const parStarted = nowMs();
    const parCost = computeMinimumCost(
      puzzleWithoutPar,
      config.maxPar + 1,
      {
        maxStatesPerLayer: 48,
        maxCandidatesPerState: 16,
        context: parContext,
      },
    );
    const parFastMs = nowMs() - parStarted;
    attemptStats.parFastMs = parFastMs;
    totalParFastMs += parFastMs;

    if (
      parCost === null ||
      parCost < config.minPar ||
      parCost > config.maxPar
    ) {
      attemptStats.rejected = "par cost out of range";
      attemptLog.push(attemptStats);
      logGeneration(`attempt ${attempt} rejected`, {
        reason: attemptStats.rejected,
        parCost,
        parMs: parFastMs.toFixed(1),
      });
      continue;
    }

    logGeneration(`attempt ${attempt} accepted`, {
      parCost,
      parMs: parFastMs.toFixed(1),
      totalMs: (nowMs() - startedAt).toFixed(1),
    });

    attemptLog.push(attemptStats);

    const puzzle = { ...puzzleWithoutPar, parCost };
    const debug: GenerationDebugReport = {
      seed: baseSeed,
      totalMs: nowMs() - startedAt,
      attempts: attempt + 1,
      usedFallback: false,
      parCost,
      endpointDistance: spread,
      breakdown: {
        terrainMs: totalTerrainMs,
        endpointsMs: totalEndpointsMs,
        parFastMs: totalParFastMs,
        parExactMs: 0,
      },
      attemptLog,
    };

    return { puzzle, debug };
  }

  logGeneration("fallback", { afterAttempts: config.maxAttempts });

  const fallbackStarted = nowMs();
  const puzzle = buildFallbackPuzzle(baseSeed, config);
  const debug: GenerationDebugReport = {
    seed: baseSeed,
    totalMs: nowMs() - fallbackStarted,
    attempts: config.maxAttempts,
    usedFallback: true,
    parCost: puzzle.parCost,
    endpointDistance: endpointSpread(puzzle),
    breakdown: {
      terrainMs: totalTerrainMs,
      endpointsMs: totalEndpointsMs,
      parFastMs: totalParFastMs,
      parExactMs: 0,
    },
    attemptLog,
  };

  return { puzzle, debug };
}

function buildFallbackPuzzle(seed: string, config: GenerationConfig): Puzzle {
  const { rows, cols } = config.grid;
  const rawGrid: Array<Array<"land" | "water">> = Array.from(
    { length: rows },
    () => Array<"land" | "water">(cols).fill("water"),
  );

  for (let row = 2; row < rows - 2; row += 1) {
    for (let col = 2; col < 4; col += 1) {
      rawGrid[row]![col] = "land";
    }
    for (let col = cols - 4; col < cols - 2; col += 1) {
      rawGrid[row]![col] = "land";
    }
  }

  const midCol = Math.floor(cols / 2);
  for (let row = 4; row < rows - 4; row += 1) {
    rawGrid[row]![midCol] = "land";
    rawGrid[row]![midCol - 1] = "land";
  }

  const rng = mulberry32(hashStringToSeed(`${seed}-fallback`));
  const tileGrid = buildTileGridFromNoise(rawGrid, `${seed}-fallback`, rng);
  const labels = labelLandComponents(tileGrid, rows, cols);
  const route = pickCourierEndpoints(tileGrid, labels, rows, cols, rng);

  const start = route?.start ?? { row: 3, col: 3 };
  const waypoint = route?.waypoint ?? { row: Math.floor(rows / 2), col: midCol };
  const goal = route?.goal ?? { row: rows - 4, col: cols - 4 };

  const cells = toPuzzleCells(
    tileGrid,
    labels,
    rows,
    cols,
    start,
    waypoint,
    goal,
  );
  const puzzleWithoutPar: PuzzleGrid = {
    seed: `${seed}-fallback`,
    rows,
    cols,
    cells,
    start,
    waypoint,
    goal,
  };

  const parContext = buildParContext(puzzleWithoutPar);

  return {
    ...puzzleWithoutPar,
    parCost:
      computeMinimumCost(puzzleWithoutPar, config.maxPar + 1, {
        context: parContext,
        maxStatesPerLayer: 48,
        maxCandidatesPerState: 16,
      }) ?? 5,
  };
}

export function componentColor(componentId: number): string {
  const palette = [
    "#6bcb77",
    "#ffd93d",
    "#ff6b6b",
    "#4d96ff",
    "#c084fc",
    "#fb7185",
    "#2dd4bf",
    "#f97316",
  ];

  if (componentId < 0) {
    return "transparent";
  }

  return palette[componentId % palette.length]!;
}

export { cellKey } from "./coords";
