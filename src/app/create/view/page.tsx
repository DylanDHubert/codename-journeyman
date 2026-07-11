import { redirect } from "next/navigation";

import { DraftPuzzleView } from "@/components/create/DraftPuzzleView";
import {
  createConfigFromSearchParams,
  DEFAULT_CREATE_CONFIG,
  normalizeCreateConfig,
} from "@/lib/game/createConfig";
import { generateLevel } from "@/lib/game/level/generateLevel";

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
  const level = generateLevel({ seed, config });

  return (
    <main className="h-dvh overflow-hidden bg-ocean-gradient">
      <DraftPuzzleView level={level} />
    </main>
  );
}
