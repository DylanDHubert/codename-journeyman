"use client";

import { useCallback, useEffect, useState } from "react";

import {
  deleteSavedIslandAction,
  listSavedIslandsAction,
  loadSavedIslandAction,
} from "@/app/actions/savedIslands";
import type { SavedIslandSummary } from "@/lib/game/savedIslands/types";
import type { Puzzle } from "@/lib/game/types";

type SavedIslandsDialogProps = {
  open: boolean;
  onClose: () => void;
  onLoadIsland: (puzzle: Puzzle) => void;
};

export function SavedIslandsDialog({
  open,
  onClose,
  onLoadIsland,
}: SavedIslandsDialogProps) {
  const [islands, setIslands] = useState<SavedIslandSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await listSavedIslandsAction();
      setIslands(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load saved islands",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void refresh();
  }, [open, refresh]);

  const handleLoad = useCallback(
    async (id: string) => {
      setLoadingId(id);
      setError(null);

      try {
        const result = await loadSavedIslandAction(id);
        if (!result.ok) {
          setError(result.error);
          return;
        }

        onLoadIsland(result.puzzle);
        onClose();
      } finally {
        setLoadingId(null);
      }
    },
    [onClose, onLoadIsland],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);

      try {
        const result = await deleteSavedIslandAction(id);
        if (!result.ok) {
          setError(result.error ?? "Could not delete island");
          return;
        }

        setIslands((current) => current.filter((island) => island.id !== id));
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#041018]/80 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="saved-islands-title"
        aria-modal="true"
        className="flex max-h-[min(32rem,85vh)] w-full max-w-md flex-col rounded-xl border border-white/10 bg-[#0a1a24] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2
              id="saved-islands-title"
              className="text-lg font-semibold text-white"
            >
              Saved islands
            </h2>
            <p className="mt-1 text-xs text-sky-100/60">
              Each island keeps the same map, X → Y → Z route, and tile layout
              every time you open it — always without bridges.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-sm text-sky-100/80 transition hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-sky-100/70">Loading saved islands…</p>
          ) : null}

          {error ? (
            <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {!loading && islands.length === 0 ? (
            <p className="text-sm text-sky-100/60">
              No saved islands yet. Play an archipelago and tap{" "}
              <span className="font-medium text-sky-100">Save island</span> to
              keep it.
            </p>
          ) : null}

          <ul className="space-y-2">
            {islands.map((island) => {
              const isLoading = loadingId === island.id;
              const isDeleting = deletingId === island.id;

              return (
                <li
                  key={island.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {island.name}
                      </p>
                      <p className="mt-0.5 text-xs text-sky-100/55">
                        {island.rows}×{island.cols} · par {island.parCost} ·{" "}
                        {new Date(island.savedAt).toLocaleDateString()}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-sky-100/40">
                        {island.id}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleLoad(island.id)}
                        disabled={isLoading || isDeleting}
                        className="rounded-md bg-sky-400 px-3 py-1.5 text-xs font-semibold text-sky-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isLoading ? "Loading…" : "Play"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(island.id)}
                        disabled={isLoading || isDeleting}
                        className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-sky-100/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
