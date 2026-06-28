/**
 * PAR TIMING BENCHMARK — GRID SIZES × FEATURE TOGGLES
 *
 * Usage:
 *   npm run bench:par
 *   npm run bench:par -- --mode quick
 *   npm run bench:par -- --mode full
 *   npm run bench:par -- --mode sizes
 *   npm run bench:par -- --mode features
 *   npm run bench:par -- --seed my-seed --max-par 24 --csv
 */

import { pickCourierEndpoints } from "../src/lib/game/endpoints";
import { buildRawTerrainGrid } from "../src/lib/game/generation";
import {
  DEFAULT_GENERATION_CONFIG,
  normalizeConfig,
} from "../src/lib/game/generationConfig";
import { computeMinimumCost } from "../src/lib/game/par";
import { buildParContext } from "../src/lib/game/parPrecompute";
import { hashStringToSeed, mulberry32 } from "../src/lib/game/seed";
import {
  buildTileGridFromNoise,
  labelLandComponents,
  toPuzzleCells,
  type TerrainFeatureToggles,
} from "../src/lib/game/terrainFeatures";
import type { PuzzleGrid } from "../src/lib/game/types";

type BenchMode = "quick" | "full" | "sizes" | "features";

type GridSize = { rows: number; cols: number; label: string };

type FeatureCombo = Required<TerrainFeatureToggles> & { label: string };

type BenchRow = {
  size: string;
  features: string;
  seed: string;
  attempt: number;
  ok: boolean;
  parCost: number | null;
  bridgeSlots: number;
  terrainMs: number;
  endpointsMs: number;
  precomputeMs: number;
  parSearchMs: number;
  totalParMs: number;
  totalMs: number;
  error?: string;
};

const MAX_ATTEMPTS = 24;

const QUICK_SIZES: GridSize[] = [{ rows: 16, cols: 8, label: "16×8" }];

const FULL_SIZES: GridSize[] = [
  { rows: 8, cols: 6, label: "8×6" },
  { rows: 10, cols: 8, label: "10×8" },
  { rows: 12, cols: 8, label: "12×8" },
  { rows: 16, cols: 8, label: "16×8" },
  { rows: 20, cols: 9, label: "20×9" },
  { rows: 22, cols: 12, label: "22×12" },
  { rows: 22, cols: 16, label: "22×16" },
];

const ALL_FEATURES: FeatureCombo = {
  cliffs: true,
  marsh: true,
  whirlpools: true,
  label: "CMW",
};

const FEATURE_COMBOS: FeatureCombo[] = [
  { cliffs: false, marsh: false, whirlpools: false, label: "---" },
  { cliffs: true, marsh: false, whirlpools: false, label: "C--" },
  { cliffs: false, marsh: true, whirlpools: false, label: "-M-" },
  { cliffs: false, marsh: false, whirlpools: true, label: "--W" },
  { cliffs: true, marsh: true, whirlpools: false, label: "CM-" },
  { cliffs: true, marsh: false, whirlpools: true, label: "C-W" },
  { cliffs: false, marsh: true, whirlpools: true, label: "-MW" },
  ALL_FEATURES,
];

function nowMs(): number {
  return performance.now();
}

function parseArgs(argv: string[]) {
  let mode: BenchMode = "quick";
  let seed = "bench-par";
  let maxPar = DEFAULT_GENERATION_CONFIG.maxPar;
  let csv = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--mode" && argv[i + 1]) {
      mode = argv[i + 1] as BenchMode;
      i += 1;
    } else if (arg === "--seed" && argv[i + 1]) {
      seed = argv[i + 1]!;
      i += 1;
    } else if (arg === "--max-par" && argv[i + 1]) {
      maxPar = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--csv") {
      csv = true;
    }
  }

  return { mode, seed, maxPar, csv };
}

function formatMs(ms: number): string {
  if (ms >= 60_000) {
    return `${(ms / 60_000).toFixed(2)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.round(ms)}ms`;
}

function attemptSeed(baseSeed: string, size: GridSize, attempt: number): string {
  return `${baseSeed}-${size.rows}x${size.cols}-${attempt}`;
}

function buildPuzzleFromRawGrid(
  rawGrid: Array<Array<"land" | "water">>,
  size: GridSize,
  seed: string,
  features: TerrainFeatureToggles,
): {
  puzzle: PuzzleGrid;
  terrainMs: number;
  endpointsMs: number;
} | null {
  const terrainStarted = nowMs();
  const rng = mulberry32(hashStringToSeed(seed));
  const tileGrid = buildTileGridFromNoise(rawGrid, seed, rng, features);
  const labels = labelLandComponents(tileGrid, size.rows, size.cols);
  const terrainMs = nowMs() - terrainStarted;

  const endpointsStarted = nowMs();
  const route = pickCourierEndpoints(
    tileGrid,
    labels,
    size.rows,
    size.cols,
    rng,
  );
  const endpointsMs = nowMs() - endpointsStarted;

  if (!route) {
    return null;
  }

  const cells = toPuzzleCells(
    tileGrid,
    labels,
    size.rows,
    size.cols,
    route.start,
    route.waypoint,
    route.goal,
  );

  return {
    puzzle: {
      seed,
      rows: size.rows,
      cols: size.cols,
      cells,
      ...route,
    },
    terrainMs,
    endpointsMs,
  };
}

/** FIND RAW TERRAIN THAT YIELDS ENDPOINTS WITH FULL FEATURES */
function resolveRawTerrain(
  size: GridSize,
  baseSeed: string,
): { rawGrid: Array<Array<"land" | "water">>; seed: string; attempt: number } | null {
  const config = normalizeConfig({
    grid: { rows: size.rows, cols: size.cols },
  });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const seed = attemptSeed(baseSeed, size, attempt);
    const rawGrid = buildRawTerrainGrid(config, seed);
    const built = buildPuzzleFromRawGrid(rawGrid, size, seed, ALL_FEATURES);

    if (built) {
      return { rawGrid, seed, attempt };
    }
  }

  return null;
}

