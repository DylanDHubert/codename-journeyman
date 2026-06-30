import { createNoise2D } from "simplex-noise";

import { endpointSpread, pickCourierEndpoints } from "./endpoints";
import {
  DEFAULT_GENERATION_CONFIG,
  isLargeMapConfig,
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
import { rotatePuzzleClockwise } from "./puzzleRotate";
import { scalePuzzle2x } from "./puzzleScale";
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
const MIN_LARGE_MAP_ISLANDS = 14;
const MAX_LARGE_TOP_THREE_LAND_SHARE = 0.48;
const MAX_LARGE_LARGEST_ISLAND_SHARE = 0.18;

type IslandDistribution = {
  islandCount: number;
  topThreeLandShare: number;
  largestIslandShare: number;
};

function islandDistribution(
  labels: number[][],
  rows: number,
  cols: number,
): IslandDistribution {
  const sizes = new Map<number, number>();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const id = labels[row]![col]!;
      if (id >= 0) {
        sizes.set(id, (sizes.get(id) ?? 0) + 1);
      }
    }
  }

  const sorted = [...sizes.values()].sort((a, b) => b - a);
  const totalLand = sorted.reduce((sum, size) => sum + size, 0);
  const topThree = sorted.slice(0, 3).reduce((sum, size) => sum + size, 0);

  return {
    islandCount: sorted.length,
    topThreeLandShare: totalLand > 0 ? topThree / totalLand : 1,
    largestIslandShare: totalLand > 0 ? (sorted[0] ?? 0) / totalLand : 1,
  };
}

function isAcceptableLargeTerrain(
  labels: number[][],
  rows: number,
  cols: number,
  relaxed = false,
): string {
  const stats = islandDistribution(labels, rows, cols);

  if (stats.islandCount < (relaxed ? 10 : MIN_LARGE_MAP_ISLANDS)) {
    return "too few islands";
  }

  if (!relaxed) {
    if (stats.topThreeLandShare > MAX_LARGE_TOP_THREE_LAND_SHARE) {
      return "islands too concentrated";
    }

    if (stats.largestIslandShare > MAX_LARGE_LARGEST_ISLAND_SHARE) {
      return "dominant island mass";
    }
  }

  return "";
}

function largeNoiseForAttempt(
  config: GenerationConfig,
  attempt: number,
): GenerationConfig {
  const variants = [
    config.noise,
    {
      ...config.noise,
      landThreshold: 0.38,
      octave1Scale: 0.25,
      octave3Scale: 0.5,
      octave3Weight: 0.55,
    },
    {
      ...config.noise,
      landThreshold: 0.42,
      octave1Scale: 0.21,
      octave2Scale: 0.19,
      octave3Scale: 0.44,
    },
    {
      ...DEFAULT_GENERATION_CONFIG.noise,
      landThreshold: 0.37,
      octave1Scale: 0.2,
      octave3Scale: 0.4,
      octave3Weight: 0.5,
    },
  ];

  return {
    ...config,
    noise: variants[attempt % variants.length]!,
  };
}

function parSearchLimits(config: GenerationConfig): {
  maxStatesPerLayer: number;
  maxCandidatesPerState: number;
} {
  if (isLargeMapConfig(config)) {
    return { maxStatesPerLayer: 96, maxCandidatesPerState: 24 };
  }

  return { maxStatesPerLayer: 48, maxCandidatesPerState: 16 };
}

function finalizePuzzle(puzzle: Puzzle, config: GenerationConfig): Puzzle {
  if (!isLargeMapConfig(config)) {
    return puzzle;
  }

  return rotatePuzzleClockwise(scalePuzzle2x(puzzle));
}

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

    const attemptStats: GenerationAttemptStats = {
      attempt,
      terrainMs,
      endpointsMs: 0,
      parFastMs: 0,
      rejected: "",
    };

    if (isLargeMapConfig(config)) {
      const terrainIssue = isAcceptableLargeTerrain(labels, rows, cols);
      if (terrainIssue) {
        attemptStats.rejected = terrainIssue;
        attemptLog.push(attemptStats);
        logGeneration(`attempt ${attempt} rejected`, {
          reason: attemptStats.rejected,
          ...islandDistribution(labels, rows, cols),
        });
        continue;
      }
    }

    const endpointsStarted = nowMs();
    const route = pickCourierEndpoints(tileGrid, labels, rows, cols, rng);
    const endpointsMs = nowMs() - endpointsStarted;
    totalEndpointsMs += endpointsMs;
    attemptStats.endpointsMs = endpointsMs;

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
    const parLimits = parSearchLimits(config);
    const parCost = computeMinimumCost(
      puzzleWithoutPar,
      config.maxPar + 1,
      {
        maxStatesPerLayer: parLimits.maxStatesPerLayer,
        maxCandidatesPerState: parLimits.maxCandidatesPerState,
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

    const puzzle = finalizePuzzle({ ...puzzleWithoutPar, parCost }, config);
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
  const puzzle = isLargeMapConfig(config)
    ? buildNoiseFallbackPuzzle(baseSeed, config)
    : finalizePuzzle(buildFallbackPuzzle(baseSeed, config), config);
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

function buildNoiseFallbackPuzzle(seed: string, config: GenerationConfig): Puzzle {
  return generateLargeMapFallback(seed, config);
}

function generateLargeMapFallback(
  seed: string,
  config: GenerationConfig,
): Puzzle {
  const { rows, cols } = config.grid;
  const parLimits = parSearchLimits(config);
  let wave = 0;

  while (true) {
    const waveSeed = `${seed}-large-fallback-w${wave}`;
    const startAttempt = wave * 1024;

    for (let attempt = 0; attempt < 1024; attempt += 1) {
      const globalAttempt = startAttempt + attempt;
      const attemptSeed = `${waveSeed}-${attempt}`;
      const rng = mulberry32(hashStringToSeed(attemptSeed));
      const relaxed = attempt >= 768;
      const attemptConfig = largeNoiseForAttempt(config, globalAttempt);
      const rawGrid = buildRawTerrainGrid(attemptConfig, attemptSeed);
      const tileGrid = buildTileGridFromNoise(rawGrid, attemptSeed, rng);
      const labels = labelLandComponents(tileGrid, rows, cols);

      const terrainIssue = isAcceptableLargeTerrain(labels, rows, cols, relaxed);
      if (terrainIssue) {
        continue;
      }

      const route = pickCourierEndpoints(tileGrid, labels, rows, cols, rng);
      if (!route) {
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
        seed: attemptSeed,
        rows,
        cols,
        cells,
        ...route,
      };
      const parContext = buildParContext(puzzleWithoutPar);
      const parCost = computeMinimumCost(
        puzzleWithoutPar,
        relaxed ? config.maxPar + 8 : config.maxPar + 1,
        {
          context: parContext,
          ...parLimits,
        },
      );

      if (parCost === null || parCost < config.minPar) {
        continue;
      }

      if (!relaxed && parCost > config.maxPar) {
        continue;
      }

      return finalizePuzzle(
        { ...puzzleWithoutPar, parCost: Math.max(parCost, config.minPar) },
        config,
      );
    }

    wave += 1;
  }
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

  const parLimits = parSearchLimits(config);

  return {
    ...puzzleWithoutPar,
    parCost:
      computeMinimumCost(puzzleWithoutPar, config.maxPar + 1, {
        context: parContext,
        ...parLimits,
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
