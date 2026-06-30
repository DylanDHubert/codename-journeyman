"use client";

import { useEffect, useState } from "react";

import { GENERATION_LOADING_STEPS } from "@/lib/game/generationSteps";

type GenerationLoadingProps = {
  error?: string | null;
  fullScreen?: boolean;
  startedAt?: number | null;
  isLargeMap?: boolean;
};

function formatElapsed(ms: number): string {
  if (ms >= 60_000) {
    return `${(ms / 60_000).toFixed(1)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${Math.round(ms)}ms`;
}

export function GenerationLoading({
  error,
  fullScreen = false,
  startedAt = null,
  isLargeMap = false,
}: GenerationLoadingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (error || startedAt === null) {
      return;
    }

    const tick = () => {
      setElapsedMs(Math.max(0, performance.now() - startedAt));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [error, startedAt]);

  useEffect(() => {
    if (error) {
      return;
    }

    const interval = setInterval(() => {
      setStepIndex((current) => (current + 1) % GENERATION_LOADING_STEPS.length);
    }, 900);

    return () => clearInterval(interval);
  }, [error]);

  const wrapperClass = fullScreen
    ? "flex min-h-[70vh] w-full flex-col items-center justify-center gap-6 px-4"
    : "flex w-full flex-col items-center gap-4 rounded-xl border border-white/10 bg-black/30 px-6 py-8";

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-sky-300/25 border-t-sky-300"
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-200/70">
            Bridge the Isles
          </p>
          <p className="mt-2 text-lg text-white">
            {error ?? GENERATION_LOADING_STEPS[stepIndex]}
          </p>
          {!error && startedAt !== null ? (
            <p className="mt-1 font-mono text-xs text-sky-100/45">
              waiting {formatElapsed(elapsedMs)}
              {isLargeMap
                ? " — large maps can take several minutes; still sculpting small islands"
                : " — check server terminal for "}
              {!isLargeMap ? (
                <code className="text-sky-100/60">[bridge-isles:gen]</code>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {!error ? (
        <ol className="flex w-full max-w-xs flex-col gap-1.5 text-left text-xs text-sky-100/55">
          {GENERATION_LOADING_STEPS.map((step, index) => (
            <li
              key={step}
              className={
                index === stepIndex
                  ? "font-medium text-sky-100"
                  : index < stepIndex
                    ? "text-sky-100/35"
                    : ""
              }
            >
              {index <= stepIndex ? "▸" : "○"} {step}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