function timePar(
  puzzle: PuzzleGrid,
  maxPar: number,
): {
  parCost: number | null;
  bridgeSlots: number;
  precomputeMs: number;
  parSearchMs: number;
  totalParMs: number;
} {
  const preStarted = nowMs();
  const context = buildParContext(puzzle);
  const precomputeMs = nowMs() - preStarted;

  const searchStarted = nowMs();
  const parCost = computeMinimumCost(puzzle, maxPar + 1, {
    context,
    maxStatesPerLayer: 48,
    maxCandidatesPerState: 16,
  });
  const parSearchMs = nowMs() - searchStarted;

  return {
    parCost,
    bridgeSlots: context.bridgeSlotList.length,
    precomputeMs,
    parSearchMs,
    totalParMs: precomputeMs + parSearchMs,
  };
}

function runCase(
  size: GridSize,
  combo: FeatureCombo,
  baseSeed: string,
  maxPar: number,
  rawGrid?: Array<Array<"land" | "water">>,
  resolvedSeed?: string,
  resolvedAttempt?: number,
): BenchRow {
  const started = nowMs();

  try {
    let terrain = rawGrid;
    let seed = resolvedSeed;
    let attempt = resolvedAttempt;

    if (!terrain || seed === undefined || attempt === undefined) {
      const resolved = resolveRawTerrain(size, baseSeed);
      if (!resolved) {
        return {
          size: size.label,
          features: combo.label,
          seed: baseSeed,
          attempt: -1,
          ok: false,
          parCost: null,
          bridgeSlots: 0,
          terrainMs: 0,
          endpointsMs: 0,
          precomputeMs: 0,
          parSearchMs: 0,
          totalParMs: 0,
          totalMs: nowMs() - started,
          error: "no terrain in 24 attempts",
        };
      }
      terrain = resolved.rawGrid;
      seed = resolved.seed;
      attempt = resolved.attempt;
    }

    const built = buildPuzzleFromRawGrid(terrain, size, seed, combo);
    if (!built) {
      return {
        size: size.label,
        features: combo.label,
        seed: seed!,
        attempt: attempt!,
        ok: false,
        parCost: null,
        bridgeSlots: 0,
        terrainMs: 0,
        endpointsMs: 0,
        precomputeMs: 0,
        parSearchMs: 0,
        totalParMs: 0,
        totalMs: nowMs() - started,
        error: "no endpoints",
      };
    }

    const par = timePar(built.puzzle, maxPar);

    return {
      size: size.label,
      features: combo.label,
      seed: seed!,
      attempt: attempt!,
      ok: true,
      parCost: par.parCost,
      bridgeSlots: par.bridgeSlots,
      terrainMs: built.terrainMs,
      endpointsMs: built.endpointsMs,
      precomputeMs: par.precomputeMs,
      parSearchMs: par.parSearchMs,
      totalParMs: par.totalParMs,
      totalMs: nowMs() - started,
    };
  } catch (error) {
    return {
      size: size.label,
      features: combo.label,
      seed: resolvedSeed ?? baseSeed,
      attempt: resolvedAttempt ?? -1,
      ok: false,
      parCost: null,
      bridgeSlots: 0,
      terrainMs: 0,
      endpointsMs: 0,
      precomputeMs: 0,
      parSearchMs: 0,
      totalParMs: 0,
      totalMs: nowMs() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printTable(rows: BenchRow[]): void {
  const header = [
    "size",
    "feat",
    "try",
    "par",
    "slots",
    "terrain",
    "endpts",
    "precomp",
    "search",
    "parΣ",
    "total",
    "status",
  ];

  const colWidths = header.map((h) => h.length);
  const lines = rows.map((row) => {
    const cells = [
      row.size,
      row.features,
      row.attempt >= 0 ? String(row.attempt) : "—",
      row.parCost === null ? "—" : String(row.parCost),
      String(row.bridgeSlots),
      formatMs(row.terrainMs),
      formatMs(row.endpointsMs),
      formatMs(row.precomputeMs),
      formatMs(row.parSearchMs),
      formatMs(row.totalParMs),
      formatMs(row.totalMs),
      row.ok ? "ok" : row.error ?? "fail",
    ];
    cells.forEach((cell, i) => {
      colWidths[i] = Math.max(colWidths[i]!, cell.length);
    });
    return cells;
  });

  const pad = (text: string, width: number) => text.padEnd(width);

  console.log(header.map((h, i) => pad(h, colWidths[i]!)).join("  "));
  console.log(colWidths.map((w) => "-".repeat(w)).join("  "));

  for (const cells of lines) {
    console.log(cells.map((cell, i) => pad(cell, colWidths[i]!)).join("  "));
  }
}

function printCsv(rows: BenchRow[]): void {
  console.log(
    "size,features,seed,attempt,ok,parCost,bridgeSlots,terrainMs,endpointsMs,precomputeMs,parSearchMs,totalParMs,totalMs,error",
  );
  for (const row of rows) {
    console.log(
      [
        row.size,
        row.features,
        row.seed,
        row.attempt,
        row.ok,
        row.parCost ?? "",
        row.bridgeSlots,
        row.terrainMs.toFixed(2),
        row.endpointsMs.toFixed(2),
        row.precomputeMs.toFixed(2),
        row.parSearchMs.toFixed(2),
        row.totalParMs.toFixed(2),
        row.totalMs.toFixed(2),
        row.error ?? "",
      ].join(","),
    );
  }
}

function summarize(rows: BenchRow[]): void {
  const okRows = rows.filter((row) => row.ok);
  if (okRows.length === 0) {
    console.log("\nNo successful runs.");
    return;
  }

  const totalParMs = okRows.reduce((sum, row) => sum + row.totalParMs, 0);
  const maxPar = okRows.reduce(
    (max, row) => (row.totalParMs > max.totalParMs ? row : max),
    okRows[0]!,
  );
  const minPar = okRows.reduce(
    (min, row) => (row.totalParMs < min.totalParMs ? row : min),
    okRows[0]!,
  );

  console.log("\n--- summary ---");
  console.log(`runs: ${rows.length} (${okRows.length} ok)`);
  console.log(`par time Σ: ${formatMs(totalParMs)}`);
  console.log(
    `fastest par: ${formatMs(minPar.totalParMs)} (${minPar.size} ${minPar.features})`,
  );
  console.log(
    `slowest par: ${formatMs(maxPar.totalParMs)} (${maxPar.size} ${maxPar.features})`,
  );
  console.log(`avg par (ok): ${formatMs(totalParMs / okRows.length)}`);
}

function main(): void {
  const { mode, seed, maxPar, csv } = parseArgs(process.argv.slice(2));

  let sizes: GridSize[];
  let combos: FeatureCombo[];

  switch (mode) {
    case "full":
      sizes = FULL_SIZES;
      combos = FEATURE_COMBOS;
      break;
    case "sizes":
      sizes = FULL_SIZES;
      combos = [ALL_FEATURES];
      break;
    case "features":
      sizes = QUICK_SIZES;
      combos = FEATURE_COMBOS;
      break;
    case "quick":
    default:
      sizes = QUICK_SIZES;
      combos = FEATURE_COMBOS;
      break;
  }

  const cases = sizes.length * combos.length;
  console.log(`[bench:par] mode=${mode} seed=${seed} maxPar=${maxPar} cases=${cases}`);
  console.log(
    "features key: C=cliffs M=marsh W=whirlpools (CMW = all on)\n",
  );

  const rows: BenchRow[] = [];
  let caseIndex = 0;

  for (const size of sizes) {
    const resolved = resolveRawTerrain(size, seed);
    if (!resolved) {
      for (const combo of combos) {
        caseIndex += 1;
        rows.push({
          size: size.label,
          features: combo.label,
          seed,
          attempt: -1,
          ok: false,
          parCost: null,
          bridgeSlots: 0,
          terrainMs: 0,
          endpointsMs: 0,
          precomputeMs: 0,
          parSearchMs: 0,
          totalParMs: 0,
          totalMs: 0,
          error: "no terrain in 24 attempts",
        });
      }
      continue;
    }

    process.stdout.write(
      `\r[terrain] ${size.label} using attempt ${resolved.attempt} (${resolved.seed})`,
    );

    for (const combo of combos) {
      caseIndex += 1;
      process.stdout.write(
        `\r[${caseIndex}/${cases}] ${size.label} ${combo.label}…`,
      );
      rows.push(
        runCase(
          size,
          combo,
          seed,
          maxPar,
          resolved.rawGrid,
          resolved.seed,
          resolved.attempt,
        ),
      );
    }
  }

  process.stdout.write("\n\n");

  if (csv) {
    printCsv(rows);
  } else {
    printTable(rows);
    summarize(rows);
  }
}

main();
