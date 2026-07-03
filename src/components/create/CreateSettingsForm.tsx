"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CREATE_FIXED_GRID,
  createConfigKey,
  createViewSearchParams,
  DEFAULT_CREATE_CONFIG,
  loadCreateConfig,
  normalizeCreateConfig,
  saveCreateConfig,
  type CreateGenerationConfig,
} from "@/lib/game/createConfig";
import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";

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

function randomCreateSeed(): string {
  const rng = mulberry32(hashStringToSeed(`${Date.now()}`));
  return `create-${Math.floor(rng() * 1_000_000_000)}`;
}

export function CreateSettingsForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<CreateGenerationConfig>(DEFAULT_CREATE_CONFIG);
  const [seed, setSeed] = useState("");

  useEffect(() => {
    setDraft(loadCreateConfig());
    setSeed(randomCreateSeed());
  }, []);

  const updateNoise = useCallback(
    (patch: Partial<CreateGenerationConfig["noise"]>) => {
      setDraft((current) =>
        normalizeCreateConfig({
          ...current,
          noise: { ...current.noise, ...patch },
        }),
      );
    },
    [],
  );

  const handleGenerate = useCallback(() => {
    const normalized = normalizeCreateConfig(draft);
    saveCreateConfig(normalized);
    const nextSeed = seed.trim() || randomCreateSeed();
    const params = createViewSearchParams(nextSeed, normalized);
    router.push(`/create/view?${params.toString()}`);
  }, [draft, router, seed]);

  const handleRerollSeed = useCallback(() => {
    setSeed(randomCreateSeed());
  }, []);

  const handleReset = useCallback(() => {
    setDraft(DEFAULT_CREATE_CONFIG);
    setSeed(randomCreateSeed());
  }, []);

  const appliedKey = createConfigKey(draft);

  return (
    <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-white/12 bg-[rgb(4_24_40_/_0.55)] p-6 shadow-[0_12px_40px_rgb(2_12_22_/_0.35)] backdrop-blur-sm">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200/55">
          Workshop
        </p>
        <h2 className="text-xl font-semibold text-white">Archipelago settings</h2>
        <p className="text-sm text-sky-100/65">
          One random pass — no par search, no solve step. Tune noise, then open the
          draft map.
        </p>
      </div>

      <p className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-sky-100/70">
        Fixed grid{" "}
        <span className="font-mono text-sky-50">
          {CREATE_FIXED_GRID.cols}×{CREATE_FIXED_GRID.rows}
        </span>{" "}
        (cols × rows)
      </p>

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

      <label className="flex flex-col gap-1 text-xs text-sky-100/80">
        Seed
        <div className="flex gap-2">
          <input
            type="text"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
          />
          <button
            type="button"
            onClick={handleRerollSeed}
            className="shrink-0 rounded-md border border-white/15 px-3 py-1 text-xs text-white transition hover:bg-white/10"
          >
            Reroll
          </button>
        </div>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-300"
        >
          Generate archipelago
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Reset defaults
        </button>
      </div>

      <p className="text-[10px] leading-relaxed text-sky-100/40">
        Grid {CREATE_FIXED_GRID.cols}×{CREATE_FIXED_GRID.rows} · config key{" "}
        <span className="font-mono text-sky-100/55">{appliedKey.slice(0, 42)}…</span>
      </p>
    </div>
  );
}
