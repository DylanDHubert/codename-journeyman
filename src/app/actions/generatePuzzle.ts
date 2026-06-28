"use server";

import { generatePuzzleWithDebug } from "@/lib/game/generation";
import {
  logGeneration,
  logGenerationReport,
  nowMs,
  type GenerationDebugReport,
} from "@/lib/game/generationDebug";
import { normalizeConfig, type GenerationConfig } from "@/lib/game/generationConfig";
import type { Puzzle } from "@/lib/game/types";

export type GeneratePuzzleResult = {
  puzzle: Puzzle;
  debug: GenerationDebugReport;
};

export async function generatePuzzleAction(
  seed: string,
  config: GenerationConfig,
): Promise<GeneratePuzzleResult> {
  const normalized = normalizeConfig(config);
  const started = nowMs();

  logGeneration("action invoked", {
    seed,
    grid: `${normalized.grid.rows}×${normalized.grid.cols}`,
    minPar: normalized.minPar,
    maxPar: normalized.maxPar,
  });

  try {
    const result = generatePuzzleWithDebug({
      seed,
      config: normalized,
    });

    logGenerationReport(result.debug);
    logGeneration("action complete", {
      seed,
      actionMs: (nowMs() - started).toFixed(1),
      parCost: result.puzzle.parCost,
    });

    return result;
  } catch (error) {
    console.error("[bridge-isles:gen] action failed", {
      seed,
      actionMs: (nowMs() - started).toFixed(1),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
