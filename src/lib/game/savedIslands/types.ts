import type { Puzzle, PuzzleGrid } from "@/lib/game/types";

export const SAVED_ISLAND_FORMAT_VERSION = 1;

/** Summary row stored in manifest.json and returned by list(). */
export type SavedIslandSummary = {
  id: string;
  name: string;
  savedAt: string;
  fingerprint: string;
  sourceSeed: string;
  parCost: number;
  rows: number;
  cols: number;
};

/** Full persisted record — puzzle grid only (no bridges). */
export type SavedIslandRecord = {
  version: typeof SAVED_ISLAND_FORMAT_VERSION;
  id: string;
  name: string;
  savedAt: string;
  fingerprint: string;
  sourceSeed: string;
  parCost: number;
  puzzle: PuzzleGrid;
};

export type SaveIslandInput = {
  puzzle: Puzzle;
  sourceSeed: string;
  name?: string;
};

export type SavedIslandsManifest = {
  version: typeof SAVED_ISLAND_FORMAT_VERSION;
  islands: SavedIslandSummary[];
};
