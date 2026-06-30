"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generatePuzzleAction } from "@/app/actions/generatePuzzle";
import { cellKey } from "@/lib/game/coords";
import type { GenerationDebugReport } from "@/lib/game/generationDebug";
import {
  configEquals,
  configKey,
  DEFAULT_GENERATION_CONFIG,
  isLargeMapConfig,
  LARGE_GENERATION_CONFIG,
  loadGenerationConfig,
  normalizeConfig,
  saveGenerationConfig,
  type GenerationConfig,
} from "@/lib/game/generationConfig";
import { dailySeed } from "@/lib/game/seed";
import {
  cellsOnLineSegment,
  type StrokeMode,
} from "@/lib/game/bridgeStroke";
import { canPlaceBridge, computeMinimumSolution, courierPath, simulate } from "@/lib/game/simulation";
import type { CellCoord } from "@/lib/game/types";
import { buildParContext } from "@/lib/game/parPrecompute";
import { pathKeySet } from "@/lib/game/terrain";
import type { GamePhase, GameState, Puzzle } from "@/lib/game/types";

function emptyGameState(puzzle: Puzzle): GameState {
  return {
    puzzle,
    bridges: new Set(),
    phase: "editing",
    result: null,
    showComponents: false,
  };
}

function resolveInitialConfig(initialConfig?: GenerationConfig): GenerationConfig {
  return normalizeConfig(initialConfig ?? DEFAULT_GENERATION_CONFIG);
}

type UseBridgeGameOptions = {
  initialSeed?: string;
  initialConfig?: GenerationConfig;
  initialPuzzle?: Puzzle;
  initialDebug?: GenerationDebugReport | null;
};

