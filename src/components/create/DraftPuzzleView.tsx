"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { TilePalette } from "@/components/create/TilePalette";
import { GameBoard } from "@/components/game/GameBoard";
import { isLandKind } from "@/lib/game/tiles";
import type { Puzzle, PuzzleCell, PuzzleGrid, TileKind } from "@/lib/game/types";

type DraftPuzzleViewProps = {
  puzzle: PuzzleGrid;
};

const PANEL_FRAME =
  "overflow-hidden rounded-xl border border-white/15 bg-black/15 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.04)]";

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
  const [cells, setCells] = useState<PuzzleCell[]>(puzzle.cells);
  const [selectedKind, setSelectedKind] = useState<TileKind | null>(null);

  const renderPuzzle = useMemo<Puzzle>(
    () => ({ ...puzzle, cells, parCost: 0 }),
    [puzzle, cells],
  );
  const emptyBridges = useMemo(() => new Set<string>(), []);
  const emptyPath = useMemo(() => new Set<string>(), []);

  const handlePaintCell = useCallback(
    (row: number, col: number) => {
      if (!selectedKind) {
        return;
      }

      setCells((prev) => {
        const index = row * puzzle.cols + col;
        const existing = prev[index];
        if (!existing || existing.kind === selectedKind) {
          return prev;
        }

        const isLand = isLandKind(selectedKind);
        const next = prev.slice();
        next[index] = {
          ...existing,
          kind: selectedKind,
          componentId: isLand ? (existing.componentId >= 0 ? existing.componentId : 0) : -1,
        };
        return next;
      });
    },
    [selectedKind, puzzle.cols],
  );

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
              editable={selectedKind !== null}
              onCellClick={handlePaintCell}
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
        <p className="mt-1 text-[11px] text-sky-100/45">
          {selectedKind ? "Click the map to place." : "Select a tile to place."}
        </p>
        <div className="mt-4">
          <TilePalette selectedKind={selectedKind} onSelect={setSelectedKind} />
        </div>
      </aside>
    </div>
  );
}
