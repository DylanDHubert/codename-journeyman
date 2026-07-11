"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BeachCanvasOverlay } from "@/components/game/BeachCanvasOverlay";
import { BridgeCanvasOverlay } from "@/components/game/BridgeCanvasOverlay";
import { CellView } from "@/components/game/CellView";
import { CliffCanvasOverlay } from "@/components/game/CliffCanvasOverlay";
import { GrassCanvasOverlay } from "@/components/game/GrassCanvasOverlay";
import { MissionMarkerOverlay } from "@/components/game/MissionMarkerOverlay";
import { ObjectCanvasOverlay } from "@/components/game/ObjectCanvasOverlay";
import { PathLineOverlay, type PathLineStyle } from "@/components/game/PathLineOverlay";
import { RouteCanvasOverlay, type DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { RouteShipOverlay } from "@/components/game/RouteShipOverlay";
import { TerrainBorderOverlay } from "@/components/game/TerrainBorderOverlay";
import { WaterCanvasOverlay } from "@/components/game/WaterCanvasOverlay";
import type { Level } from "@/lib/game/level/types";
import type { CellCoord } from "@/lib/game/types";
import { createAppearanceContext } from "@/lib/rendering/cellAppearance";
import { DEFAULT_DISPLAY_PREFS } from "@/lib/rendering/displayPrefs";
import { terrainGridGap } from "@/lib/rendering/terrainBorders";
import { terrainViewFromLevel } from "@/lib/rendering/terrainView";

type GameBoardProps = {
  level: Level;
  bridges: Set<string>;
  pathKeys: Set<string>;
  runPath?: CellCoord[];
  showMission?: boolean;
  interactive?: boolean;
  editable?: boolean;
  sizing?: "play" | "contain";
  draftRoute?: DraftRoute | null;
  /** WHITE CELL OUTLINE OPACITY — 0 HIDES THE GRID */
  cellGridOpacity?: number;
  /** BLEND WATER DEPTH ACROSS NEIGHBOR CELLS — 0 = CHUNKY, 1 = FULL */
  waterDepthInterpolation?: number;
  onToggleBridge?: (row: number, col: number) => void;
  onCellClick?: (row: number, col: number) => void;
};

const MAX_CELL = 44;
const MIN_CELL = 24;
const emptyRoutes: Level["routes"] = [];
const CONTAIN_MIN_CELL = 4;
const BOARD_PADDING = 24;
const BOARD_CARD_PADDING = 12;
const BOARD_CARD_BORDER = 1;

function gridPixelSize(cellSize: number, rows: number, cols: number) {
  const gap = terrainGridGap(cellSize);
  return {
    width: cols * cellSize + Math.max(0, cols - 1) * gap,
    height: rows * cellSize + Math.max(0, rows - 1) * gap,
  };
}

function boardCardPixelSize(cellSize: number, rows: number, cols: number) {
  const grid = gridPixelSize(cellSize, rows, cols);
  const chrome = BOARD_CARD_PADDING * 2 + BOARD_CARD_BORDER * 2;
  return { width: grid.width + chrome, height: grid.height + chrome };
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
  const gap = terrainGridGap(MAX_CELL);
  let fromWidth = (width - gap * (cols - 1)) / cols;
  let fromHeight = (height - gap * (rows - 1)) / rows;
  let next = Math.floor(Math.min(fromWidth, fromHeight, MAX_CELL));
  next = Math.max(MIN_CELL, next);
  return next;
}

export function GameBoard({
  level,
  bridges,
  pathKeys,
  runPath = [],
  showMission = true,
  interactive = true,
  editable = false,
  sizing = "play",
  draftRoute,
  cellGridOpacity = DEFAULT_DISPLAY_PREFS.cellGridOpacity,
  waterDepthInterpolation = DEFAULT_DISPLAY_PREFS.waterDepthInterpolation,
  onToggleBridge,
  onCellClick,
}: GameBoardProps) {
  const handleCellActivate = editable ? onCellClick : onToggleBridge;
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(() =>
    sizing === "contain" ? CONTAIN_MIN_CELL : MAX_CELL,
  );
  const gridGap = terrainGridGap(cellSize);
  const view = useMemo(() => terrainViewFromLevel(level), [level]);

  const context = useMemo(
    () =>
      createAppearanceContext(
        view,
        bridges,
        pathKeys,
        false,
        interactive && !editable ? level : undefined,
      ),
    [view, bridges, pathKeys, level, interactive, editable],
  );

  const pathLines = useMemo((): PathLineStyle[] => {
    if (runPath.length < 2) {
      return [];
    }
    return [
      {
        id: "run",
        path: runPath,
        stroke: "rgb(251 191 36)",
        opacity: 0.95,
      },
    ];
  }, [runPath]);

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
            level.rows,
            level.cols,
            sizing,
          ),
        );
        return;
      }
      const width = element.clientWidth - BOARD_PADDING;
      const heightBudget = Math.min(window.innerHeight * 0.58, 640);
      setCellSize(
        resolveCellSize(width, heightBudget, level.rows, level.cols, sizing),
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
  }, [level.rows, level.cols, sizing]);

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
            gridTemplateColumns: `repeat(${level.cols}, ${cellSize}px)`,
            gap: gridGap,
          }}
        >
          <WaterCanvasOverlay
            view={view}
            context={context}
            cellSize={cellSize}
            gap={gridGap}
            depthInterpolation={waterDepthInterpolation}
          />
          <BeachCanvasOverlay view={view} context={context} cellSize={cellSize} gap={gridGap} />
          <GrassCanvasOverlay view={view} context={context} cellSize={cellSize} gap={gridGap} />
          <CliffCanvasOverlay view={view} context={context} cellSize={cellSize} gap={gridGap} />
          <TerrainBorderOverlay
            view={view}
            context={context}
            cellSize={cellSize}
            gap={gridGap}
            cellGridOpacity={cellGridOpacity}
          />
          <BridgeCanvasOverlay view={view} context={context} cellSize={cellSize} gap={gridGap} />
          {level.objects.length > 0 ? (
            <ObjectCanvasOverlay
              objects={level.objects}
              rows={level.rows}
              cols={level.cols}
              cellSize={cellSize}
              gap={gridGap}
            />
          ) : null}
          {level.routes.length > 0 ? (
            <RouteShipOverlay
              routes={level.routes}
              rows={level.rows}
              cols={level.cols}
              cellSize={cellSize}
              gap={gridGap}
            />
          ) : null}
          {draftRoute && draftRoute.path.length > 0 ? (
            <RouteCanvasOverlay
              routes={emptyRoutes}
              draftRoute={draftRoute}
              rows={level.rows}
              cols={level.cols}
              cellSize={cellSize}
              gap={gridGap}
            />
          ) : null}
          {Array.from({ length: level.rows }, (_, row) =>
            Array.from({ length: level.cols }, (_, col) => (
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
          {showMission ? (
            <MissionMarkerOverlay
              mission={level.mission}
              rows={level.rows}
              cols={level.cols}
              cellSize={cellSize}
              gap={gridGap}
            />
          ) : null}
          <PathLineOverlay
            paths={pathLines}
            rows={level.rows}
            cols={level.cols}
            cellSize={cellSize}
            gap={gridGap}
          />
        </div>
      </div>
    </div>
  );
}
