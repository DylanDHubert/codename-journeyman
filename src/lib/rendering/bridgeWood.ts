import { createNoise2D } from "simplex-noise";

import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { terrainKindAt } from "@/lib/rendering/terrainView";

export const BRIDGE_SUBCELLS = 4;

const GRAIN_SCALE = 0.42;

const WOOD_BASE = { r: 168, g: 118, b: 62 };
const WOOD_HIGHLIGHT = { r: 206, g: 158, b: 96 };
const WOOD_SHADOW = { r: 108, g: 68, b: 34 };

export type BridgeWoodField = {
  sampleDeck: (
    row: number,
    col: number,
    subRow?: number,
    subCol?: number,
  ) => { r: number; g: number; b: number };
  sampleDeckFrac: (
    row: number,
    col: number,
    fracRow: number,
    fracCol: number,
  ) => { r: number; g: number; b: number };
};

function normalizeNoise(value: number): number {
  return (value + 1) * 0.5;
}

function mixRgb(
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

function sampleDeckNoise(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
): number {
  const plank = normalizeNoise(noise2D(x * 2.8, y * 0.35));
  const plankBand = Math.floor(plank * 5) / 4;
  const grain = normalizeNoise(noise2D(x * 6.4 + 17, y * 1.8 + 4));
  const knot = normalizeNoise(noise2D(x * 0.9 + 40, y * 0.9 + 12));

  return plankBand * 0.52 + grain * 0.33 + knot * 0.15;
}

function deckRgbFromNoise(
  noise2D: (x: number, y: number) => number,
  col: number,
  row: number,
  fracCol: number,
  fracRow: number,
): { r: number; g: number; b: number } {
  const x = (col + fracCol) * GRAIN_SCALE;
  const y = (row + fracRow) * GRAIN_SCALE * 0.55;
  const noise = sampleDeckNoise(noise2D, x, y);
  const delta = (noise - 0.5) * 2;

  if (delta >= 0) {
    return mixRgb(WOOD_BASE, WOOD_HIGHLIGHT, delta * 0.55);
  }

  return mixRgb(WOOD_BASE, WOOD_SHADOW, -delta * 0.65);
}

export function buildBridgeWoodField(puzzle: TerrainView): BridgeWoodField {
  const noise2D = createNoise2D(
    mulberry32(hashStringToSeed(`${puzzle.seed}-bridge-wood`)),
  );

  return {
    sampleDeck(row, col, subRow = 0, subCol = 0) {
      const fracCol = (subCol + 0.5) / BRIDGE_SUBCELLS;
      const fracRow = (subRow + 0.5) / BRIDGE_SUBCELLS;
      return deckRgbFromNoise(noise2D, col, row, fracCol, fracRow);
    },
    sampleDeckFrac(row, col, fracRow, fracCol) {
      return deckRgbFromNoise(noise2D, col, row, fracCol, fracRow);
    },
  };
}

export type PylonCorner = {
  x: number;
  y: number;
  iron: boolean;
};

function hasBridge(bridges: Set<string>, row: number, col: number): boolean {
  return bridges.has(`${row},${col}`);
}

function isMarshBridgeCell(
  puzzle: TerrainView,
  bridges: Set<string>,
  row: number,
  col: number,
): boolean {
  if (!hasBridge(bridges, row, col)) {
    return false;
  }

  if (row < 0 || col < 0 || row >= puzzle.rows || col >= puzzle.cols) {
    return false;
  }

  return terrainKindAt(puzzle, row, col) === "marsh";
}

function vertexAxisPosition(
  index: number,
  stride: number,
  gap: number,
  hasWest: boolean,
  hasEast: boolean,
): number {
  if (index === 0) {
    return 0;
  }

  if (hasWest && hasEast) {
    return index * stride - gap / 2;
  }

  if (hasWest) {
    return index * stride - gap;
  }

  return index * stride;
}

/** GRID VERTICES — CENTER IN GAPS WHEN BRIDGES MEET ON BOTH SIDES OF EACH AXIS */
export function collectBridgePylonCorners(
  puzzle: TerrainView,
  bridges: Set<string>,
  cellSize: number,
  gap: number,
): PylonCorner[] {
  const corners: PylonCorner[] = [];
  const stride = cellSize + gap;
  const { rows, cols } = puzzle;

  for (let vRow = 0; vRow <= rows; vRow += 1) {
    for (let vCol = 0; vCol <= cols; vCol += 1) {
      const nw = hasBridge(bridges, vRow - 1, vCol - 1);
      const ne = hasBridge(bridges, vRow - 1, vCol);
      const sw = hasBridge(bridges, vRow, vCol - 1);
      const se = hasBridge(bridges, vRow, vCol);

      if (!nw && !ne && !sw && !se) {
        continue;
      }

      const westBridge = nw || sw;
      const eastBridge = ne || se;
      const northBridge = nw || ne;
      const southBridge = sw || se;

      const x = vertexAxisPosition(vCol, stride, gap, westBridge, eastBridge);
      const y = vertexAxisPosition(vRow, stride, gap, northBridge, southBridge);
      const iron =
        isMarshBridgeCell(puzzle, bridges, vRow - 1, vCol - 1) ||
        isMarshBridgeCell(puzzle, bridges, vRow - 1, vCol) ||
        isMarshBridgeCell(puzzle, bridges, vRow, vCol - 1) ||
        isMarshBridgeCell(puzzle, bridges, vRow, vCol);

      corners.push({ x, y, iron });
    }
  }

  return corners;
}

function drawBridgeWoodRect(
  ctx: CanvasRenderingContext2D,
  bridgeWood: BridgeWoodField,
  row: number,
  col: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cellSize: number,
  fracRowStart: number,
  fracColStart: number,
  fracRowSpan: number,
  fracColSpan: number,
): void {
  const subSize = Math.max(1, Math.floor(cellSize / BRIDGE_SUBCELLS));

  for (let py = 0; py < height; py += subSize) {
    for (let px = 0; px < width; px += subSize) {
      const fracRow = fracRowStart + ((py + subSize * 0.5) / cellSize) * fracRowSpan;
      const fracCol = fracColStart + ((px + subSize * 0.5) / cellSize) * fracColSpan;
      const { r, g, b } = bridgeWood.sampleDeckFrac(row, col, fracRow, fracCol);

      ctx.fillStyle = `rgb(${r} ${g} ${b})`;
      ctx.fillRect(
        x + px,
        y + py,
        Math.min(subSize, width - px),
        Math.min(subSize, height - py),
      );
    }
  }
}

/** FILL GRID GAPS WITH DECK WOOD WHEN TWO BRIDGE CELLS SHARE AN EDGE */
export function drawBridgeGapConnections(
  ctx: CanvasRenderingContext2D,
  puzzle: TerrainView,
  bridges: Set<string>,
  bridgeWood: BridgeWoodField,
  cellSize: number,
  gap: number,
): void {
  if (gap <= 0) {
    return;
  }

  const stride = cellSize + gap;
  const { rows, cols } = puzzle;

  for (const key of bridges) {
    const [rowText, colText] = key.split(",");
    const row = Number(rowText);
    const col = Number(colText);

    if (row < 0 || col < 0 || row >= rows || col >= cols) {
      continue;
    }

    const originX = col * stride;
    const originY = row * stride;

      if (hasBridge(bridges, row, col + 1)) {
      drawBridgeWoodRect(
        ctx,
        bridgeWood,
        row,
        col,
        originX + cellSize,
        originY,
        gap,
        cellSize,
        cellSize,
        0,
        1,
        1,
        1,
      );
    }

    if (hasBridge(bridges, row + 1, col)) {
      drawBridgeWoodRect(
        ctx,
        bridgeWood,
        row,
        col,
        originX,
        originY + cellSize,
        cellSize,
        gap,
        cellSize,
        1,
        0,
        1,
        1,
      );
    }
  }

  for (let vRow = 1; vRow <= rows; vRow += 1) {
    for (let vCol = 1; vCol <= cols; vCol += 1) {
      const nw = hasBridge(bridges, vRow - 1, vCol - 1);
      const ne = hasBridge(bridges, vRow - 1, vCol);
      const sw = hasBridge(bridges, vRow, vCol - 1);
      const se = hasBridge(bridges, vRow, vCol);

      const westBridge = nw || sw;
      const eastBridge = ne || se;
      const northBridge = nw || ne;
      const southBridge = sw || se;

      if (!westBridge || !eastBridge || !northBridge || !southBridge) {
        continue;
      }

      const anchorRow = nw
        ? vRow - 1
        : ne
          ? vRow - 1
          : sw
            ? vRow
            : vRow;
      const anchorCol = nw
        ? vCol - 1
        : ne
          ? vCol
          : sw
            ? vCol - 1
            : vCol;

      drawBridgeWoodRect(
        ctx,
        bridgeWood,
        anchorRow,
        anchorCol,
        vCol * stride - gap,
        vRow * stride - gap,
        gap,
        gap,
        cellSize,
        1,
        1,
        1,
        1,
      );
    }
  }
}

function fillPylonSquare(
  ctx: CanvasRenderingContext2D,
  halfSize: number,
): void {
  const size = Math.round(halfSize * 2);
  const origin = -Math.round(halfSize);
  ctx.fillRect(origin, origin, size, size);
}

function strokePylonSquare(
  ctx: CanvasRenderingContext2D,
  halfSize: number,
): void {
  const size = Math.round(halfSize * 2);
  const origin = -Math.round(halfSize);
  ctx.strokeRect(origin, origin, size, size);
}

type PylonLayer = {
  fill?: string;
  ring?: string;
  scale: number;
};

function drawLayeredPylonSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerHalf: number,
  layers: PylonLayer[],
  lineWidth: number,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  for (const layer of layers) {
    if (layer.fill) {
      ctx.fillStyle = layer.fill;
      fillPylonSquare(ctx, outerHalf * layer.scale);
    }
  }

  for (const layer of layers) {
    if (layer.ring) {
      ctx.strokeStyle = layer.ring;
      ctx.lineWidth = lineWidth;
      strokePylonSquare(ctx, outerHalf * layer.scale);
    }
  }

  ctx.restore();
}