export function useBridgeGame(options: UseBridgeGameOptions = {}) {
  const defaultSeedRef = useRef(options.initialSeed ?? dailySeed());
  const bootSeed = options.initialSeed ?? defaultSeedRef.current;
  const bootConfig = useMemo(
    () => resolveInitialConfig(options.initialConfig),
    [options.initialConfig ? configKey(options.initialConfig) : "default"],
  );
  const seedRef = useRef(bootSeed);
  const requestIdRef = useRef(0);
  const bootLoadStartedRef = useRef(false);

  const [seed, setSeed] = useState(bootSeed);
  const [config, setConfig] = useState<GenerationConfig>(bootConfig);
  const [state, setState] = useState<GameState>(() =>
    options.initialPuzzle
      ? emptyGameState(options.initialPuzzle)
      : emptyGameState({
          seed: "loading",
          rows: bootConfig.grid.rows,
          cols: bootConfig.grid.cols,
          cells: [],
          start: { row: 0, col: 0 },
          waypoint: { row: 0, col: 0 },
          goal: { row: 0, col: 0 },
          parCost: 0,
        }),
  );
  const [isGenerating, setIsGenerating] = useState(!options.initialPuzzle);
  const [genStartedAt, setGenStartedAt] = useState<number | null>(
    options.initialPuzzle ? null : performance.now(),
  );
  const [genError, setGenError] = useState<string | null>(null);
  const [lastDebug, setLastDebug] = useState<GenerationDebugReport | null>(
    options.initialDebug ?? null,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showOptimalPath, setShowOptimalPath] = useState(false);
  const strokeRef = useRef<{
    mode: StrokeMode;
    visited: Set<string>;
  } | null>(null);

  const loadPuzzle = useCallback(
    async (nextSeed: string, nextConfig: GenerationConfig) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const resolved = normalizeConfig(nextConfig);

      if (process.env.NODE_ENV === "development") {
        console.log(
          "[bridge-isles:client] loadPuzzle start",
          { requestId, seed: nextSeed, grid: resolved.grid, mapSize: resolved.mapSize },
        );
      }

      setConfig(resolved);
      setIsGenerating(true);
      setGenStartedAt(performance.now());
      setGenError(null);

      try {
        const result = await generatePuzzleAction(nextSeed, resolved);

        if (requestIdRef.current !== requestId) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[bridge-isles:client] loadPuzzle stale response",
              { requestId, current: requestIdRef.current },
            );
          }
          return;
        }

        seedRef.current = nextSeed;
        setSeed(nextSeed);
        setState(emptyGameState(result.puzzle));
        setLastDebug(result.debug);
        setHasSubmitted(false);
        setShowOptimalPath(false);

        if (process.env.NODE_ENV === "development") {
          console.log(
            "[bridge-isles:client] loadPuzzle done",
            {
              requestId,
              parCost: result.puzzle.parCost,
              totalMs: result.debug.totalMs.toFixed(1),
            },
          );
        }
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to generate puzzle";

        console.error("[bridge-isles:client] loadPuzzle failed", {
          requestId,
          message,
        });

        if (isLargeMapConfig(resolved)) {
          void loadPuzzle(`${nextSeed}-retry-${requestId}`, resolved);
          return;
        }

        setGenError(message);
      } finally {
        if (requestIdRef.current === requestId) {
          setIsGenerating(false);
          setGenStartedAt(null);
        }
      }
    },
    [],
  );

  useEffect(() => {
    seedRef.current = seed;
  }, [seed]);

  useEffect(() => {
    if (options.initialPuzzle || bootLoadStartedRef.current) {
      return;
    }

    bootLoadStartedRef.current = true;

    const stored = loadGenerationConfig();
    const configToUse = configEquals(stored, bootConfig) ? bootConfig : stored;

    void loadPuzzle(bootSeed, configToUse);
  }, [options.initialPuzzle, bootSeed, bootConfig, loadPuzzle]);

  const applyStrokeCells = useCallback(
    (
      puzzle: GameState["puzzle"],
      bridges: Set<string>,
      cells: CellCoord[],
      mode: StrokeMode,
      visited: Set<string>,
    ): Set<string> | null => {
      let changed = false;
      const next = new Set(bridges);

      for (const { row, col } of cells) {
        if (!canPlaceBridge(puzzle, row, col)) {
          continue;
        }

        const key = cellKey(row, col);
        if (visited.has(key)) {
          continue;
        }

        visited.add(key);

        if (mode === "add") {
          if (!next.has(key)) {
            next.add(key);
            changed = true;
          }
        } else if (next.has(key)) {
          next.delete(key);
          changed = true;
        }
      }

      return changed ? next : null;
    },
    [],
  );

  const beginBridgeStroke = useCallback((row: number, col: number) => {
    setState((current) => {
      if (!canPlaceBridge(current.puzzle, row, col)) {
        strokeRef.current = null;
        return current;
      }

      const key = cellKey(row, col);
      const mode: StrokeMode = current.bridges.has(key) ? "remove" : "add";
      const visited = new Set<string>();
      strokeRef.current = { mode, visited };

      const bridges =
        applyStrokeCells(
          current.puzzle,
          current.bridges,
          [{ row, col }],
          mode,
          visited,
        ) ?? current.bridges;

      if (bridges === current.bridges) {
        return current;
      }

      return {
        ...current,
        bridges,
        phase: "editing",
        result: null,
      };
    });
  }, [applyStrokeCells]);

  const continueBridgeStroke = useCallback(
    (from: CellCoord, to: CellCoord) => {
      const stroke = strokeRef.current;
      if (!stroke) {
        return;
      }

      const segment = cellsOnLineSegment(from, to);

      setState((current) => {
        const bridges = applyStrokeCells(
          current.puzzle,
          current.bridges,
          segment,
          stroke.mode,
          stroke.visited,
        );

        if (!bridges) {
          return current;
        }

        return {
          ...current,
          bridges,
          phase: "editing",
          result: null,
        };
      });
    },
    [applyStrokeCells],
  );

  const endBridgeStroke = useCallback(() => {
    strokeRef.current = null;
  }, []);

  const runSimulation = useCallback(() => {
    setHasSubmitted(true);
    setShowOptimalPath(true);
    setState((current) => {
      const result = simulate(current.puzzle, current.bridges);
      const phase: GamePhase = result.connected ? "success" : "disconnected";

      return {
        ...current,
        result,
        phase,
      };
    });
  }, []);

  const toggleOptimalPath = useCallback(() => {
    setShowOptimalPath((value) => !value);
  }, []);

  const resetBridges = useCallback(() => {
    setState((current) => ({
      ...current,
      bridges: new Set(),
      phase: "editing",
      result: null,
    }));
  }, []);

  const toggleComponents = useCallback(() => {
    setState((current) => ({
      ...current,
      showComponents: !current.showComponents,
    }));
  }, []);

  const newPuzzle = useCallback(
    (nextSeed?: string) => {
      void loadPuzzle(nextSeed ?? dailySeed(), config);
    },
    [config, loadPuzzle],
  );

  const loadSavedPuzzle = useCallback((puzzle: Puzzle) => {
    requestIdRef.current += 1;
    seedRef.current = puzzle.seed;
    setSeed(puzzle.seed);
    setConfig((current) =>
      normalizeConfig({
        ...current,
        grid: { rows: puzzle.rows, cols: puzzle.cols },
      }),
    );
    setState(emptyGameState(puzzle));
    setIsGenerating(false);
    setGenStartedAt(null);
    setGenError(null);
    setLastDebug(null);
    setHasSubmitted(false);
    setShowOptimalPath(false);
  }, []);

  const applyConfig = useCallback(
    (nextConfig: GenerationConfig, persist = true) => {
      const resolved = normalizeConfig(nextConfig);

      if (persist) {
        saveGenerationConfig(resolved);
      }

      setConfig((current) => {
        if (configEquals(current, resolved)) {
          return current;
        }

        void loadPuzzle(seedRef.current, resolved);
        return resolved;
      });
    },
    [loadPuzzle],
  );

  const resetConfigToDefaults = useCallback(() => {
    applyConfig(DEFAULT_GENERATION_CONFIG);
  }, [applyConfig]);

  const loadLargeMap = useCallback(() => {
    void loadPuzzle(seedRef.current, LARGE_GENERATION_CONFIG);
  }, [loadPuzzle]);

  const loadStandardMap = useCallback(() => {
    void loadPuzzle(seedRef.current, DEFAULT_GENERATION_CONFIG);
  }, [loadPuzzle]);

  const pathKeys = useMemo(() => {
    if (!state.result?.path.length) {
      return new Set<string>();
    }

    return pathKeySet(state.result.path);
  }, [state.result]);

  const runPath = state.result?.path ?? [];

  const optimalPath = useMemo(() => {
    if (!hasSubmitted || state.puzzle.cells.length === 0) {
      return [];
    }

    const context = buildParContext(state.puzzle);
    const solution = computeMinimumSolution(state.puzzle, state.puzzle.parCost + 1, {
      context,
      maxStatesPerLayer: 48,
      maxCandidatesPerState: 16,
    });

    if (!solution) {
      return [];
    }

    return courierPath(state.puzzle, solution.bridges);
  }, [hasSubmitted, state.puzzle]);

  return {
    seed,
    config,
    state,
    pathKeys,
    runPath,
    optimalPath,
    hasSubmitted,
    showOptimalPath,
    isGenerating,
    genStartedAt,
    genError,
    lastDebug,
    beginBridgeStroke,
    continueBridgeStroke,
    endBridgeStroke,
    runSimulation,
    toggleOptimalPath,
    resetBridges,
    toggleComponents,
    newPuzzle,
    loadSavedPuzzle,
    applyConfig,
    resetConfigToDefaults,
    loadLargeMap,
    loadStandardMap,
    isLargeMap: isLargeMapConfig(config),
  };
}

export type BridgeGameController = ReturnType<typeof useBridgeGame>;

export function starsForRun(bridgeCost: number, parCost: number): number {
  if (bridgeCost <= parCost) {
    return 3;
  }
  if (bridgeCost <= parCost + 1) {
    return 2;
  }
  if (bridgeCost <= parCost + 2) {
    return 1;
  }
  return 0;
}

export function puzzleSummary(puzzle: Puzzle): string {
  return `#${puzzle.seed.slice(-6)} · par ${puzzle.parCost}`;
}
