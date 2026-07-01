import { GenerationLoading } from "@/components/game/GenerationLoading";

export default function PlayLoading() {
  return (
    <main className="min-h-full flex-1 bg-ocean-gradient pb-16">
      <GenerationLoading fullScreen />
    </main>
  );
}
