"use client";

import { Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  configKey,
  DEFAULT_GENERATION_CONFIG,
  GRID_LIMITS,
  normalizeConfig,
  type GenerationConfig,
} from "@/lib/game/generationConfig";

type GeneratorModalProps = {
  open: boolean;
  onClose: () => void;
  config: GenerationConfig;
  onApply: (config: GenerationConfig) => void;
  onResetDefaults: () => void;
};

type SliderProps = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: SliderProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2 text-xs text-sky-100/80">
        <span>{label}</span>
        <span className="font-mono text-sky-50">
          {value.toFixed(3).replace(/\.?0+$/, "")}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer accent-sky-400"
      />
      {hint ? <span className="text-[10px] text-sky-100/45">{hint}</span> : null}
    </label>
  );
}

export function GeneratorSettingsButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Generator settings"
      title="Generator settings"
      className="rounded-lg border border-white/15 p-2 text-sky-100/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Settings className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

export function GeneratorModal({
  open,
  onClose,
  config,
  onApply,
  onResetDefaults,
}: GeneratorModalProps) {
  const [draft, setDraft] = useState<GenerationConfig>(config);
  const appliedConfigKey = configKey(config);

  useEffect(() => {
    setDraft(
      normalizeConfig(JSON.parse(appliedConfigKey) as GenerationConfig),
    );
  }, [appliedConfigKey]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const updateDraft = useCallback((patch: Partial<GenerationConfig>) => {
    setDraft((current) => normalizeConfig({ ...current, ...patch }));
  }, []);

  const updateGrid = useCallback((patch: Partial<GenerationConfig["grid"]>) => {
    setDraft((current) =>
      normalizeConfig({
        ...current,
        grid: { ...current.grid, ...patch },
      }),
    );
  }, []);

  const updateNoise = useCallback(
    (patch: Partial<GenerationConfig["noise"]>) => {
      setDraft((current) =>
        normalizeConfig({
          ...current,
          noise: { ...current.noise, ...patch },
        }),
      );
    },
    [],
  );

  const handleApply = useCallback(() => {
    onApply(normalizeConfig(draft));
    onClose();
  }, [draft, onApply, onClose]);

  const copyConfig = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
  }, [draft]);

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
        aria-labelledby="generator-modal-title"
        aria-modal="true"
        className="flex max-h-[min(40rem,90vh)] w-full max-w-lg flex-col rounded-xl border border-white/10 bg-[#0a1a24] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2
              id="generator-modal-title"
              className="text-lg font-semibold text-white"
            >
              Archipelago generator
            </h2>
            <p className="mt-1 text-xs text-sky-100/60">
              {config.grid.rows}×{config.grid.cols} playable · adjust terrain
              noise and grid, then regenerate
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-sky-100/80">
              Rows (height)
              <input
                type="number"
                min={GRID_LIMITS.rows.min}
                max={GRID_LIMITS.rows.max}
                value={draft.grid.rows}
                onChange={(event) =>
                  updateGrid({ rows: Number(event.target.value) })
                }
                className="rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-sky-100/80">
              Cols (width)
              <input
                type="number"
                min={GRID_LIMITS.cols.min}
                max={GRID_LIMITS.cols.max}
                value={draft.grid.cols}
                onChange={(event) =>
                  updateGrid({ cols: Number(event.target.value) })
                }
                className="rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
              />
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-sky-200/50">
              Noise
            </p>
            <SliderField
              label="Land threshold"
              hint="Higher → less land, more open water"
              value={draft.noise.landThreshold}
              min={-0.2}
              max={0.35}
              step={0.01}
              onChange={(value) => updateNoise({ landThreshold: value })}
            />
            <SliderField
              label="Edge falloff"
              hint="Stronger → island cluster shrinks toward center"
              value={draft.noise.falloffStrength}
              min={0}
              max={0.8}
              step={0.01}
              onChange={(value) => updateNoise({ falloffStrength: value })}
            />
            <SliderField
              label="Falloff radius"
              hint="Lower → tighter archipelago bowl"
              value={draft.noise.falloffRadius}
              min={0.4}
              max={1}
              step={0.01}
              onChange={(value) => updateNoise({ falloffRadius: value })}
            />
            <SliderField
              label="Octave 1 scale"
              hint="Coastline blob size"
              value={draft.noise.octave1Scale}
              min={0.03}
              max={0.2}
              step={0.005}
              onChange={(value) => updateNoise({ octave1Scale: value })}
            />
            <SliderField
              label="Octave 2 weight"
              hint="Mid-size detail"
              value={draft.noise.octave2Weight}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => updateNoise({ octave2Weight: value })}
            />
            <SliderField
              label="Octave 3 weight"
              hint="Fine ripples / inlets"
              value={draft.noise.octave3Weight}
              min={0}
              max={0.6}
              step={0.05}
              onChange={(value) => updateNoise({ octave3Weight: value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-sky-100/80">
              Min par
              <input
                type="number"
                min={1}
                max={12}
                value={draft.minPar}
                onChange={(event) =>
                  updateDraft({ minPar: Number(event.target.value) })
                }
                className="rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-sky-100/80">
              Max par
              <input
                type="number"
                min={1}
                max={30}
                value={draft.maxPar}
                onChange={(event) =>
                  updateDraft({ maxPar: Number(event.target.value) })
                }
                className="rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
              />
            </label>
          </div>

          <p className="text-[10px] leading-relaxed text-sky-100/40">
            Default is {DEFAULT_GENERATION_CONFIG.grid.rows}×
            {DEFAULT_GENERATION_CONFIG.grid.cols}. Par is solved on demand via
            Find par. Settings persist in localStorage.
          </p>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-semibold text-sky-950 transition hover:bg-sky-300"
          >
            Apply &amp; regenerate
          </button>
          <button
            type="button"
            onClick={() => {
              onResetDefaults();
              onClose();
            }}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
          >
            Reset defaults
          </button>
          <button
            type="button"
            onClick={copyConfig}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
          >
            Copy JSON
          </button>
        </footer>
      </div>
    </div>
  );
}
