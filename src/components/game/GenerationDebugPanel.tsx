"use client";

import { useEffect, useState } from "react";

import type { GenerationDebugReport } from "@/lib/game/generationDebug";

type GenerationDebugPanelProps = {
  debug: GenerationDebugReport | null;
  isGenerating: boolean;
  error: string | null;
  genStartedAt?: number | null;
};

export function GenerationDebugPanel({
  debug,
  isGenerating,
  error,
  genStartedAt = null,
}: GenerationDebugPanelProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isGenerating || genStartedAt === null) {
      return;
    }

    const tick = () => {
      setElapsedMs(Math.max(0, performance.now() - genStartedAt));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isGenerating, genStartedAt]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <section className="w-full max-w-xl rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 font-mono text-[10px] text-amber-100/80">
      <p className="mb-1 uppercase tracking-wider text-amber-200/60">
        Gen debug (server terminal + here)
      </p>
      {isGenerating ? (
        <p>
          Generating on server…{" "}
          {genStartedAt !== null
            ? `${(elapsedMs / 1000).toFixed(1)}s elapsed`
            : null}
        </p>
      ) : null}
      {error ? <p className="text-rose-300">Error: {error}</p> : null}
      {debug && !isGenerating ? (
        <ul className="space-y-0.5">
          <li>total: {debug.totalMs.toFixed(1)}ms</li>
          <li>
            attempts: {debug.attempts}
            {debug.usedFallback ? " (fallback)" : ""}
          </li>
          <li>
            terrain {debug.breakdown.terrainMs.toFixed(1)}ms · endpoints{" "}
            {debug.breakdown.endpointsMs.toFixed(1)}ms · par{" "}
            {debug.breakdown.parFastMs.toFixed(1)}ms
          </li>
          <li>
            par={debug.parCost} · endpoint dist={debug.endpointDistance}
          </li>
        </ul>
      ) : null}
    </section>
  );
}
