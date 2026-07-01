"use client";

import { useMemo } from "react";

import { GameBoard } from "@/components/game/GameBoard";
import type { Puzzle, PuzzleGrid } from "@/lib/game/types";

type DraftPuzzleViewProps = {
  puzzle: PuzzleGrid;
};

function toRenderablePuzzle(puzzle: PuzzleGrid): Puzzle {
  return {
    ...puzzle,
    parCost: 0,
  };
}

export function DraftPuzzleView({ puzzle }: DraftPuzzleViewProps) {
  const renderPuzzle = useMemo(() => toRenderablePuzzle(puzzle), [puzzle]);
  const emptyBridges = useMemo(() => new Set<string>(), []);
  const emptyPath = useMemo(() => new Set<string>(), []);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <section className="flex min-h-0 min-w-0 flex-[3] p-4">
        <div className="flex h-full w-full items-start justify-center overflow-hidden rounded-xl border border-white/15 bg-black/15 px-3 pb-3 pt-0 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.04)]">
          <GameBoard
            puzzle={renderPuzzle}
            bridges={emptyBridges}
            pathKeys={emptyPath}
            showComponents={false}
            interactive={false}
            sizing="contain"
          />
        </div>
      </section>

      <aside className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-white/10 bg-black/10 p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200/50">
          Tools
        </p>
        <p className="mt-3 text-sm text-sky-100/45">UI placeholder</p>
      </aside>
    </div>
  );
}
