import Link from "next/link";

/** PLAY MODE STUB — OLIVER: LOAD LevelFile, REUSE GameBoard + simulateLevel */
export default function PlayPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ocean-gradient px-6 text-center">
      <h1 className="text-xl font-semibold text-white">Play</h1>
      <p className="max-w-md text-sm text-sky-100/70">
        Play mode will load saved levels from{" "}
        <code className="text-sky-200">public/levels/</code> and reuse the same{" "}
        <code className="text-sky-200">GameBoard</code> as the editor. See{" "}
        <code className="text-sky-200">src/lib/game/simulateLevel.ts</code>.
      </p>
      <Link
        href="/create"
        className="rounded-md border border-sky-300/50 px-4 py-2 text-sm text-sky-100 hover:border-sky-200"
      >
        ← Create levels
      </Link>
    </main>
  );
}