const WOOD_PYLON_LAYERS: PylonLayer[] = [
  { fill: "rgb(74 44 20)", scale: 1 },
  { fill: "rgb(132 86 44)", scale: 0.78 },
  { fill: "rgb(186 132 72)", scale: 0.52 },
  { fill: "rgb(58 34 14)", scale: 0.24 },
  { ring: "rgb(48 28 12)", scale: 0.92 },
  { ring: "rgb(98 62 30)", scale: 0.72 },
  { ring: "rgb(140 94 48)", scale: 0.54 },
  { ring: "rgb(72 44 20)", scale: 0.36 },
];

export function drawBridgePylon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  iron = false,
): void {
  const outerHalf = Math.max(6, Math.round(cellSize * 0.26));

  if (iron) {
    drawIronBridgePylon(ctx, x, y, outerHalf);
    return;
  }

  const lineWidth = Math.max(1, Math.round(outerHalf * 0.16));
  drawLayeredPylonSquare(ctx, x, y, outerHalf, WOOD_PYLON_LAYERS, lineWidth);
}

const IRON_BASE = { r: 92, g: 94, b: 98 };
const IRON_HIGHLIGHT = { r: 138, g: 140, b: 146 };
const IRON_SHADOW = { r: 54, g: 56, b: 60 };
const IRON_RUST = { r: 78, g: 62, b: 52 };

