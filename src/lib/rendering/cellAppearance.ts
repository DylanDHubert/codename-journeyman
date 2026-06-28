import { componentColor } from "@/lib/game/generation";
import {
  buildTerrainMaps,
  maxWaterDistance,
  waterDepthAt,
} from "@/lib/game/terrain";
import { bridgePlacementCost, isLandKind } from "@/lib/game/tiles";
import type { Puzzle, TileKind } from "@/lib/game/types";
import type { CellAppearance, OverlayKind } from "./types";

const SHALLOW_WATER = { r: 72, g: 176, b: 210 };
const DEEP_WATER = { r: 12, g: 48, b: 92 };
const MARSH_GREEN = { r: 58, g: 130, b: 98 };
const WHIRLPOOL = { r: 36, g: 24, b: 72 };
const INTERIOR_LAND = { r: 88, g: 156, b: 72 };
const BEACH_SAND = { r: 232, g: 210, b: 148 };
const CLIFF_STONE = { r: 110, g: 98, b: 86 };
const BRIDGE_WOOD = "rgb(168 118 62)";
const PATH_GLOW = { r: 255, g: 244, b: 180 };

function mixColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const blue = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r} ${g} ${blue})`;
}

function tileBaseColor(
  kind: TileKind,
  depth: number,
  isBeach: boolean,
): string {
  switch (kind) {
    case "grass":
      return mixColor(INTERIOR_LAND, { r: 64, g: 130, b: 58 }, 0.35);
    case "beach":
      return mixColor(BEACH_SAND, INTERIOR_LAND, 0.15);
    case "cliff":
      return mixColor(CLIFF_STONE, { r: 72, g: 64, b: 56 }, 0.4);
    case "marsh":
      return mixColor(MARSH_GREEN, SHALLOW_WATER, 0.35);
    case "whirlpool":
      return mixColor(WHIRLPOOL, DEEP_WATER, 0.25);
    case "ocean":
    default:
      return mixColor(SHALLOW_WATER, DEEP_WATER, depth);
  }
}

export type AppearanceContext = {
  puzzle: Puzzle;
  bridges: Set<string>;
  pathKeys: Set<string>;
  showComponents: boolean;
  terrainMaps: ReturnType<typeof buildTerrainMaps>;
  maxDepth: number;
};

export function createAppearanceContext(
  puzzle: Puzzle,
  bridges: Set<string>,
  pathKeys: Set<string>,
  showComponents: boolean,
): AppearanceContext {
  const terrainMaps = buildTerrainMaps(puzzle);
  const maxDepth = maxWaterDistance(terrainMaps);

  return {
    puzzle,
    bridges,
    pathKeys,
    showComponents,
    terrainMaps,
    maxDepth,
  };
}

export function appearanceForCell(
  row: number,
  col: number,
  context: AppearanceContext,
  overlayOverride?: OverlayKind,
): CellAppearance {
  const { puzzle, bridges, pathKeys, showComponents, terrainMaps, maxDepth } =
    context;
  const index = row * puzzle.cols + col;
  const cell = puzzle.cells[index]!;
  const key = `${row},${col}`;
  const hasBridge = bridges.has(key);
  const onPath = pathKeys.has(key);

  let overlay: OverlayKind = overlayOverride ?? "none";
  if (overlay === "none") {
    if (cell.role === "start") {
      overlay = "start";
    } else if (cell.role === "waypoint") {
      overlay = "waypoint";
    } else if (cell.role === "goal") {
      overlay = "goal";
    } else if (hasBridge) {
      overlay = "bridge";
    } else if (onPath) {
      overlay = "path";
    }
  }

  let backgroundColor = "#000";

  if (hasBridge) {
    backgroundColor = BRIDGE_WOOD;
  } else {
    const distance = terrainMaps.distanceFromLand[row]![col]!;
    const depth = waterDepthAt(distance, maxDepth);
    backgroundColor = tileBaseColor(cell.kind, depth, terrainMaps.isBeach[row]![col]!);
  }

  const componentTint =
    showComponents && isLandKind(cell.kind) && cell.componentId >= 0
      ? `${componentColor(cell.componentId)}33`
      : undefined;

  let shimmer: string | undefined;
  if (cell.kind === "whirlpool" && !hasBridge) {
    shimmer =
      "radial-gradient(circle at 50% 50%, rgb(180 140 255 / 0.18), transparent 65%)";
  } else if (cell.kind === "marsh" && !hasBridge) {
    shimmer =
      "linear-gradient(160deg, rgb(255 255 255 / 0.07), transparent 50%)";
  } else if (cell.kind === "ocean" && !hasBridge) {
    shimmer =
      "radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.08), transparent 55%)";
  } else if (cell.kind === "beach") {
    shimmer =
      "linear-gradient(145deg, rgb(255 255 255 / 0.12), transparent 45%)";
  } else if (cell.kind === "cliff") {
    shimmer = "linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 40%)";
  }

  const bridgeCostLabel =
    !hasBridge && (cell.kind === "marsh" || cell.kind === "ocean")
      ? bridgePlacementCost(puzzle, row, col)
      : undefined;

  return {
    backgroundColor,
    shimmer,
    overlay,
    componentTint,
    bridgeCostLabel,
    // FUTURE: MAP kind + DEPTH TO SPRITE FRAMES
  };
}

export function overlayAccent(overlay: OverlayKind): string | undefined {
  switch (overlay) {
    case "start":
      return "#38bdf8";
    case "waypoint":
      return "#a78bfa";
    case "goal":
      return "#fbbf24";
    case "bridge":
      return "#92400e";
    case "path":
      return mixColor(PATH_GLOW, { r: 255, g: 255, b: 255 }, 0.2);
    default:
      return undefined;
  }
}

export function overlayLabel(overlay: OverlayKind): string | null {
  switch (overlay) {
    case "start":
      return "X";
    case "waypoint":
      return "Y";
    case "goal":
      return "Z";
    default:
      return null;
  }
}

export function isMarkerOverlay(overlay: OverlayKind): boolean {
  return overlay === "start" || overlay === "waypoint" || overlay === "goal";
}
