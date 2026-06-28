"use client";

import { starsForRun } from "@/hooks/useBridgeGame";
import type { GamePhase, Puzzle, SimulationResult } from "@/lib/game/types";

type GameHudProps = {
  puzzle: Puzzle;
  seed: string;
  bridgeCost: number;
  bridgeCount: number;
  phase: GamePhase;
  result: SimulationResult | null;
  showComponents: boolean;
  gridLabel: string;
  disabled?: boolean;
  hasSubmitted?: boolean;
  showOptimalPath?: boolean;
  onRun: () => void;
  onReset: () => void;
  onToggleComponents: () => void;
  onToggleOptimalPath?: () => void;
  onNewPuzzle: () => void;
};

function StarRow({ count }: { count: number }) {
  return (
    <span className="text-amber-300" aria-label={`${count} stars`}>
      {"★".repeat(count)}
      {"☆".repeat(Math.max(0, 3 - count))}
    </span>
  );
}

export function GameHud({
  puzzle,
  seed,
  bridgeCost,
  bridgeCount,
  phase,
  result,
  showComponents,
  gridLabel,
  disabled = false,
  hasSubmitted = false,
  showOptimalPath = false,
  onRun,
  onReset,
  onToggleComponents,
  onToggleOptimalPath,
  onNewPuzzle,
}: GameHudProps) {
  const stars =
    phase === "success" && result
      ? starsForRun(result.bridgeCost, puzzle.parCost)
      : null;

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-200/70">
          Bridge the Isles
        </p>
        <h1 className="text-2xl font-semibold text-white">
          Courier route: X → Y → Z
        </h1>
        <p className="text-sm text-sky-100/70">
          Daily seed <span className="font-mono text-sky-100">{seed}</span> ·{" "}
          {gridLabel} · Par cost{" "}
          <span className="font-semibold text-white">{puzzle.parCost}</span>
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
        <div>
          <span className="text-sky-100/60">Cost</span>{" "}
          <span className="text-lg font-semibold text-white">{bridgeCost}</span>
          <span className="ml-1 text-xs text-sky-100/50">({bridgeCount} bridges)</span>
        </div>
        <div className="h-4 w-px bg-white/15" />
        <div>
          {phase === "editing" ? (
            <span className="text-sky-100/70">Reach Y before Z — marsh costs ×2</span>
          ) : null}
          {phase === "disconnected" ? (
            <span className="text-rose-300">Route incomplete — keep building</span>
          ) : null}
          {phase === "success" && result ? (
            <span className="text-emerald-300">
              Route complete · cost {result.bridgeCost}
              {stars !== null ? (
                <>
                  {" "}
                  · <StarRow count={stars} />
                </>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={disabled}
          className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run route
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear bridges
        </button>
        <button
          type="button"
          onClick={onToggleComponents}
          disabled={disabled}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showComponents ? "Hide" : "Show"} islands
        </button>
        <button
          type="button"
          onClick={onNewPuzzle}
          disabled={disabled}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          New archipelago
        </button>
        {hasSubmitted && onToggleOptimalPath ? (
          <button
            type="button"
            onClick={onToggleOptimalPath}
            disabled={disabled}
            className="rounded-lg border border-sky-300/30 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showOptimalPath ? "Hide" : "Show"} par route
          </button>
        ) : null}
      </div>

      {hasSubmitted ? (
        <div className="flex flex-wrap gap-3 text-[11px] text-sky-100/55">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-amber-300" />
            Your route
          </span>
          {showOptimalPath ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded border border-dashed border-sky-300 bg-sky-300/40" />
              Par {puzzle.parCost}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-sky-100/50">
        Whirlpools block bridges. Marsh shallows cost double. Cliffs are rocky
        coast — you can build beside them, but you cannot step between a cliff
        and a bridge.
      </p>
    </div>
  );
}
