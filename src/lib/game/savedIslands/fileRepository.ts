import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  defaultIslandName,
  islandIdFromFingerprint,
  puzzleFingerprint,
} from "./fingerprint";
import type { SavedIslandsRepository } from "./repository";
import { gridToPuzzle, puzzleToGrid, recordToSummary } from "./serialize";
import type {
  SaveIslandInput,
  SavedIslandRecord,
  SavedIslandSummary,
  SavedIslandsManifest,
} from "./types";
import { SAVED_ISLAND_FORMAT_VERSION } from "./types";
import { validateManifest, validateSavedIslandRecord } from "./validate";

const DATA_DIR = path.join(process.cwd(), "data", "saved-islands");
const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

function islandFilePath(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readManifest(): Promise<SavedIslandsManifest> {
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    return validateManifest(JSON.parse(raw));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { version: SAVED_ISLAND_FORMAT_VERSION, islands: [] };
    }

    if (error instanceof SyntaxError) {
      throw new Error("Saved islands manifest is not valid JSON");
    }

    throw error;
  }
}

async function writeManifest(manifest: SavedIslandsManifest): Promise<void> {
  await ensureDataDir();
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function readRecordFile(id: string): Promise<SavedIslandRecord | null> {
  try {
    const raw = await readFile(islandFilePath(id), "utf8");
    return validateSavedIslandRecord(JSON.parse(raw));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

async function writeRecordFile(record: SavedIslandRecord): Promise<void> {
  await ensureDataDir();
  await writeFile(
    islandFilePath(record.id),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );
}

function sortSummariesNewestFirst(
  islands: SavedIslandSummary[],
): SavedIslandSummary[] {
  return [...islands].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

export class FileSavedIslandsRepository implements SavedIslandsRepository {
  async list(): Promise<SavedIslandSummary[]> {
    const manifest = await readManifest();
    return sortSummariesNewestFirst(manifest.islands);
  }

  async getById(id: string): Promise<SavedIslandRecord | null> {
    return readRecordFile(id);
  }

  async findByFingerprint(fingerprint: string): Promise<SavedIslandRecord | null> {
    const manifest = await readManifest();
    const summary = manifest.islands.find(
      (island) => island.fingerprint === fingerprint,
    );

    if (!summary) {
      return null;
    }

    return readRecordFile(summary.id);
  }

  async save(input: SaveIslandInput): Promise<SavedIslandRecord> {
    const grid = puzzleToGrid(input.puzzle);
    const fingerprint = puzzleFingerprint(grid);
    const existing = await this.findByFingerprint(fingerprint);

    if (existing) {
      return existing;
    }

    const savedAt = new Date();
    const record: SavedIslandRecord = {
      version: SAVED_ISLAND_FORMAT_VERSION,
      id: islandIdFromFingerprint(fingerprint, savedAt),
      name: input.name?.trim() || defaultIslandName(savedAt),
      savedAt: savedAt.toISOString(),
      fingerprint,
      sourceSeed: input.sourceSeed,
      parCost: input.puzzle.parCost,
      puzzle: grid,
    };

    await writeRecordFile(record);

    const manifest = await readManifest();
    const summary = recordToSummary(record);
    const nextIslands = manifest.islands.filter(
      (island) => island.id !== record.id,
    );
    nextIslands.push(summary);
    await writeManifest({
      version: SAVED_ISLAND_FORMAT_VERSION,
      islands: sortSummariesNewestFirst(nextIslands),
    });

    return record;
  }

  async delete(id: string): Promise<boolean> {
    const record = await readRecordFile(id);
    if (!record) {
      return false;
    }

    await unlink(islandFilePath(id));

    const manifest = await readManifest();
    const nextIslands = manifest.islands.filter((island) => island.id !== id);
    await writeManifest({
      version: SAVED_ISLAND_FORMAT_VERSION,
      islands: nextIslands,
    });

    return true;
  }
}

let repositorySingleton: FileSavedIslandsRepository | null = null;

export function getSavedIslandsRepository(): FileSavedIslandsRepository {
  if (!repositorySingleton) {
    repositorySingleton = new FileSavedIslandsRepository();
  }
  return repositorySingleton;
}

export async function loadSavedIslandPuzzle(
  id: string,
): Promise<{ record: SavedIslandRecord; puzzle: ReturnType<typeof gridToPuzzle> } | null> {
  const record = await getSavedIslandsRepository().getById(id);
  if (!record) {
    return null;
  }

  return {
    record,
    puzzle: gridToPuzzle(record.puzzle, record.parCost),
  };
}
