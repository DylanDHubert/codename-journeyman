import type { Puzzle } from "@/lib/game/types";

import type { SaveIslandInput, SavedIslandRecord, SavedIslandSummary } from "./types";

/**
 * Storage boundary for saved islands.
 * File-backed today; swap in a database implementation later without touching UI or actions.
 */
export interface SavedIslandsRepository {
  list(): Promise<SavedIslandSummary[]>;
  getById(id: string): Promise<SavedIslandRecord | null>;
  findByFingerprint(fingerprint: string): Promise<SavedIslandRecord | null>;
  save(input: SaveIslandInput): Promise<SavedIslandRecord>;
  delete(id: string): Promise<boolean>;
}

export type LoadedSavedIsland = {
  record: SavedIslandRecord;
  puzzle: Puzzle;
};
