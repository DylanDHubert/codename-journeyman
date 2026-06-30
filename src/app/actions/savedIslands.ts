"use server";

import {
  getSavedIslandsRepository,
  loadSavedIslandPuzzle,
} from "@/lib/game/savedIslands/fileRepository";
import { puzzleFingerprint } from "@/lib/game/savedIslands/fingerprint";
import {
  gridToPuzzle,
  puzzleToGrid,
  recordToSummary,
} from "@/lib/game/savedIslands/serialize";
import type {
  SavedIslandRecord,
  SavedIslandSummary,
} from "@/lib/game/savedIslands/types";
import type { Puzzle } from "@/lib/game/types";

export type SaveIslandResult =
  | { ok: true; record: SavedIslandSummary; alreadySaved: boolean }
  | { ok: false; error: string };

export type LoadSavedIslandResult =
  | { ok: true; record: SavedIslandRecord; puzzle: Puzzle }
  | { ok: false; error: string };

export async function listSavedIslandsAction(): Promise<SavedIslandSummary[]> {
  return getSavedIslandsRepository().list();
}

export async function saveIslandAction(
  puzzle: Puzzle,
  sourceSeed: string,
  name?: string,
): Promise<SaveIslandResult> {
  try {
    const repo = getSavedIslandsRepository();
    const fingerprint = puzzleFingerprint(puzzleToGrid(puzzle));
    const existing = await repo.findByFingerprint(fingerprint);

    if (existing) {
      return {
        ok: true,
        record: recordToSummary(existing),
        alreadySaved: true,
      };
    }

    const record = await repo.save({ puzzle, sourceSeed, name });

    return {
      ok: true,
      record: recordToSummary(record),
      alreadySaved: false,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save island",
    };
  }
}

export async function loadSavedIslandAction(
  id: string,
): Promise<LoadSavedIslandResult> {
  try {
    const loaded = await loadSavedIslandPuzzle(id);
    if (!loaded) {
      return { ok: false, error: "Saved island not found" };
    }

    return {
      ok: true,
      record: loaded.record,
      puzzle: loaded.puzzle,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to load island",
    };
  }
}

export async function deleteSavedIslandAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const deleted = await getSavedIslandsRepository().delete(id);
    if (!deleted) {
      return { ok: false, error: "Saved island not found" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete island",
    };
  }
}