function ironPylonHash(x: number, y: number, channel: number): number {
  let hash = (Math.round(x) * 374761393 + Math.round(y) * 668265263 + channel * 982451653) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

function sampleIronPylonRgb(localX: number, localY: number, halfSize: number): {
  r: number;
  g: number;
  b: number;
} {
  const streak = ironPylonHash(localX * 3.1, localY * 0.4, 0);
  const pit = ironPylonHash(localX * 5.7 + 11, localY * 5.7 + 7, 1);
  const rust = ironPylonHash(localX * 1.8 + 23, localY * 1.8 + 19, 2);
  const brushed = ironPylonHash(localX * 0.35, localY * 4.2 + localX * 0.15, 3);

  let color = mixRgb(IRON_BASE, IRON_HIGHLIGHT, (brushed - 0.5) * 0.7);
  color = mixRgb(color, IRON_SHADOW, Math.max(0, 0.5 - streak) * 0.55);
  color = mixRgb(color, IRON_SHADOW, Math.max(0, 0.62 - pit) * 0.4);

  if (rust > 0.84) {
    color = mixRgb(color, IRON_RUST, (rust - 0.84) * 3.8);
  }

  const edgeDist = Math.max(Math.abs(localX), Math.abs(localY)) / halfSize;
  if (edgeDist > 0.72) {
    color = mixRgb(color, IRON_SHADOW, (edgeDist - 0.72) * 1.8);
  }

  return color;
}

/** IRON PYLON — PITTED METAL FILL, NO CONCENTRIC RINGS */
function drawIronBridgePylon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerHalf: number,
): void {
  const size = Math.round(outerHalf * 2);
  const origin = -Math.round(outerHalf);
  const subcells = 4;
  const subSize = Math.max(1, Math.floor(size / subcells));

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.beginPath();
  ctx.rect(origin, origin, size, size);
  ctx.clip();

  for (let subRow = 0; subRow < subcells; subRow += 1) {
    for (let subCol = 0; subCol < subcells; subCol += 1) {
      const localX = origin + subCol * subSize + subSize * 0.5;
      const localY = origin + subRow * subSize + subSize * 0.5;
      const { r, g, b } = sampleIronPylonRgb(localX, localY, outerHalf);

      ctx.fillStyle = `rgb(${r} ${g} ${b})`;
      ctx.fillRect(
        origin + subCol * subSize,
        origin + subRow * subSize,
        subCol === subcells - 1 ? size - subCol * subSize : subSize,
        subRow === subcells - 1 ? size - subRow * subSize : subSize,
      );
    }
  }

  ctx.restore();
}

