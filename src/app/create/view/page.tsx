import { redirect } from "next/navigation";

import { DraftPuzzleView } from "@/components/create/DraftPuzzleView";
import {
  createConfigFromSearchParams,
  DEFAULT_CREATE_CONFIG,
  normalizeCreateConfig,
} from "@/lib/game/createConfig";
import { generateDraftPuzzle } from "@/lib/game/generationDraft";

type CreateViewPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function CreateViewPage({ searchParams }: CreateViewPageProps) {
  const params = await searchParams;
  const seed = params.seed?.trim();

  if (!seed) {
    redirect("/create");
  }

  const config = normalizeCreateConfig(
    createConfigFromSearchParams(params) ?? DEFAULT_CREATE_CONFIG,
  );
  const puzzle = generateDraftPuzzle({ seed, config });

  return (
    <main className="h-dvh overflow-hidden bg-ocean-gradient">
      <DraftPuzzleView puzzle={puzzle} />
    </main>
  );
}
