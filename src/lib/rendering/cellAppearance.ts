import { componentColor } from "@/lib/game/generation";
import {
  buildTerrainMaps,
  maxWaterDistance,
  waterDepthAt,
} from "@/lib/game/terrain";
import { bridgePlacementCost, isLandKind } from "@/lib/game/tiles";
import type { Puzzle, TileKind } from "@/lib/game/types";
import type { CellAppearance, OverlayKind } from "./types";
import {
  buildBridgeWoodField,
  type BridgeWoodField,
} from "./bridgeWood";
import {
  buildMarshSplotchField,
  type MarshSplotchField,
} from "./waterFeatures";
import {
  buildWaterNoiseField,
  type WaterNoiseField,
} from "./waterNoise";

const SHALLOW_WATER = { r: 72, g: 176, b: 210 };
const DEEP_WATER = { r: 12, g: 48, b: 92 };
/** TURQUOISE-GREEN TINT FOR MARSH — BLENDED ON TOP OF OCEAN DEPTH */
const MARSH_TURQUOISE = { r: 30, g: 188, b: 152 };
const MARSH_GREEN_PUSH = { r: 46, g: 156, b: 88 };
/** EXTRA SHADE FOR WHIRLPOOL — DARKER OCEAN */
const WHIRLPOOL_SHADE = { r: 4, g: 24, b: 58 };
const INTERIOR_LAND = { r: 88, g: 156, b: 72 };
const BEACH_SAND = { r: 232, g: 210, b: 148 };
const CLIFF_STONE = { r: 110, g: 98, b: 86 };
const PATH_GLOW = { r: 255, g: 244, b: 180 };

function mixColorRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function mixColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): string {
  const mixed = mixColorRgb(a, b, t);
  return `rgb(${mixed.r} ${mixed.g} ${mixed.b})`;
}

function oceanWaterRgb(depth: number): { r: number; g: number; b: number } {
  return mixColorRgb(SHALLOW_WATER, DEEP_WATER, depth);
}

function tileBaseRgb(
  kind: TileKind,
  depth: number,
): { r: number; g: number; b: number } {
  switch (kind) {
    case "grass":
      return mixColorRgb(INTERIOR_LAND, { r: 64, g: 130, b: 58 }, 0.35);
    case "beach":
      return mixColorRgb(BEACH_SAND, INTERIOR_LAND, 0.15);
    case "cliff":
      return mixColorRgb(CLIFF_STONE, { r: 72, g: 64, b: 56 }, 0.4);
    case "marsh":
      return mixColorRgb(
        mixColorRgb(oceanWaterRgb(depth), MARSH_TURQUOISE, 0.52),
        MARSH_GREEN_PUSH,
        0.2,
      );
    case "whirlpool":
      return mixColorRgb(
        oceanWaterRgb(Math.min(1, depth + 0.2)),
        WHIRLPOOL_SHADE,
        0.5,
      );
    case "ocean":
    default:
      return oceanWaterRgb(depth);
  }
}

function tileBaseColor(
  kind: TileKind,
  depth: number,
): string {
  const rgb = tileBaseRgb(kind, depth);
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
}

function isAnimatedWaterKind(kind: TileKind): boolean {
  return kind === "ocean" || kind === "marsh" || kind === "whirlpool";
}

export function waterBaseForCell(
  row: number,
  col: number,
  context: AppearanceContext,
): { rgb: { r: number; g: number; b: number }; kind: TileKind } | null {
  const { puzzle, terrainMaps, maxDepth } = context;
  const cell = puzzle.cells[row * puzzle.cols + col]!;

  if (!isAnimatedWaterKind(cell.kind)) {
    return null;
  }

  const distance = terrainMaps.distanceFromLand[row]![col]!;
  const depth = waterDepthAt(distance, maxDepth);

  return {
    rgb: tileBaseRgb(cell.kind, depth),
    kind: cell.kind,
  };
}

export type AppearanceContext = {
  puzzle: Puzzle;
  bridges: Set<string>;
  pathKeys: Set<string>;
  showComponents: boolean;
  terrainMaps: ReturnType<typeof buildTerrainMaps>;
  maxDepth: number;
  waterNoise: WaterNoiseField;
  marshSplotch: MarshSplotchField;
  bridgeWood: BridgeWoodField;
};

export function createAppearanceContext(
  puzzle: Puzzle,
  bridges: Set<string>,
  pathKeys: Set<string>,
  showComponents: boolean,
): AppearanceContext {
  const terrainMaps = buildTerrainMaps(puzzle);
  const maxDepth = maxWaterDistance(terrainMaps);
  const waterNoise = buildWaterNoiseField(puzzle);
  const marshSplotch = buildMarshSplotchField(puzzle);
  const bridgeWood = buildBridgeWoodField(puzzle);

  return {
    puzzle,
    bridges,
    pathKeys,
    showComponents,
    terrainMaps,
    maxDepth,
    waterNoise,
    marshSplotch,
    bridgeWood,
  };
}

export function appearanceForCell(
  row: number,
  col: number,
  context: AppearanceContext,
  overlayOverride?: OverlayKind,
): CellAppearance {
  const {
    puzzle,
    bridges,
    pathKeys,
    showComponents,
    terrainMaps,
    maxDepth,
  } = context;
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
    // DRAWN BY BridgeCanvasOverlay — KEEP CELL TRANSPARENT FOR OVERLAYS
    backgroundColor = "transparent";
  } else {
    const distance = terrainMaps.distanceFromLand[row]![col]!;
    const depth = waterDepthAt(distance, maxDepth);

    if (isAnimatedWaterKind(cell.kind)) {
      // DRAWN BY WaterCanvasOverlay — KEEP CELL TRANSPARENT FOR SHIMMER/OVERLAYS
      backgroundColor = "transparent";
    } else {
      backgroundColor = tileBaseColor(cell.kind, depth);
    }
  }

  const componentTint =
    showComponents && isLandKind(cell.kind) && cell.componentId >= 0
      ? `${componentColor(cell.componentId)}33`
      : undefined;

  let shimmer: string | undefined;
  if (cell.kind === "beach") {
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
