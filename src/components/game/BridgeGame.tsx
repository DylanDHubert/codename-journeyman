"use client";

import { useCallback, useMemo } from "react";

import { GameBoard } from "@/components/game/GameBoard";
import { GameHud } from "@/components/game/GameHud";
import { GenerationDebugPanel } from "@/components/game/GenerationDebugPanel";
import { GenerationLoading } from "@/components/game/GenerationLoading";
import { GeneratorPanel } from "@/components/game/GeneratorPanel";
import { useBridgeGame } from "@/hooks/useBridgeGame";
import type { GenerationDebugReport } from "@/lib/game/generationDebug";
import {
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
  const { newPuzzle, applyConfig, resetConfigToDefaults, toggleOptimalPath } = game;

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

  if (isInitialLoad) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col items-center px-3 py-10 sm:px-4">
        <GenerationLoading
          error={genError}
          fullScreen
          startedAt={genStartedAt}
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
    <div className="relative mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-3 py-6 sm:px-4 lg:max-w-2xl">
      {isGenerating ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#041018]/70 backdrop-blur-[1px]">
          <GenerationLoading error={genError} startedAt={genStartedAt} />
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
        gridLabel={`${config.grid.rows}×${config.grid.cols}`}
        disabled={isGenerating}
        onRun={game.runSimulation}
        onReset={game.resetBridges}
        onToggleComponents={game.toggleComponents}
        onNewPuzzle={handleNewPuzzle}
        hasSubmitted={hasSubmitted}
        showOptimalPath={showOptimalPath}
        onToggleOptimalPath={toggleOptimalPath}
      />

      <GameBoard
        puzzle={state.puzzle}
        bridges={state.bridges}
        pathKeys={pathKeys}
        runPath={runPath}
        optimalPath={optimalPath}
        showOptimalPath={showOptimalPath}
        showComponents={state.showComponents}
        onToggleBridge={game.toggleBridge}
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
    </div>
  );
}
