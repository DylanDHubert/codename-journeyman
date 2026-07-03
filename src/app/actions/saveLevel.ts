"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { LevelFile } from "@/lib/game/level/types";

export type SaveLevelResult = {
  ok: boolean;
  path?: string;
  error?: string;
};

const LEVELS_DIR = path.join(process.cwd(), "public", "levels");

// SLUG SAFE FOR A FILENAME
function safeFileId(id: string): string {
  const slug = id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return slug.replace(/^-+|-+$/g, "") || "level";
}

export async function saveLevelAction(file: LevelFile): Promise<SaveLevelResult> {
  try {
    const fileId = safeFileId(file.id);
    await mkdir(LEVELS_DIR, { recursive: true });

    const target = path.join(LEVELS_DIR, `${fileId}.json`);
    await writeFile(target, `${JSON.stringify(file, null, 2)}\n`, "utf8");

    const publicPath = `/levels/${fileId}.json`;
    console.log("[journeyman:levels] saved level", {
      id: file.id,
      objects: file.objects.length,
      routes: file.routes.length,
      path: publicPath,
    });

    return { ok: true, path: publicPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[journeyman:levels] save failed", { id: file.id, error: message });
    return { ok: false, error: message };
  }
}
