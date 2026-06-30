import { hashStringToSeed } from "@/lib/game/seed";
import type { PuzzleGrid } from "@/lib/game/types";

const FINGERPRINT_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyz";

function toBase36Padded(value: number, length: number): string {
  let out = value.toString(36);
  while (out.length < length) {
    out = `0${out}`;
  }
  return out.slice(-length);
}

/** Stable short id derived from grid layout, tile kinds, and X/Y/Z positions. */
export function puzzleFingerprint(grid: PuzzleGrid): string {
  const parts: string[] = [
    `${grid.rows}x${grid.cols}`,
    `${grid.start.row},${grid.start.col}`,
    `${grid.waypoint.row},${grid.waypoint.col}`,
    `${grid.goal.row},${grid.goal.col}`,
  ];

  for (const cell of grid.cells) {
    parts.push(`${cell.kind}:${cell.role}:${cell.componentId}`);
  }

  const hash = hashStringToSeed(parts.join("|"));
  return toBase36Padded(hash, 7);
}

export function defaultIslandName(savedAt: Date): string {
  return `Island ${savedAt.toISOString().slice(0, 10)}`;
}

export function islandIdFromFingerprint(fingerprint: string, savedAt: Date): string {
  const date = savedAt.toISOString().slice(0, 10);
  return `island-${date}-${fingerprint}`;
}
