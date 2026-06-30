"use client";

import { useCallback, useMemo, useState } from "react";

import { saveIslandAction } from "@/app/actions/savedIslands";
import { GameBoard } from "@/components/game/GameBoard";
import { GameHud } from "@/components/game/GameHud";
import { GenerationDebugPanel } from "@/components/game/GenerationDebugPanel";
import { GenerationLoading } from "@/components/game/GenerationLoading";
import { GeneratorPanel } from "@/components/game/GeneratorPanel";
import { SavedIslandsDialog } from "@/components/game/SavedIslandsDialog";
import { useBridgeGame } from "@/hooks/useBridgeGame";
import type { GenerationDebugReport } from "@/lib/game/generationDebug";
import {
  mapLabel,
  saveGenerationConfig,
  type GenerationConfig,
} from "@/lib/game/generationConfig";
import { totalBridgeCost } from "@/lib/game/simulation";
import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import type { Puzzle } from "@/lib/game/types";

type BridgeGameProps = {
  seed?: string;
  initialConfig?: GenerationConfig;
  initialPuzzle?: Puzzle;
  initialDebug?: GenerationDebugReport | null;
};

export function BridgeGame({
  seed,
  initialConfig,
  initialPuzzle,
  initialDebug,
}: BridgeGameProps) {
  const game = useBridgeGame({
    initialSeed: seed,
    initialConfig,
    initialPuzzle,
    initialDebug,
  });
  const { state, pathKeys, runPath, optimalPath, hasSubmitted, showOptimalPath, config, isGenerating, genError, lastDebug, genStartedAt } =
    game;
  const { newPuzzle, applyConfig, resetConfigToDefaults, toggleOptimalPath, loadSavedPuzzle, loadLargeMap, loadStandardMap, isLargeMap } =
    game;
  const [savedIslandsOpen, setSavedIslandsOpen] = useState(false);
  const [isSavingIsland, setIsSavingIsland] = useState(false);
  const [saveIslandMessage, setSaveIslandMessage] = useState<string | null>(null);

  const bridgeCost = useMemo(
    () => totalBridgeCost(state.puzzle, state.bridges),
    [state.puzzle, state.bridges],
  );

  const isInitialLoad = isGenerating && state.puzzle.cells.length === 0;

  const handleNewPuzzle = useCallback(() => {
    const rng = mulberry32(hashStringToSeed(`${Date.now()}`));
    const randomSuffix = Math.floor(rng() * 1_000_000);
    newPuzzle(`random-${randomSuffix}`);
  }, [newPuzzle]);

  const handleApplyConfig = useCallback(
    (nextConfig: GenerationConfig) => {
      saveGenerationConfig(nextConfig);
      applyConfig(nextConfig);
    },
    [applyConfig],
  );

  const handleSaveIsland = useCallback(async () => {
    setIsSavingIsland(true);
    setSaveIslandMessage(null);

    try {
      const result = await saveIslandAction(state.puzzle, game.seed);
      if (!result.ok) {
        setSaveIslandMessage(result.error);
        return;
      }

      setSaveIslandMessage(
        result.alreadySaved
          ? `Already saved as “${result.record.name}”.`
          : `Saved as “${result.record.name}”.`,
      );
    } finally {
      setIsSavingIsland(false);
    }
  }, [game.seed, state.puzzle]);

  const handleLoadSavedIsland = useCallback(
    (puzzle: Puzzle) => {
      setSaveIslandMessage(null);
      loadSavedPuzzle(puzzle);
    },
    [loadSavedPuzzle],
  );

  if (isInitialLoad) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col items-center px-3 py-10 sm:px-4">
        <GenerationLoading
          error={genError}
          fullScreen
          startedAt={genStartedAt}
          isLargeMap={isLargeMap}
        />
        <GenerationDebugPanel
          debug={lastDebug}
          isGenerating={isGenerating}
          error={genError}
          genStartedAt={genStartedAt}
        />
      </main>
    );
  }

  return (
    <div className={`relative mx-auto flex w-full flex-col items-center gap-6 px-3 py-6 sm:px-4 ${isLargeMap ? "max-w-6xl lg:flex-row lg:items-start lg:justify-center" : "max-w-lg lg:max-w-2xl"}`}>
      {isGenerating ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#041018]/70 backdrop-blur-[1px]">
          <GenerationLoading error={genError} startedAt={genStartedAt} isLargeMap={isLargeMap} />
        </div>
      ) : null}

      <GameHud
        puzzle={state.puzzle}
        seed={game.seed}
        bridgeCost={bridgeCost}
        bridgeCount={state.bridges.size}
        phase={state.phase}
        result={state.result}
        showComponents={state.showComponents}
        gridLabel={mapLabel(config)}
        disabled={isGenerating}
        onRun={game.runSimulation}
        onReset={game.resetBridges}
        onToggleComponents={game.toggleComponents}
        onNewPuzzle={handleNewPuzzle}
        onLoadLargeMap={loadLargeMap}
        onLoadStandardMap={loadStandardMap}
        isLargeMap={isLargeMap}
        hasSubmitted={hasSubmitted}
        showOptimalPath={showOptimalPath}
        onToggleOptimalPath={toggleOptimalPath}
        onSaveIsland={() => void handleSaveIsland()}
        onOpenSavedIslands={() => setSavedIslandsOpen(true)}
        isSavingIsland={isSavingIsland}
        saveIslandMessage={saveIslandMessage}
      />

      <GameBoard
        puzzle={state.puzzle}
        bridges={state.bridges}
        pathKeys={pathKeys}
        runPath={runPath}
        optimalPath={optimalPath}
        showOptimalPath={showOptimalPath}
        showComponents={state.showComponents}
        onBeginBridgeStroke={game.beginBridgeStroke}
        onContinueBridgeStroke={game.continueBridgeStroke}
        onEndBridgeStroke={game.endBridgeStroke}
      />

      <GeneratorPanel
        config={config}
        onApply={handleApplyConfig}
        onResetDefaults={resetConfigToDefaults}
      />

      <GenerationDebugPanel
        debug={lastDebug}
        isGenerating={isGenerating}
        error={genError}
        genStartedAt={genStartedAt}
      />

      <SavedIslandsDialog
        open={savedIslandsOpen}
        onClose={() => setSavedIslandsOpen(false)}
        onLoadIsland={handleLoadSavedIsland}
      />
    </div>
  );
}
