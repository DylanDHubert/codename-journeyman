"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BeachCanvasOverlay } from "@/components/game/BeachCanvasOverlay";
import { BridgeCanvasOverlay } from "@/components/game/BridgeCanvasOverlay";
import { CellView } from "@/components/game/CellView";
import { CliffCanvasOverlay } from "@/components/game/CliffCanvasOverlay";
import { GrassCanvasOverlay } from "@/components/game/GrassCanvasOverlay";
import { PathLineOverlay, type PathLineStyle } from "@/components/game/PathLineOverlay";
import { TerrainBorderOverlay } from "@/components/game/TerrainBorderOverlay";
import { WaterCanvasOverlay } from "@/components/game/WaterCanvasOverlay";
import { createAppearanceContext } from "@/lib/rendering/cellAppearance";
import { terrainGridGap } from "@/lib/rendering/terrainBorders";
import type { CellCoord, Puzzle } from "@/lib/game/types";

type GameBoardProps = {
  puzzle: Puzzle;
  bridges: Set<string>;
  pathKeys: Set<string>;
  runPath?: CellCoord[];
  optimalPath?: CellCoord[];
  showOptimalPath?: boolean;
  showComponents: boolean;
  onToggleBridge: (row: number, col: number) => void;
};

const MAX_CELL = 44;
const MIN_CELL = 24;
const BOARD_PADDING = 24;

export function GameBoard({
  puzzle,
  bridges,
  pathKeys,
  runPath = [],
  optimalPath = [],
  showOptimalPath = false,
  showComponents,
  onToggleBridge,
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(MAX_CELL);
  const gridGap = terrainGridGap(cellSize);

  const context = useMemo(
    () => createAppearanceContext(puzzle, bridges, pathKeys, showComponents),
    [puzzle, bridges, pathKeys, showComponents],
  );

  const pathLines = useMemo((): PathLineStyle[] => {
    const lines: PathLineStyle[] = [];

    if (runPath.length >= 2) {
      lines.push({
        id: "run",
        path: runPath,
        stroke: "rgb(251 191 36)",
        opacity: 0.95,
      });
    }

    if (showOptimalPath && optimalPath.length >= 2) {
      lines.push({
        id: "optimal",
        path: optimalPath,
        stroke: "rgb(56 189 248)",
        dashArray: "6 4",
        opacity: 0.85,
      });
    }

    return lines;
  }, [runPath, optimalPath, showOptimalPath]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const width = element.clientWidth - BOARD_PADDING;
      const viewportHeight = window.innerHeight;
      const heightBudget = Math.min(viewportHeight * 0.58, 640);

      let gap = terrainGridGap(MAX_CELL);
      let fromWidth =
        (width - gap * (puzzle.cols - 1)) / puzzle.cols;
      let fromHeight =
        (heightBudget - BOARD_PADDING - gap * (puzzle.rows - 1)) /
        puzzle.rows;

      let next = Math.floor(Math.min(fromWidth, fromHeight, MAX_CELL));
      next = Math.max(MIN_CELL, next);
      gap = terrainGridGap(next);
      fromWidth = (width - gap * (puzzle.cols - 1)) / puzzle.cols;
      fromHeight =
        (heightBudget - BOARD_PADDING - gap * (puzzle.rows - 1)) /
        puzzle.rows;
      next = Math.floor(Math.min(fromWidth, fromHeight, MAX_CELL));
      setCellSize(Math.max(MIN_CELL, next));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [puzzle.rows, puzzle.cols]);

  return (
    <div ref={containerRef} className="w-full max-w-md lg:max-w-none lg:flex-1">
      <div className="mx-auto w-fit max-w-full rounded-2xl border border-sky-950/20 bg-sky-950/10 p-3 shadow-xl shadow-sky-950/20">
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `repeat(${puzzle.cols}, ${cellSize}px)`,
            gap: gridGap,
          }}
        >
          <WaterCanvasOverlay
            puzzle={puzzle}
            context={context}
            cellSize={cellSize}
            gap={gridGap}
          />
          <BeachCanvasOverlay
            puzzle={puzzle}
            context={context}
            cellSize={cellSize}
            gap={gridGap}
          />
          <GrassCanvasOverlay
            puzzle={puzzle}
            context={context}
            cellSize={cellSize}
            gap={gridGap}
          />
          <CliffCanvasOverlay
            puzzle={puzzle}
            context={context}
            cellSize={cellSize}
            gap={gridGap}
          />
          <TerrainBorderOverlay
            puzzle={puzzle}
            context={context}
            cellSize={cellSize}
            gap={gridGap}
          />
          <BridgeCanvasOverlay
            puzzle={puzzle}
            context={context}
            cellSize={cellSize}
            gap={gridGap}
          />
          {Array.from({ length: puzzle.rows }, (_, row) =>
            Array.from({ length: puzzle.cols }, (_, col) => (
              <CellView
                key={`${row}-${col}`}
                row={row}
                col={col}
                context={context}
                cellSize={cellSize}
                interactive
                onToggle={onToggleBridge}
              />
            )),
          )}
          <PathLineOverlay
            paths={pathLines}
            rows={puzzle.rows}
            cols={puzzle.cols}
            cellSize={cellSize}
            gap={gridGap}
          />
        </div>
      </div>
    </div>
  );
}
