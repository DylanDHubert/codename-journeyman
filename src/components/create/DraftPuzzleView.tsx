"use client";

import { useMemo, type ReactNode } from "react";

import { TilePalette } from "@/components/create/TilePalette";
import { GameBoard } from "@/components/game/GameBoard";
import type { Puzzle, PuzzleGrid } from "@/lib/game/types";

type DraftPuzzleViewProps = {
  puzzle: PuzzleGrid;
};

const PANEL_FRAME =
  "overflow-hidden rounded-xl border border-white/15 bg-black/15 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.04)]";

function toRenderablePuzzle(puzzle: PuzzleGrid): Puzzle {
  return {
    ...puzzle,
    parCost: 0,
  };
}

function PlaceholderPanel({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col p-3 ${PANEL_FRAME}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200/50">
        {eyebrow}
      </p>
      {children}
    </div>
  );
}

export function DraftPuzzleView({ puzzle }: DraftPuzzleViewProps) {
  const renderPuzzle = useMemo(() => toRenderablePuzzle(puzzle), [puzzle]);
  const emptyBridges = useMemo(() => new Set<string>(), []);
  const emptyPath = useMemo(() => new Set<string>(), []);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <section className="flex min-h-0 min-w-0 flex-[3] flex-col gap-3 p-4">
        <div className={`flex min-h-0 flex-[3] p-3 ${PANEL_FRAME}`}>
          <div className="flex min-h-0 flex-1 items-start justify-center">
            <GameBoard
              puzzle={renderPuzzle}
              bridges={emptyBridges}
              pathKeys={emptyPath}
              showComponents={false}
              interactive={false}
              sizing="contain"
            />
          </div>
        </div>

        <PlaceholderPanel eyebrow="Bottom tools">
          <p className="mt-2 text-sm text-sky-100/45">UI placeholder</p>
        </PlaceholderPanel>
      </section>

      <aside className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-white/10 bg-black/10 p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200/50">
          Tiles
        </p>
        <div className="mt-4">
          <TilePalette />
        </div>
      </aside>
    </div>
  );
}
