"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BeachCanvasOverlay } from "@/components/game/BeachCanvasOverlay";
import { BridgeCanvasOverlay } from "@/components/game/BridgeCanvasOverlay";
import { CellView } from "@/components/game/CellView";
import { CliffCanvasOverlay } from "@/components/game/CliffCanvasOverlay";
import { GrassCanvasOverlay } from "@/components/game/GrassCanvasOverlay";
import { ObjectCanvasOverlay } from "@/components/game/ObjectCanvasOverlay";
import { PathLineOverlay, type PathLineStyle } from "@/components/game/PathLineOverlay";
import { RouteCanvasOverlay, type DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { TerrainBorderOverlay } from "@/components/game/TerrainBorderOverlay";
import { WaterCanvasOverlay } from "@/components/game/WaterCanvasOverlay";
import { createAppearanceContext } from "@/lib/rendering/cellAppearance";
import { terrainGridGap } from "@/lib/rendering/terrainBorders";
import type { LevelObject, LevelRoute } from "@/lib/game/level/types";
import type { CellCoord, Puzzle } from "@/lib/game/types";

type GameBoardProps = {
  puzzle: Puzzle;
  bridges: Set<string>;
  pathKeys: Set<string>;
  runPath?: CellCoord[];
  optimalPath?: CellCoord[];
  showOptimalPath?: boolean;
  showComponents: boolean;
  interactive?: boolean;
  editable?: boolean;
  sizing?: "play" | "contain";
  /** OBJECT LAYER (BUILDINGS) DRAWN OVER TERRAIN */
  objects?: LevelObject[];
  /** ROUTE LAYER (PIRATE/MERCHANT PATHS) DRAWN OVER OBJECTS */
  routes?: LevelRoute[];
  draftRoute?: DraftRoute | null;
  onToggleBridge?: (row: number, col: number) => void;
  onCellClick?: (row: number, col: number) => void;
};

const MAX_CELL = 44;
const MIN_CELL = 24;
const CONTAIN_MIN_CELL = 4;
const BOARD_PADDING = 24;
const BOARD_CARD_PADDING = 12;
const BOARD_CARD_BORDER = 1;

function gridPixelSize(
  cellSize: number,
  rows: number,
  cols: number,
): { width: number; height: number } {
  const gap = terrainGridGap(cellSize);
  return {
    width: cols * cellSize + Math.max(0, cols - 1) * gap,
    height: rows * cellSize + Math.max(0, rows - 1) * gap,
  };
}

function boardCardPixelSize(
  cellSize: number,
  rows: number,
  cols: number,
): { width: number; height: number } {
  const grid = gridPixelSize(cellSize, rows, cols);
  const chrome = BOARD_CARD_PADDING * 2 + BOARD_CARD_BORDER * 2;

  return {
    width: grid.width + chrome,
    height: grid.height + chrome,
  };
}

function resolveCellSize(
  width: number,
  height: number,
  rows: number,
  cols: number,
  sizing: "play" | "contain",
): number {
  if (sizing === "contain") {
    if (width <= 0 || height <= 0) {
      return CONTAIN_MIN_CELL;
    }

    let lo = CONTAIN_MIN_CELL;
    let hi = 512;
    let best = CONTAIN_MIN_CELL;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const card = boardCardPixelSize(mid, rows, cols);

      if (card.width <= width && card.height <= height) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return best;
  }

  const minCell = MIN_CELL;
  const maxCell = MAX_CELL;

  let gap = terrainGridGap(maxCell);
  let fromWidth = (width - gap * (cols - 1)) / cols;
  let fromHeight = (height - gap * (rows - 1)) / rows;

  let next = Math.floor(Math.min(fromWidth, fromHeight, maxCell));
  next = Math.max(minCell, next);
  gap = terrainGridGap(next);
  fromWidth = (width - gap * (cols - 1)) / cols;
  fromHeight = (height - gap * (rows - 1)) / rows;
  next = Math.floor(Math.min(fromWidth, fromHeight, maxCell));

  return Math.max(minCell, next);
}

export function GameBoard({
  puzzle,
  bridges,
  pathKeys,
  runPath = [],
  optimalPath = [],
  showOptimalPath = false,
  showComponents,
  interactive = true,
  editable = false,
  sizing = "play",
  objects,
  routes,
  draftRoute,
  onToggleBridge,
  onCellClick,
}: GameBoardProps) {
  const handleCellActivate = editable ? onCellClick : onToggleBridge;
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(() =>
    sizing === "contain" ? CONTAIN_MIN_CELL : MAX_CELL,
  );
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
      if (sizing === "contain") {
        setCellSize(
          resolveCellSize(
            element.clientWidth,
            element.clientHeight,
            puzzle.rows,
            puzzle.cols,
            sizing,
          ),
        );
        return;
      }

      const width = element.clientWidth - BOARD_PADDING;
      const heightBudget = Math.min(window.innerHeight * 0.58, 640);

      setCellSize(
        resolveCellSize(width, heightBudget, puzzle.rows, puzzle.cols, sizing),
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [puzzle.rows, puzzle.cols, sizing]);

  return (
    <div
      ref={containerRef}
      className={
        sizing === "contain"
          ? "flex h-full w-full items-start justify-center"
          : "w-full max-w-md lg:max-w-none lg:flex-1"
      }
    >
      <div
        className={
          sizing === "contain"
            ? "max-h-full max-w-full shrink-0 rounded-2xl border border-sky-950/20 bg-sky-950/10 p-3 shadow-xl shadow-sky-950/20"
            : "mx-auto w-fit max-w-full rounded-2xl border border-sky-950/20 bg-sky-950/10 p-3 shadow-xl shadow-sky-950/20"
        }
      >
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
          {objects && objects.length > 0 ? (
            <ObjectCanvasOverlay
              objects={objects}
              rows={puzzle.rows}
              cols={puzzle.cols}
              cellSize={cellSize}
              gap={gridGap}
            />
          ) : null}
          {(routes && routes.length > 0) || draftRoute ? (
            <RouteCanvasOverlay
              routes={routes ?? []}
              draftRoute={draftRoute}
              rows={puzzle.rows}
              cols={puzzle.cols}
              cellSize={cellSize}
              gap={gridGap}
            />
          ) : null}
          {Array.from({ length: puzzle.rows }, (_, row) =>
            Array.from({ length: puzzle.cols }, (_, col) => (
              <CellView
                key={`${row}-${col}`}
                row={row}
                col={col}
                context={context}
                cellSize={cellSize}
                interactive={interactive}
                editable={editable}
                onToggle={handleCellActivate}
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
