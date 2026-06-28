export type GenerationAttemptStats = {
  attempt: number;
  terrainMs: number;
  endpointsMs: number;
  parFastMs: number;
  rejected: string;
};

export type GenerationDebugReport = {
  seed: string;
  totalMs: number;
  attempts: number;
  usedFallback: boolean;
  parCost: number;
  endpointDistance: number;
  breakdown: {
    terrainMs: number;
    endpointsMs: number;
    parFastMs: number;
    parExactMs: number;
  };
  attemptLog: GenerationAttemptStats[];
};

export function shouldLogGeneration(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.BRIDGE_GEN_DEBUG === "1"
  );
}

export function logGeneration(message: string, data?: Record<string, unknown>): void {
  if (!shouldLogGeneration()) {
    return;
  }

  if (data) {
    console.log(`[bridge-isles:gen] ${message}`, data);
    return;
  }

  console.log(`[bridge-isles:gen] ${message}`);
}

export function logGenerationReport(report: GenerationDebugReport): void {
  if (!shouldLogGeneration()) {
    return;
  }

  logGeneration("done", {
    seed: report.seed,
    totalMs: report.totalMs.toFixed(1),
    attempts: report.attempts,
    fallback: report.usedFallback,
    parCost: report.parCost,
    endpointDist: report.endpointDistance,
    terrainMs: report.breakdown.terrainMs.toFixed(1),
    endpointsMs: report.breakdown.endpointsMs.toFixed(1),
    parMs: report.breakdown.parFastMs.toFixed(1),
  });

  if (report.attemptLog.length > 0) {
    console.table(
      report.attemptLog.map((entry) => ({
        attempt: entry.attempt,
        terrainMs: entry.terrainMs.toFixed(1),
        endpointsMs: entry.endpointsMs.toFixed(1),
        parFastMs: entry.parFastMs.toFixed(1),
        rejected: entry.rejected || "—",
      })),
    );
  }
}

export function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
