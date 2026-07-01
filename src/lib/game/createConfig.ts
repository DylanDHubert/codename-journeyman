import {
  DEFAULT_GENERATION_CONFIG,
  type GridConfig,
  type NoiseConfig,
} from "./generationConfig";

export type CreateGenerationConfig = {
  grid: GridConfig;
  noise: NoiseConfig;
};

export const CREATE_GRID_LIMITS = {
  rows: { min: 4, max: 64 },
  cols: { min: 4, max: 64 },
} as const;

export const DEFAULT_CREATE_CONFIG: CreateGenerationConfig = {
  grid: { ...DEFAULT_GENERATION_CONFIG.grid },
  noise: { ...DEFAULT_GENERATION_CONFIG.noise },
};

const CREATE_STORAGE_KEY = "bridge-isles-create-config";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampCreateGrid(rows: number, cols: number): GridConfig {
  return {
    rows: clamp(rows, CREATE_GRID_LIMITS.rows.min, CREATE_GRID_LIMITS.rows.max),
    cols: clamp(cols, CREATE_GRID_LIMITS.cols.min, CREATE_GRID_LIMITS.cols.max),
  };
}

export type CreateConfigInput = {
  grid?: Partial<GridConfig>;
  noise?: Partial<NoiseConfig>;
};

export function normalizeCreateConfig(
  partial: CreateConfigInput = {},
): CreateGenerationConfig {
  const base = DEFAULT_CREATE_CONFIG;

  return {
    grid: clampCreateGrid(
      partial.grid?.rows ?? base.grid.rows,
      partial.grid?.cols ?? base.grid.cols,
    ),
    noise: {
      landThreshold: partial.noise?.landThreshold ?? base.noise.landThreshold,
      falloffStrength: partial.noise?.falloffStrength ?? base.noise.falloffStrength,
      falloffRadius: partial.noise?.falloffRadius ?? base.noise.falloffRadius,
      octave1Scale: partial.noise?.octave1Scale ?? base.noise.octave1Scale,
      octave2Scale: partial.noise?.octave2Scale ?? base.noise.octave2Scale,
      octave2Weight: partial.noise?.octave2Weight ?? base.noise.octave2Weight,
      octave3Scale: partial.noise?.octave3Scale ?? base.noise.octave3Scale,
      octave3Weight: partial.noise?.octave3Weight ?? base.noise.octave3Weight,
    },
  };
}

export function loadCreateConfig(): CreateGenerationConfig {
  if (typeof window === "undefined") {
    return DEFAULT_CREATE_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(CREATE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CREATE_CONFIG;
    }

    return normalizeCreateConfig(JSON.parse(raw) as CreateConfigInput);
  } catch {
    return DEFAULT_CREATE_CONFIG;
  }
}

export function saveCreateConfig(config: CreateGenerationConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CREATE_STORAGE_KEY, JSON.stringify(config));
}

export function createConfigKey(config: CreateGenerationConfig): string {
  return JSON.stringify(normalizeCreateConfig(config));
}

export function createConfigFromSearchParams(
  params: Record<string, string | undefined>,
): CreateGenerationConfig | null {
  const hasGrid = params.rows !== undefined || params.cols !== undefined;
  const hasNoise =
    params.threshold !== undefined ||
    params.falloff !== undefined ||
    params.falloffRadius !== undefined ||
    params.octave1 !== undefined ||
    params.octave2Weight !== undefined ||
    params.octave3Weight !== undefined;

  if (!hasGrid && !hasNoise) {
    return null;
  }

  const parsed: CreateConfigInput = {};

  if (params.rows) {
    parsed.grid = { ...parsed.grid, rows: Number(params.rows) };
  }
  if (params.cols) {
    parsed.grid = { ...parsed.grid, cols: Number(params.cols) };
  }
  if (params.threshold) {
    parsed.noise = {
      ...parsed.noise,
      landThreshold: Number(params.threshold),
    };
  }
  if (params.falloff) {
    parsed.noise = {
      ...parsed.noise,
      falloffStrength: Number(params.falloff),
    };
  }
  if (params.falloffRadius) {
    parsed.noise = {
      ...parsed.noise,
      falloffRadius: Number(params.falloffRadius),
    };
  }
  if (params.octave1) {
    parsed.noise = {
      ...parsed.noise,
      octave1Scale: Number(params.octave1),
    };
  }
  if (params.octave2Weight) {
    parsed.noise = {
      ...parsed.noise,
      octave2Weight: Number(params.octave2Weight),
    };
  }
  if (params.octave3Weight) {
    parsed.noise = {
      ...parsed.noise,
      octave3Weight: Number(params.octave3Weight),
    };
  }

  return normalizeCreateConfig(parsed);
}

export function createViewSearchParams(
  seed: string,
  config: CreateGenerationConfig,
): URLSearchParams {
  const normalized = normalizeCreateConfig(config);
  const params = new URLSearchParams();

  params.set("seed", seed);
  params.set("rows", String(normalized.grid.rows));
  params.set("cols", String(normalized.grid.cols));
  params.set("threshold", String(normalized.noise.landThreshold));
  params.set("falloff", String(normalized.noise.falloffStrength));
  params.set("falloffRadius", String(normalized.noise.falloffRadius));
  params.set("octave1", String(normalized.noise.octave1Scale));
  params.set("octave2Weight", String(normalized.noise.octave2Weight));
  params.set("octave3Weight", String(normalized.noise.octave3Weight));

  return params;
}
