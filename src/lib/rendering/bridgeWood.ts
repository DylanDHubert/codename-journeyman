import { createNoise2D } from "simplex-noise";

import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import type { Puzzle } from "@/lib/game/types";

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

function deckSamplePoint(
  col: number,
  row: number,
  subCol: number,
  subRow: number,
): { x: number; y: number } {
  const x = (col + (subCol + 0.5) / BRIDGE_SUBCELLS) * GRAIN_SCALE;
  const y = (row + (subRow + 0.5) / BRIDGE_SUBCELLS) * GRAIN_SCALE * 0.55;
  return { x, y };
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

export function buildBridgeWoodField(puzzle: Puzzle): BridgeWoodField {
  const noise2D = createNoise2D(
    mulberry32(hashStringToSeed(`${puzzle.seed}-bridge-wood`)),
  );

  return {
    sampleDeck(row, col, subRow = 0, subCol = 0) {
      const { x, y } = deckSamplePoint(col, row, subCol, subRow);
      const noise = sampleDeckNoise(noise2D, x, y);
      const delta = (noise - 0.5) * 2;

      if (delta >= 0) {
        return mixRgb(WOOD_BASE, WOOD_HIGHLIGHT, delta * 0.55);
      }

      return mixRgb(WOOD_BASE, WOOD_SHADOW, -delta * 0.65);
    },
  };
}

export type PylonCorner = {
  x: number;
  y: number;
};

function hasBridge(bridges: Set<string>, row: number, col: number): boolean {
  return bridges.has(`${row},${col}`);
}

/** CORNER POSTS — SHIFT INTO GAPS WHEN A NEIGHBOR IS ALSO BRIDGE SO POSTS MERGE */
export function collectBridgePylonCorners(
  bridges: Set<string>,
  cellSize: number,
  gap: number,
): PylonCorner[] {
  const corners = new Map<string, PylonCorner>();
  const stride = cellSize + gap;
  const halfGap = gap / 2;

  for (const key of bridges) {
    const [rowText, colText] = key.split(",");
    const row = Number(rowText);
    const col = Number(colText);
    const originX = col * stride;
    const originY = row * stride;

    const points: PylonCorner[] = [
      {
        x: originX - (hasBridge(bridges, row, col - 1) ? halfGap : 0),
        y: originY - (hasBridge(bridges, row - 1, col) ? halfGap : 0),
      },
      {
        x: originX + cellSize + (hasBridge(bridges, row, col + 1) ? halfGap : 0),
        y: originY - (hasBridge(bridges, row - 1, col) ? halfGap : 0),
      },
      {
        x: originX - (hasBridge(bridges, row, col - 1) ? halfGap : 0),
        y: originY + cellSize + (hasBridge(bridges, row + 1, col) ? halfGap : 0),
      },
      {
        x: originX + cellSize + (hasBridge(bridges, row, col + 1) ? halfGap : 0),
        y: originY + cellSize + (hasBridge(bridges, row + 1, col) ? halfGap : 0),
      },
    ];

    for (const point of points) {
      const cornerKey = `${point.x},${point.y}`;
      if (!corners.has(cornerKey)) {
        corners.set(cornerKey, point);
      }
    }
  }

  return [...corners.values()];
}

export function drawBridgePylon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
): void {
  const outerRadius = Math.max(3, Math.round(cellSize * 0.13));
  const lineWidth = Math.max(1, Math.round(outerRadius * 0.16));

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgb(74 44 20)";
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgb(132 86 44)";
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius * 0.78, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgb(186 132 72)";
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius * 0.52, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgb(58 34 14)";
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius * 0.24, 0, Math.PI * 2);
  ctx.fill();

  const ringRadii = [0.92, 0.72, 0.54, 0.36];
  const ringColors = [
    "rgb(48 28 12)",
    "rgb(98 62 30)",
    "rgb(140 94 48)",
    "rgb(72 44 20)",
  ];

  for (let i = 0; i < ringRadii.length; i += 1) {
    ctx.strokeStyle = ringColors[i]!;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius * ringRadii[i]!, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
