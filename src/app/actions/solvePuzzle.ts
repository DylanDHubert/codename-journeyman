"use server";

import {
  logGeneration,
  nowMs,
} from "@/lib/game/generationDebug";
import {
  normalizeConfig,
  parSearchLimits,
  type GenerationConfig,
} from "@/lib/game/generationConfig";
import { computeMinimumCost } from "@/lib/game/par";
import { buildParContext } from "@/lib/game/parPrecompute";
import type { PuzzleGrid } from "@/lib/game/types";

export type SolvePuzzleResult = {
  parCost: number | null;
  solveMs: number;
};

export async function solvePuzzleAction(
  puzzle: PuzzleGrid,
  config: Pick<GenerationConfig, "maxPar">,
): Promise<SolvePuzzleResult> {
  const started = nowMs();
  const resolved = normalizeConfig(config);
  const limits = parSearchLimits();
  const context = buildParContext(puzzle);

  logGeneration("solve invoked", {
    seed: puzzle.seed,
    grid: `${puzzle.rows}×${puzzle.cols}`,
    bridgeSlots: context.bridgeSlotList.length,
    maxPar: resolved.maxPar,
  });

  const parCost = computeMinimumCost(puzzle, resolved.maxPar + 1, {
    context,
    ...limits,
  });

  const solveMs = nowMs() - started;

  logGeneration("solve complete", {
    seed: puzzle.seed,
    parCost,
    solveMs: solveMs.toFixed(1),
  });

  return { parCost, solveMs };
}
