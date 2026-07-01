import { BridgeGame } from "@/components/game/BridgeGame";
import { configFromSearchParams } from "@/lib/game/generationConfig";
import { DEFAULT_GENERATION_CONFIG, normalizeConfig } from "@/lib/game/generationConfig";
import { dailySeed } from "@/lib/game/seed";

type PlayPageProps = {
  searchParams: Promise<{
    seed?: string;
    rows?: string;
    cols?: string;
    threshold?: string;
    falloff?: string;
    falloffRadius?: string;
  }>;
};

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const params = await searchParams;
  const seed = params.seed ?? dailySeed();
  const initialConfig = normalizeConfig(
    configFromSearchParams(params) ?? DEFAULT_GENERATION_CONFIG,
  );

  return (
    <main className="min-h-full flex-1 bg-ocean-gradient pb-16">
      <BridgeGame seed={seed} initialConfig={initialConfig} />
    </main>
  );
}