const NAIL_COLORS = [
  "rgb(96 98 102)",
  "rgb(118 120 124)",
  "rgb(78 80 84)",
  "rgb(132 134 138)",
];

function nailHash(seed: number, row: number, col: number, index: number): number {
  let hash = (seed + row * 92837111 + col * 689287499 + index * 283923481) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

/** MARSH DECK NAILS — SAME WOOD DECK, SMALL GREY CIRCLES */
export function drawMarshBridgeNails(
  ctx: CanvasRenderingContext2D,
  puzzle: TerrainView,
  row: number,
  col: number,
  originX: number,
  originY: number,
  cellSize: number,
): void {
  const seed = hashStringToSeed(`${puzzle.seed}-marsh-bridge-nails`);
  const nailCount = 2 + Math.floor(nailHash(seed, row, col, 0) * 2);
  const inset = Math.max(3, Math.round(cellSize * 0.14));
  const maxRadius = Math.max(1, Math.round(cellSize * 0.045));
  const span = Math.max(1, cellSize - inset * 2);

  for (let i = 0; i < nailCount; i += 1) {
    const x = originX + inset + nailHash(seed, row, col, i * 3 + 1) * span;
    const y = originY + inset + nailHash(seed, row, col, i * 3 + 2) * span;
    const radius = Math.max(
      1,
      Math.round(maxRadius * (0.65 + nailHash(seed, row, col, i * 3 + 3) * 0.5)),
    );
    const color =
      NAIL_COLORS[Math.floor(nailHash(seed, row, col, i * 3 + 4) * NAIL_COLORS.length)]!;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
